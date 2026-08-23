"""
evaluate.py
Model evaluation utilities: metric computation, cross-validation, and
threshold analysis. No results are hard-coded — every number returned here
is computed from actual model predictions.
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
)

from src.utils import RANDOM_STATE


def compute_metrics(y_true, y_pred, y_proba=None) -> dict:
    """Compute the standard classification metrics used throughout this project."""
    metrics = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0),
    }
    if y_proba is not None:
        metrics["roc_auc"] = roc_auc_score(y_true, y_proba)

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    metrics["specificity"] = tn / (tn + fp) if (tn + fp) > 0 else np.nan
    metrics["npv"] = tn / (tn + fn) if (tn + fn) > 0 else np.nan
    metrics["tn"], metrics["fp"], metrics["fn"], metrics["tp"] = int(tn), int(fp), int(fn), int(tp)
    return metrics


def cross_validate_model(pipeline, X, y, cv_folds: int = 5) -> dict:
    """
    Perform stratified k-fold cross-validation on the training data and
    return mean/std for each scoring metric.
    """
    skf = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=RANDOM_STATE)
    scoring = ["accuracy", "precision", "recall", "f1", "roc_auc"]
    scores = cross_validate(pipeline, X, y, cv=skf, scoring=scoring, n_jobs=-1)

    result = {}
    for metric in scoring:
        key = f"test_{metric}"
        result[f"{metric}_mean"] = float(np.mean(scores[key]))
        result[f"{metric}_std"] = float(np.std(scores[key]))
    return result


def threshold_scan(y_true, y_proba, thresholds=(0.3, 0.4, 0.5, 0.6, 0.7)) -> pd.DataFrame:
    """Evaluate precision/recall/f1 at multiple decision thresholds."""
    rows = []
    for t in thresholds:
        y_pred = (np.asarray(y_proba) >= t).astype(int)
        rows.append({
            "threshold": t,
            "precision": precision_score(y_true, y_pred, zero_division=0),
            "recall": recall_score(y_true, y_pred, zero_division=0),
            "f1": f1_score(y_true, y_pred, zero_division=0),
        })
    return pd.DataFrame(rows)


def full_classification_report(y_true, y_pred) -> str:
    return classification_report(y_true, y_pred, target_names=["No Diabetes", "Diabetes"])
