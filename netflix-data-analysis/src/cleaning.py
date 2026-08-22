"""
cleaning.py

Reproducible cleaning pipeline for the Netflix titles dataset.
"""

import re
import numpy as np
import pandas as pd


def strip_whitespace(df: pd.DataFrame) -> pd.DataFrame:
    """Strip leading/trailing whitespace from all string/object columns."""
    df = df.copy()
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].apply(lambda x: x.strip() if isinstance(x, str) else x)
    return df


def normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Lower-case and snake_case column names (already mostly clean here)."""
    df = df.copy()
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    return df


def parse_date_added(df: pd.DataFrame) -> pd.DataFrame:
    """
    Parse the 'date_added' column into an actual datetime.

    Rows where the date cannot be parsed are kept but the parsed value
    becomes NaT (Not a Time) rather than being silently dropped.
    """
    df = df.copy()
    df["date_added"] = df["date_added"].str.strip()
    df["date_added_parsed"] = pd.to_datetime(
        df["date_added"], format="%B %d, %Y", errors="coerce"
    )
    return df


def extract_duration_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Split the overloaded 'duration' column into two clean numeric features:
    - duration_minutes: for Movies (NaN for TV Shows)
    - number_of_seasons: for TV Shows (NaN for Movies)

    The raw 'duration' column mixes two different units ("90 min" vs.
    "3 Seasons") depending on content type, so it cannot be used as a
    single numeric field without first separating it by content type.
    """
    df = df.copy()

    def parse_minutes(row):
        if row["type"] == "Movie" and isinstance(row["duration"], str):
            match = re.search(r"(\d+)\s*min", row["duration"])
            if match:
                return float(match.group(1))
        return np.nan

    def parse_seasons(row):
        if row["type"] == "TV Show" and isinstance(row["duration"], str):
            match = re.search(r"(\d+)\s*Season", row["duration"])
            if match:
                return float(match.group(1))
        return np.nan

    df["duration_minutes"] = df.apply(parse_minutes, axis=1)
    df["number_of_seasons"] = df.apply(parse_seasons, axis=1)
    return df


def clean_country_field(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize the 'country' text field.

    Multiple countries in one cell (e.g. "United States, India") are left
    intact here as a single string; splitting into a list is handled
    separately by `split_multivalue_column`, since some analyses need the
    combined string and others need the exploded list.
    """
    df = df.copy()
    df["country"] = df["country"].apply(
        lambda x: ", ".join(part.strip() for part in x.split(",")) if isinstance(x, str) else x
    )
    return df


def add_missing_flags(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add explicit boolean flags for key columns with missing data instead of
    silently imputing values. This preserves the information that a value
    was absent, which itself may be analytically meaningful (e.g. content
    without a listed director).
    """
    df = df.copy()
    for col in ["director", "cast", "country", "date_added", "rating"]:
        df[f"{col}_missing"] = df[col].isna()
    return df


def fill_categorical_unknowns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Fill categorical text fields that are missing with an explicit
    'Unknown' / 'Not Specified' label rather than leaving NaN, so that
    groupby operations do not silently drop these rows.

    This is applied only to categorical descriptive fields (director,
    cast, country) - NOT to numerical fields, and NOT to rating or
    date_added, whose missingness is analyzed separately since it is rare
    enough to inspect individually.
    """
    df = df.copy()
    df["director"] = df["director"].fillna("Not Specified")
    df["cast"] = df["cast"].fillna("Not Specified")
    df["country"] = df["country"].fillna("Unknown")
    return df


def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Remove fully duplicated rows and duplicate show_id records."""
    df = df.copy()
    df = df.drop_duplicates()
    df = df.drop_duplicates(subset="show_id", keep="first")
    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Run the full cleaning pipeline on the raw dataset in a fixed order.

    Steps
    -----
    1. Normalize column names
    2. Strip whitespace from text fields
    3. Remove duplicate rows / duplicate show_ids
    4. Parse date_added into a real datetime
    5. Extract duration_minutes and number_of_seasons from 'duration'
    6. Normalize the country field
    7. Add missing-value flags (before imputation, for transparency)
    8. Fill categorical unknowns for director/cast/country

    Returns
    -------
    pd.DataFrame
        The cleaned dataset. The input DataFrame is not modified.
    """
    df = normalize_column_names(df)
    df = strip_whitespace(df)
    df = remove_duplicates(df)
    df = parse_date_added(df)
    df = extract_duration_features(df)
    df = clean_country_field(df)
    df = add_missing_flags(df)
    df = fill_categorical_unknowns(df)
    return df


def split_multivalue_column(df: pd.DataFrame, column: str, sep: str = ",") -> pd.DataFrame:
    """
    Explode a comma-separated multi-value column (e.g. 'country' or
    'listed_in') into one row per value, preserving all other columns.

    This is essential for correct counting: a title listed as
    "United States, India" must count toward BOTH countries, not toward a
    single combined category.

    Parameters
    ----------
    df : pd.DataFrame
    column : str
        Name of the multi-valued column to explode (e.g. 'country', 'listed_in').
    sep : str
        Separator used within the column (default: ',').

    Returns
    -------
    pd.DataFrame
        A new, longer DataFrame with one value of `column` per row, trimmed
        of whitespace. Missing/unknown values are excluded.
    """
    exploded = df.copy()
    exploded = exploded[exploded[column].notna()]
    exploded = exploded[~exploded[column].isin(["Unknown", "Not Specified"])]
    exploded[column] = exploded[column].str.split(sep)
    exploded = exploded.explode(column)
    exploded[column] = exploded[column].str.strip()
    exploded = exploded[exploded[column] != ""]
    return exploded
