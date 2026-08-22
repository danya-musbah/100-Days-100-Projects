"""
data_loader.py

Functions for loading and initially inspecting the Netflix titles dataset.
"""

import os
import pandas as pd

REQUIRED_COLUMNS = [
    "show_id", "type", "title", "director", "cast", "country",
    "date_added", "release_year", "rating", "duration",
    "listed_in", "description",
]


def load_data(path: str) -> pd.DataFrame:
    """
    Load the Netflix titles dataset from a CSV file.

    Parameters
    ----------
    path : str
        Path to the raw CSV file.

    Returns
    -------
    pd.DataFrame
        The raw, unmodified dataset.

    Raises
    ------
    FileNotFoundError
        If the file does not exist at the given path.
    ValueError
        If the file is empty or required columns are missing.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Dataset not found at '{path}'. "
            "Please check the file path and make sure the CSV exists."
        )

    df = pd.read_csv(path)

    if df.empty:
        raise ValueError(f"The dataset at '{path}' is empty.")

    validate_columns(df)

    return df


def validate_columns(df: pd.DataFrame) -> None:
    """
    Verify that all required columns are present in the dataset.

    Raises
    ------
    ValueError
        Listing exactly which required columns are missing.
    """
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(
            "The dataset is missing required columns: "
            f"{missing}. Required columns are: {REQUIRED_COLUMNS}"
        )


def inspect_data(df: pd.DataFrame) -> dict:
    """
    Produce a basic structural overview of the dataset.

    Returns
    -------
    dict
        Dictionary with shape, column names, dtypes, and a sample of rows.
    """
    return {
        "n_rows": df.shape[0],
        "n_columns": df.shape[1],
        "columns": list(df.columns),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "sample": df.head(5),
    }


def get_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute missing value counts and percentages per column.

    Returns
    -------
    pd.DataFrame
        Columns: 'missing_count', 'missing_percent', sorted descending.
    """
    missing_count = df.isna().sum()
    missing_percent = (missing_count / len(df) * 100).round(2)
    result = pd.DataFrame({
        "missing_count": missing_count,
        "missing_percent": missing_percent,
    })
    return result.sort_values("missing_count", ascending=False)


def get_duplicate_summary(df: pd.DataFrame) -> dict:
    """
    Summarize duplicate rows and duplicate show_id values.
    """
    return {
        "duplicate_rows": int(df.duplicated().sum()),
        "duplicate_show_ids": int(df["show_id"].duplicated().sum())
        if "show_id" in df.columns else None,
    }
