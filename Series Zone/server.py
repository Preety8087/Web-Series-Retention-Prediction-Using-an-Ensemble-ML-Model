#!/usr/bin/env python3
"""
Series Zone Web Server
Static server plus near-real-time retention scoring API.
"""

from __future__ import annotations

import http.server
import json
import os
import requests
import socketserver
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

PORT = 3000
HOST = "localhost"
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = Path(DIRECTORY) / "ml_models"
MODEL_PATH = MODEL_DIR / "retention_model.pkl"
REPORT_PATH = MODEL_DIR / "model_report.json"
TMDB_API_KEY = "7a0abbf4cd791d438bf30b02c6eefc74"
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p"

MODEL_BUNDLE: dict[str, object] = {
    "model": None,
    "report": {},
    "feature_columns": [
        "runtime_minutes",
        "user_rating",
        "movie_rating",
        "watch_percentage",
        "session_duration_minutes",
        "day_of_week",
        "is_first_watch",
        "previous_completions",
        "average_completion_rate",
        "engagement_score",
        "genre_encoded",
        "device_encoded",
        "time_encoded",
        "rating_engagement",
        "watch_engagement_interaction",
        "completion_watch_ratio",
        "runtime_squared",
        "engagement_squared",
    ],
}
LATEST_ANALYSIS: dict[str, object] = {
    "status": "idle",
    "updated_at": None,
    "analysis": None,
}
NO_PROXY_SESSION = requests.Session()
NO_PROXY_SESSION.trust_env = False


def safe_print(message=""):
    """Print text safely on Windows consoles with limited encodings."""
    try:
        print(message)
    except UnicodeEncodeError:
        encoding = sys.stdout.encoding or "utf-8"
        sanitized = str(message).encode(encoding, errors="replace").decode(encoding)
        print(sanitized)


def load_model_bundle() -> None:
    """Load the trained model and metadata when available."""
    try:
        import joblib  # type: ignore
    except ImportError:
        safe_print("[WARN] joblib not installed. API will use heuristic scoring.")
        return

    if MODEL_PATH.exists():
        try:
            MODEL_BUNDLE["model"] = joblib.load(MODEL_PATH)
            safe_print(f"[OK] Loaded trained retention model from {MODEL_PATH}")
        except Exception as exc:
            safe_print(f"[WARN] Could not load trained model: {exc}")

    if REPORT_PATH.exists():
        try:
            with open(REPORT_PATH, "r", encoding="utf-8") as file:
                MODEL_BUNDLE["report"] = json.load(file)
            safe_print(f"[OK] Loaded model report from {REPORT_PATH}")
        except Exception as exc:
            safe_print(f"[WARN] Could not load model report: {exc}")


def fetch_remote_bytes(url: str) -> tuple[bytes, dict[str, str], int]:
    """Fetch remote content while ignoring broken proxy env vars."""
    response = NO_PROXY_SESSION.get(
        url,
        headers={
            "User-Agent": "SeriesZone/1.0",
            "Accept": "*/*",
        },
        timeout=20,
    )
    response.raise_for_status()
    headers = dict(response.headers)
    return response.content, headers, response.status_code


def encode_with_mapping(value: str, mapping: dict[str, int], default: int = 0) -> int:
    return mapping.get(str(value or "").strip(), default)


def build_feature_vector(payload: dict[str, object]) -> list[float]:
    """Build a feature vector aligned with the training pipeline."""
    genre_mapping = {
        "Action": 0,
        "Animation": 1,
        "Comedy": 2,
        "Drama": 3,
        "Horror": 4,
        "Romance": 5,
        "Sci-Fi": 6,
        "Thriller": 7,
    }
    device_mapping = {"Desktop": 0, "Mobile": 1, "Tablet": 2}
    time_mapping = {"Morning": 2, "Afternoon": 0, "Evening": 1, "Night": 3}

    runtime = float(payload.get("runtime_minutes") or payload.get("totalDurationMinutes") or 120)
    user_rating = float(payload.get("user_rating") or payload.get("userRating") or 76)
    movie_rating = float(payload.get("movie_rating") or payload.get("movieRating") or 82)
    watch_percentage = float(payload.get("watch_percentage") or payload.get("percentageWatched") or 0)
    session_duration_minutes = float(
        payload.get("session_duration_minutes")
        or payload.get("sessionDurationMinutes")
        or (runtime * max(0.0, min(100.0, watch_percentage)) / 100.0)
    )
    day_of_week = float(payload.get("day_of_week") or payload.get("dayOfWeekIndex") or datetime.now().weekday())
    is_first_watch = float(1 if payload.get("is_first_watch", payload.get("isFirstWatch", False)) else 0)
    previous_completions = float(payload.get("previous_completions") or payload.get("previousCompletions") or 0)
    average_completion_rate = float(payload.get("average_completion_rate") or payload.get("averageCompletionRate") or 50)
    engagement_score = float(payload.get("engagement_score") or payload.get("engagementScore") or max(5, min(100, watch_percentage * 0.9)))

    genre = str(payload.get("genre") or "Action")
    device = str(payload.get("device_type") or payload.get("device") or "Desktop")
    time_of_day = str(payload.get("time_of_day") or payload.get("timeOfDay") or "Evening")

    genre_encoded = float(encode_with_mapping(genre, genre_mapping))
    device_encoded = float(encode_with_mapping(device, device_mapping))
    time_encoded = float(encode_with_mapping(time_of_day, time_mapping))
    rating_engagement = (movie_rating / 10.0) * (engagement_score / 100.0)
    watch_engagement_interaction = (watch_percentage / 100.0) * (engagement_score / 100.0)
    completion_watch_ratio = average_completion_rate / (watch_percentage + 1.0)
    runtime_squared = runtime ** 2
    engagement_squared = (engagement_score / 100.0) ** 2

    return [
        runtime,
        user_rating,
        movie_rating,
        watch_percentage,
        session_duration_minutes,
        day_of_week,
        is_first_watch,
        previous_completions,
        average_completion_rate,
        engagement_score,
        genre_encoded,
        device_encoded,
        time_encoded,
        rating_engagement,
        watch_engagement_interaction,
        completion_watch_ratio,
        runtime_squared,
        engagement_squared,
    ]


def heuristic_analysis(payload: dict[str, object]) -> dict[str, object]:
    """Fallback scoring when the trained model is unavailable."""
    watch_percentage = float(payload.get("watch_percentage") or payload.get("percentageWatched") or 0)
    average_completion_rate = float(payload.get("average_completion_rate") or payload.get("averageCompletionRate") or 50)
    previous_completions = float(payload.get("previous_completions") or payload.get("previousCompletions") or 0)
    engagement_score = float(payload.get("engagement_score") or payload.get("engagementScore") or max(5, watch_percentage * 0.9))
    is_paused = str(payload.get("status") or "").lower() == "paused"
    is_dropped = str(payload.get("status") or "").lower() == "dropped"

    probability = (
        watch_percentage * 0.48
        + average_completion_rate * 0.22
        + min(previous_completions, 10) * 2.0
        + engagement_score * 0.18
        - (15 if is_dropped else 0)
        - (5 if is_paused else 0)
    )
    probability = max(5, min(95, round(probability)))
    predicted_label = "retained" if probability >= 55 else "dropped"
    churn_risk = max(5, min(95, 100 - probability))

    top_factors = sorted(
        [
            {"feature": "watch_percentage", "impact": round(watch_percentage / 100.0, 3)},
            {"feature": "engagement_score", "impact": round(engagement_score / 100.0, 3)},
            {"feature": "average_completion_rate", "impact": round(average_completion_rate / 100.0, 3)},
            {"feature": "previous_completions", "impact": round(min(previous_completions, 10) / 10.0, 3)},
        ],
        key=lambda item: item["impact"],
        reverse=True,
    )[:3]

    return {
        "probability": probability,
        "predicted_label": predicted_label,
        "churn_risk": churn_risk,
        "model_source": "heuristic-fallback",
        "top_factors": top_factors,
    }


def score_payload(payload: dict[str, object]) -> dict[str, object]:
    """Run model-based scoring with heuristic fallback."""
    analysis = heuristic_analysis(payload)

    model = MODEL_BUNDLE.get("model")
    if model is not None:
        try:
            import numpy as np  # type: ignore

            features = np.array([build_feature_vector(payload)], dtype=float)
            probability = float(model.predict_proba(features)[0][1]) * 100.0
            predicted_label = "retained" if probability >= 50 else "dropped"
            analysis.update(
                {
                    "probability": round(probability),
                    "predicted_label": predicted_label,
                    "churn_risk": max(5, min(95, round(100.0 - probability))),
                    "model_source": "trained-ensemble",
                }
            )
        except Exception as exc:
            safe_print(f"[WARN] Model inference failed, using heuristic fallback: {exc}")

    probability = analysis["probability"]
    analysis["predicted_class"] = (
        "High chance of retention"
        if probability >= 65
        else "Moderate retention confidence"
        if probability >= 45
        else "High drop-off risk"
    )
    analysis["recommended_action"] = (
        "Promote sequels, related titles, and autoplay continuation."
        if probability >= 65
        else "Use genre-matched recommendations and reminder nudges."
        if probability >= 45
        else "Push shorter, high-rated titles and stronger opening scenes."
    )
    analysis["updated_at"] = datetime.now().isoformat()
    return analysis


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


class SeriesZoneHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler for Series Zone."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        import time

        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        safe_print(f"[{timestamp}] {format % args}")

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, payload: dict[str, object], status: int = 200) -> None:
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def send_binary(self, payload: bytes, content_type: str, status: int = 200, cache_control: str | None = None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        if cache_control:
            self.send_header("Cache-Control", cache_control)
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        """Handle GET requests with static files and API endpoints."""
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        if parsed.path == "/api/health":
            self.send_json(
                {
                    "status": "ok",
                    "model_loaded": MODEL_BUNDLE.get("model") is not None,
                    "latest_analysis": LATEST_ANALYSIS,
                }
            )
            return

        if parsed.path == "/api/retention/latest":
            self.send_json(LATEST_ANALYSIS)
            return

        if parsed.path == "/api/tmdb":
            remote_path = (query.get("path", [""])[0] or "").strip()
            if not remote_path:
                self.send_json({"error": "Missing TMDB path"}, status=400)
                return

            if not remote_path.startswith("/"):
                remote_path = f"/{remote_path}"

            outbound_query: dict[str, str] = {"api_key": TMDB_API_KEY}
            for key, values in query.items():
                if key == "path" or not values:
                    continue
                outbound_query[key] = values[0]

            remote_url = f"{TMDB_BASE_URL}{remote_path}?{urlencode(outbound_query)}"
            try:
                payload, headers, status = fetch_remote_bytes(remote_url)
                content_type = headers.get("Content-Type", "application/json; charset=utf-8")
                self.send_binary(payload, content_type, status=status, cache_control="public, max-age=300")
            except requests.HTTPError as exc:
                response = exc.response
                error_body = response.content if response is not None else b"{}"
                content_type = response.headers.get("Content-Type", "application/json; charset=utf-8") if response is not None else "application/json; charset=utf-8"
                status = response.status_code if response is not None else 502
                self.send_binary(error_body or b"{}", content_type, status=status)
            except Exception as exc:
                self.send_json({"error": f"TMDB proxy failed: {exc}"}, status=502)
            return

        if parsed.path == "/api/tmdb-image":
            image_path = (query.get("path", [""])[0] or "").strip()
            image_size = (query.get("size", ["w500"])[0] or "w500").strip()
            if not image_path:
                self.send_json({"error": "Missing image path"}, status=400)
                return

            if not image_path.startswith("/"):
                image_path = f"/{image_path}"

            remote_url = f"{TMDB_IMAGE_BASE_URL}/{image_size}{image_path}"
            try:
                payload, headers, status = fetch_remote_bytes(remote_url)
                content_type = headers.get("Content-Type", "image/jpeg")
                self.send_binary(payload, content_type, status=status, cache_control="public, max-age=86400")
            except requests.HTTPError as exc:
                response = exc.response
                error_body = response.content if response is not None else b""
                content_type = response.headers.get("Content-Type", "application/octet-stream") if response is not None else "application/octet-stream"
                status = response.status_code if response is not None else 502
                self.send_binary(error_body, content_type, status=status)
            except Exception as exc:
                self.send_json({"error": f"TMDB image proxy failed: {exc}"}, status=502)
            return

        file_ext = os.path.splitext(parsed.path)[1].lower()
        if file_ext in {".css", ".js", ".json"}:
            self.send_response(200)
            if file_ext == ".css":
                self.send_header("Content-type", "text/css")
            elif file_ext == ".js":
                self.send_header("Content-type", "application/javascript")
            else:
                self.send_header("Content-type", "application/json")
            self.end_headers()

            try:
                file_path = os.path.join(DIRECTORY, parsed.path.lstrip("/"))
                if os.path.exists(file_path) and os.path.isfile(file_path):
                    with open(file_path, "rb") as file:
                        self.wfile.write(file.read())
                else:
                    self.send_error(404, f"File not found: {self.path}")
            except Exception as exc:
                self.send_error(500, f"Server error: {exc}")
            return

        return super().do_GET()

    def do_POST(self):
        """Handle retention scoring requests."""
        parsed = urlparse(self.path)
        if parsed.path != "/api/retention/score":
            self.send_json({"error": "Unsupported API route"}, status=404)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length) if content_length else b"{}"
            payload = json.loads(raw_body.decode("utf-8") or "{}")
            analysis = score_payload(payload)
            LATEST_ANALYSIS.update(
                {
                    "status": "ready",
                    "updated_at": analysis["updated_at"],
                    "analysis": analysis,
                }
            )
            self.send_json({"success": True, "analysis": analysis})
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON payload"}, status=400)
        except Exception as exc:
            self.send_json({"error": f"Scoring failed: {exc}"}, status=500)

    def end_headers(self):
        """Add CORS headers for development."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()


def check_port_available(port):
    """Check if a port is available."""
    import socket

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind((HOST, port))
        return True
    except OSError:
        return False


def find_available_port(start_port=3000, max_port=3010):
    """Find an available port in a small range."""
    for port in range(start_port, max_port + 1):
        if check_port_available(port):
            return port
    return None


def main():
    """Start the local web server."""
    try:
        os.chdir(DIRECTORY)
        load_model_bundle()

        available_port = find_available_port(PORT, PORT + 10)
        if not available_port:
            safe_print(f"[ERROR] No available ports found between {PORT} and {PORT + 10}")
            sys.exit(1)

        if available_port != PORT:
            safe_print(f"[WARN] Port {PORT} is in use, using port {available_port}")

        httpd = ThreadedTCPServer((HOST, available_port), SeriesZoneHTTPRequestHandler)

        safe_print("=" * 60)
        safe_print("SERIES ZONE WEB SERVER")
        safe_print("=" * 60)
        safe_print(f"Server running on: http://{HOST}:{available_port}")
        safe_print(f"Serving directory: {DIRECTORY}")
        safe_print(f"ML API: http://{HOST}:{available_port}/api/retention/score")
        safe_print(f"Model source: {'trained-ensemble' if MODEL_BUNDLE.get('model') is not None else 'heuristic-fallback'}")
        safe_print("=" * 60)
        safe_print("Open your browser and navigate to the URL above")
        safe_print("Press Ctrl+C to stop the server")
        safe_print("=" * 60)

        httpd.serve_forever()

    except KeyboardInterrupt:
        safe_print("\n[STOPPED] Server stopped by user")
        sys.exit(0)
    except Exception as exc:
        safe_print(f"[ERROR] Server error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
