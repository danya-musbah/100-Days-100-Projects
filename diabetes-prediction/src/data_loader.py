"""
data_loader.py
Responsible for loading the raw Pima Indians Diabetes dataset from disk.

This module intentionally does NOT fabricate data. If the dataset is not
present at the expected path, a clear, actionable FileNotFoundError is raised
instructing the user where to obtain the dataset and where to place it.
"""

from __future__ import annotations
from pathlib import Path
import pandas as pd

from src.utils import FEATURE_COLUMNS, TARGET_COLUMN

DEFAULT_RAW_PATH = Path("data/raw/diabetes.csv")

EXPECTED_COLUMNS = FEATURE_COLUMNS + [TARGET_COLUMN]

_MISSING_DATA_MESSAGE = """
Could not find the dataset at: {path}

This project expects the Pima Indians Diabetes Dataset (768 rows, 9 columns:
Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI,
DiabetesPedigreeFunction, Age, Outcome).

To fix this:
  1. Obtain the dataset (e.g. from the UCI Machine Learning Repository or
     Kaggle: "Pima Indians Diabetes Database").
  2. Save it as a CSV file with the columns listed above.
  3. Place the file at: {path}

The pipeline will not proceed with a fabricated or synthetic dataset.
"""


def load_raw_data(path: str | Path = DEFAULT_RAW_PATH) -> pd.DataFrame:
    """
    Load the raw diabetes dataset from a CSV file.

    Parameters
    ----------
    path : str or Path
        Location of the raw CSV file.

    Returns
    -------
    pd.DataFrame
        The raw, unmodified dataset.

    Raises
    ------
    FileNotFoundError
        If the dataset file does not exist at the given path.
    ValueError
        If the file exists but does not contain the expected columns.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(_MISSING_DATA_MESSAGE.format(path=path))

    df = pd.read_csv(path)

    missing_cols = set(EXPECTED_COLUMNS) - set(df.columns)
    if missing_cols:
        raise ValueError(
            f"Dataset at {path} is missing expected columns: {sorted(missing_cols)}. "
            f"Expected columns: {EXPECTED_COLUMNS}"
        )

    return df


def load_processed_data(path: str | Path = Path("data/processed/diabetes_cleaned.csv")) -> pd.DataFrame:
    """Load the cleaned/processed dataset produced by the cleaning pipeline."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(
            f"Processed dataset not found at {path}. Run the cleaning pipeline "
            f"(src/cleaning.py) first to generate it from the raw data."
        )
    return pd.read_csv(path)
