"""
cleaning.py
Data quality checks and a reproducible cleaning pipeline for the raw dataset.
"""

from __future__ import annotations
from pathlib import Path
import pandas as pd
import numpy as np

from src.utils import ZERO_AS_MISSING_COLUMNS


def data_quality_report(df: pd.DataFrame) -> dict:
    """
    Produce a dictionary summarizing data quality issues in the dataframe.
    """
    report = {
        "shape": df.shape,
        "dtypes": df.dtypes.astype(str).to_dict(),
        "n_duplicates": int(df.duplicated().sum()),
        "n_missing_native": df.isna().sum().to_dict(),
        "zero_counts": {
            col: int((df[col] == 0).sum())
            for col in ZERO_AS_MISSING_COLUMNS
            if col in df.columns
        },
    }
    return report


def replace_invalid_zeros_with_nan(df: pd.DataFrame,
                                    columns: list[str] = ZERO_AS_MISSING_COLUMNS) -> pd.DataFrame:
    """
    Return a copy of df where 0 values in the given columns are replaced with NaN,
    since a physiological reading of exactly 0 in these columns is implausible
    and almost certainly represents an un-recorded measurement.
    """
    out = df.copy()
    for col in columns:
        if col in out.columns:
            out.loc[out[col] == 0, col] = np.nan
    return out


def impute_missing_median(df: pd.DataFrame,
                           columns: list[str] = ZERO_AS_MISSING_COLUMNS,
                           reference: pd.DataFrame | None = None) -> pd.DataFrame:
    """
    Impute missing values in `columns` using the median.

    Parameters
    ----------
    df : DataFrame to impute (modified copy is returned).
    columns : columns to impute.
    reference : optional DataFrame to compute the median from (e.g. training
        set only, to avoid leakage). If None, the median is computed from `df`
        itself — only safe when df IS the training set or when leakage is not
        a concern (e.g. full-dataset EDA exploration).
    """
    out = df.copy()
    ref = reference if reference is not None else df
    for col in columns:
        if col in out.columns:
            median_value = ref[col].median()
            out[col] = out[col].fillna(median_value)
    return out


def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Remove exact duplicate rows."""
    return df.drop_duplicates().reset_index(drop=True)


def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full cleaning pipeline used to produce data/processed/diabetes_cleaned.csv.

    NOTE: Imputation here uses the full dataset's median for the purpose of
    producing a single, shareable "cleaned" artifact for EDA and portfolio
    review. The actual modeling pipeline (src/preprocessing.py) re-fits
    imputation/scaling on the TRAINING SPLIT ONLY to avoid data leakage —
    this file is not used directly for model training.
    """
    df = remove_duplicates(df)
    df = replace_invalid_zeros_with_nan(df)
    df = impute_missing_median(df)
    return df


def save_processed_data(df: pd.DataFrame,
                         path: str | Path = Path("data/processed/diabetes_cleaned.csv")) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
