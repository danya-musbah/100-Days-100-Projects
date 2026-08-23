"""
utils.py
Shared constants and small helper functions used across the project.
"""

from __future__ import annotations
import random
import numpy as np

RANDOM_STATE: int = 42

FEATURE_COLUMNS = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DiabetesPedigreeFunction",
    "Age",
]

TARGET_COLUMN = "Outcome"

# Columns where a value of 0 is not physiologically plausible and should be
# treated as a missing measurement rather than a genuine reading.
ZERO_AS_MISSING_COLUMNS = [
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
]


def set_global_seed(seed: int = RANDOM_STATE) -> None:
    """Set the random seed for every library that uses randomness in this project."""
    random.seed(seed)
    np.random.seed(seed)


def format_pct(value: float, decimals: int = 2) -> str:
    """Format a fraction (0-1) as a human readable percentage string."""
    return f"{value * 100:.{decimals}f}%"
