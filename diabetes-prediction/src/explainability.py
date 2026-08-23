"""
explainability.py
Model interpretability helpers: global feature importance and (optionally)
SHAP-based local explanations for individual predictions.

Kept intentionally lightweight — SHAP is used only if it adds clear value
(tree-based models) and is optional (the project works without it).
"""

from __future__ import annotations
import numpy as np
import pandas as pd

from src.utils import FEATURE_COLUMNS


def get_global_feature_importance(pipeline) -> pd.Series:
    """
    Extract global feature importance from a fitted pipeline's classifier step.
    Works for tree-based models (feature_importances_) and linear models (coef_).
    """
    clf = pipeline.named_steps["classifier"]
    if hasattr(clf, "feature_importances_"):
        values = clf.feature_importances_
    elif hasattr(clf, "coef_"):
        values = np.abs(clf.coef_[0])
    else:
        raise AttributeError(
            f"Classifier {type(clf).__name__} does not expose feature_importances_ or coef_."
        )
    return pd.Series(values, index=FEATURE_COLUMNS).sort_values(ascending=False)


def explain_prediction_shap(pipeline, X_background: np.ndarray, X_instance: np.ndarray):
    """
    Produce a SHAP explanation for a single instance, if the `shap` package is
    available and the classifier is tree-based (fast TreeExplainer path).
    Returns None gracefully if SHAP is not installed or not applicable —
    this keeps SHAP strictly optional, as specified.
    """
    try:
        import shap
    except ImportError:
        return None

    clf = pipeline.named_steps["classifier"]
    preprocessing = pipeline.named_steps["preprocessing"]

    X_background_t = preprocessing.transform(X_background)
    X_instance_t = preprocessing.transform(X_instance)

    try:
        explainer = shap.TreeExplainer(clf)
        shap_values = explainer.shap_values(X_instance_t)
    except Exception:
        # Fall back to a generic (slower) explainer for non-tree models
        try:
            explainer = shap.Explainer(clf.predict_proba, X_background_t)
            shap_values = explainer(X_instance_t)
        except Exception:
            return None

    return shap_values
