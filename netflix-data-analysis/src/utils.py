"""
utils.py

Feature engineering and small helper utilities used across the analysis.
"""

import numpy as np
import pandas as pd

RATING_CATEGORY_MAP = {
    "G": "Kids", "TV-G": "Kids", "TV-Y": "Kids", "TV-Y7": "Kids", "TV-Y7-FV": "Kids",
    "PG": "Teens", "TV-PG": "Teens", "PG-13": "Teens", "TV-14": "Teens",
    "R": "Adults", "TV-MA": "Adults", "NC-17": "Adults",
    "NR": "Unrated", "UR": "Unrated",
}


def add_date_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add year_added, month_added, and content_age based on date_added_parsed."""
    df = df.copy()
    df["year_added"] = df["date_added_parsed"].dt.year
    df["month_added"] = df["date_added_parsed"].dt.month
    df["content_age"] = df["year_added"] - df["release_year"]
    return df


def add_primary_country(df: pd.DataFrame) -> pd.DataFrame:
    """Add primary_country: the first country listed for each title."""
    df = df.copy()
    df["primary_country"] = df["country"].apply(
        lambda x: x.split(",")[0].strip() if isinstance(x, str) else "Unknown"
    )
    return df


def add_primary_genre(df: pd.DataFrame) -> pd.DataFrame:
    """Add primary_genre: the first genre listed in 'listed_in'."""
    df = df.copy()
    df["primary_genre"] = df["listed_in"].apply(
        lambda x: x.split(",")[0].strip() if isinstance(x, str) else "Unknown"
    )
    return df


def add_release_decade(df: pd.DataFrame) -> pd.DataFrame:
    """Bucket release_year into decades, e.g. 1990-1999 -> '1990s'."""
    df = df.copy()
    df["release_decade"] = (df["release_year"] // 10 * 10).astype(str) + "s"
    return df


def add_rating_category(df: pd.DataFrame) -> pd.DataFrame:
    """Map detailed rating codes into broad audience categories."""
    df = df.copy()
    df["rating_category"] = df["rating"].map(RATING_CATEGORY_MAP).fillna("Unknown")
    return df


def add_description_text_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add description_length (characters) and description_word_count."""
    df = df.copy()
    df["description_length"] = df["description"].str.len()
    df["description_word_count"] = df["description"].str.split().apply(len)
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Run the full feature engineering pipeline in sequence.
    """
    df = add_date_features(df)
    df = add_primary_country(df)
    df = add_primary_genre(df)
    df = add_release_decade(df)
    df = add_rating_category(df)
    df = add_description_text_features(df)
    return df
