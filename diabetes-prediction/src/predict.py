"""
predict.py
Reusable prediction function built on top of the saved model pipeline.

IMPORTANT: The output of predict_diabetes() is a MODEL-ESTIMATED PROBABILITY,
not a medical diagnosis or medical certainty. See DISCLAIMER below.
"""

from __future__ import annotations
from pathlib import Path
import joblib
import numpy as np

from src.utils import FEATURE_COLUMNS

DISCLAIMER = (
    "This tool produces a machine-learning estimate for educational purposes "
    "only. It is NOT a medical diagnosis and must not be used as a substitute "
    "for professional medical advice, testing, or care."
)

_MODEL_PATH = Path("models/best_model.pkl")
_model_cache = None


def _load_model(model_path: str | Path = _MODEL_PATH):
    global _model_cache
    if _model_cache is None:
        model_path = Path(model_path)
        if not model_path.exists():
            raise FileNotFoundError(
                f"No trained model found at {model_path}. Run `python -m src.train` first."
            )
        _model_cache = joblib.load(model_path)
    return _model_cache


def predict_diabetes(features: dict, model_path: str | Path = _MODEL_PATH, threshold: float = 0.5) -> dict:
    """
    Predict diabetes classification for a single patient record.

    Parameters
    ----------
    features : dict
        Must contain all of: Pregnancies, Glucose, BloodPressure, SkinThickness,
        Insulin, BMI, DiabetesPedigreeFunction, Age.
    model_path : path to the saved pipeline (.pkl).
    threshold : decision threshold applied to the model probability (default 0.5).

    Returns
    -------
    dict with keys:
        prediction : int (0 or 1)
        probability : float — model-estimated probability of the positive class
        label : str — human readable label
        disclaimer : str
    """
    missing = [c for c in FEATURE_COLUMNS if c not in features]
    if missing:
        raise ValueError(f"Missing required feature(s): {missing}")

    model = _load_model(model_path)
    X = np.array([[features[c] for c in FEATURE_COLUMNS]], dtype=float)

    probability = float(model.predict_proba(X)[0, 1])
    prediction = int(probability >= threshold)

    return {
        "prediction": prediction,
        "probability": round(probability, 4),
        "label": "Model predicts the POSITIVE class (higher diabetes risk indicators)"
                 if prediction == 1
                 else "Model predicts the NEGATIVE class (lower diabetes risk indicators)",
        "disclaimer": DISCLAIMER,
    }


if __name__ == "__main__":
    # Example usage
    example_patient = {
        "Pregnancies": 2,
        "Glucose": 150,
        "BloodPressure": 78,
        "SkinThickness": 32,
        "Insulin": 100,
        "BMI": 33.5,
        "DiabetesPedigreeFunction": 0.45,
        "Age": 40,
    }
    result = predict_diabetes(example_patient)
    print(result)
