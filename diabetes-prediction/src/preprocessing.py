"""
preprocessing.py
Leakage-safe preprocessing pipeline: zero->NaN handling, median imputation,
and standard scaling, all fitted ONLY on the training split.
"""

from __future__ import annotations
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler

from src.utils import FEATURE_COLUMNS, ZERO_AS_MISSING_COLUMNS


class ZeroToNaN(BaseEstimator, TransformerMixin):
    """
    Custom transformer: replaces implausible zero values with NaN in the
    specified columns so that a downstream SimpleImputer can treat them as
    missing. Implemented as a proper sklearn transformer so it can live
    inside a Pipeline / ColumnTransformer without leaking test information
    (it has no state to fit — it's a stateless deterministic rule).
    """

    def __init__(self, zero_invalid_columns=None, all_columns=None):
        self.zero_invalid_columns = zero_invalid_columns or []
        self.all_columns = all_columns or []

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X = np.array(X, dtype=float, copy=True)
        for col_name in self.zero_invalid_columns:
            if col_name in self.all_columns:
                idx = self.all_columns.index(col_name)
                mask = X[:, idx] == 0
                X[mask, idx] = np.nan
        return X


def build_preprocessing_pipeline(feature_columns: list[str] = FEATURE_COLUMNS,
                                  zero_invalid_columns: list[str] = ZERO_AS_MISSING_COLUMNS) -> Pipeline:
    """
    Build a preprocessing Pipeline that:
      1. Converts implausible zeros to NaN (Glucose, BloodPressure,
         SkinThickness, Insulin, BMI).
      2. Imputes missing values with the median (fit on training data only).
      3. Scales all features with StandardScaler (fit on training data only).

    Returns a scikit-learn Pipeline object ready to be composed with an
    estimator, e.g.:
        full_pipeline = Pipeline([
            ("preprocessing", build_preprocessing_pipeline()),
            ("classifier", LogisticRegression()),
        ])
    """
    pipeline = Pipeline(steps=[
        ("zero_to_nan", ZeroToNaN(zero_invalid_columns=zero_invalid_columns,
                                   all_columns=feature_columns)),
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    return pipeline
