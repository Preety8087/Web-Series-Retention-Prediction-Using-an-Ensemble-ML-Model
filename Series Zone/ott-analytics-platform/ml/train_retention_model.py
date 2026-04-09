import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


ROOT = Path(__file__).resolve().parent
DATASET = ROOT / "data" / "watch_sessions.csv"
OUTPUTS = ROOT / "outputs"
OUTPUTS.mkdir(exist_ok=True)


def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["userId", "timestamp"])

    grouped = df.groupby("userId")
    df["avg_session_length"] = grouped["watchDuration"].transform("mean")
    df["completion_ratio"] = grouped["completed"].transform("mean")
    df["pause_frequency"] = grouped["pausedCount"].transform("mean")
    df["genre_affinity"] = grouped["percentageWatched"].transform("mean")
    df["inactivity_gap"] = grouped["timestamp"].diff().dt.total_seconds().fillna(0).div(3600)
    df["repeat_views"] = grouped["movieId"].transform(lambda s: s.duplicated().cumsum())
    return df


def main() -> None:
    df = pd.read_csv(DATASET)
    df = feature_engineering(df)

    y = df["completed"].astype(int)
    X = df[[
        "genre", "watchDuration", "percentageWatched", "pausedCount", "device",
        "avg_session_length", "completion_ratio", "pause_frequency",
        "genre_affinity", "inactivity_gap", "repeat_views"
    ]]

    categorical = ["genre", "device"]
    numeric = [col for col in X.columns if col not in categorical]

    preprocessor = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
        ("num", "passthrough", numeric),
    ])

    rf = RandomForestClassifier(n_estimators=120, random_state=42)
    gb = GradientBoostingClassifier(random_state=42)
    ensemble = VotingClassifier(
        estimators=[("rf", rf), ("gb", gb)],
        voting="soft"
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", ensemble),
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    pipeline.fit(X_train, y_train)
    predictions = pipeline.predict(X_test)
    probabilities = pipeline.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, probabilities)), 4),
        "models": {
            "random_forest": "included",
            "gradient_boosting": "included",
            "voting_ensemble": "primary"
        }
    }

    joblib.dump(pipeline, OUTPUTS / "retention_model.pkl")
    (OUTPUTS / "model_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
