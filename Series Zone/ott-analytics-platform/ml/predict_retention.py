import json
import sys
from pathlib import Path

import joblib
import pandas as pd


ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "outputs" / "retention_model.pkl"
METRICS_PATH = ROOT / "outputs" / "model_metrics.json"


def suggest_intervention(probability: float, genre: str) -> str:
    if probability < 0.4:
        return "Recommend shorter content and trigger re-engagement notification"
    if probability < 0.7:
        return f"Push genre-based recommendation in {genre}"
    return "Suggest sequel or autoplay continuation"


def main() -> None:
    payload = json.loads(sys.argv[1])
    model = joblib.load(MODEL_PATH)
    metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))

    frame = pd.DataFrame([payload])
    probability = float(model.predict_proba(frame)[0][1])

    if probability >= 0.75:
        predicted_class = "retained"
    elif probability >= 0.45:
        predicted_class = "at_risk"
    else:
        predicted_class = "likely_to_churn"

    response = {
        "predictedClass": predicted_class,
        "churnProbability": round(1 - probability, 4),
        "intervention": suggest_intervention(probability, payload.get("genre", "preferred genre")),
        "accuracy": metrics["accuracy"],
        "precision": metrics["precision"],
        "recall": metrics["recall"],
        "f1Score": metrics["f1_score"],
        "rocAuc": metrics["roc_auc"]
    }
    print(json.dumps(response))


if __name__ == "__main__":
    main()
