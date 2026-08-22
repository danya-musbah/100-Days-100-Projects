"""
analysis.py

Core analytical functions for the Netflix titles dataset. Each function
returns a plain pandas object (Series/DataFrame/dict) so results can be
reused by both the notebooks and the optional Streamlit dashboard.
"""

import numpy as np
import pandas as pd
from scipy import stats

from .cleaning import split_multivalue_column


def analyze_content_types(df: pd.DataFrame) -> pd.DataFrame:
    """Count and percentage of Movies vs TV Shows."""
    counts = df["type"].value_counts()
    percent = (counts / len(df) * 100).round(2)
    return pd.DataFrame({"count": counts, "percent": percent})


def analyze_growth(df: pd.DataFrame) -> pd.DataFrame:
    """
    Titles added to Netflix per year, split by content type.

    Uses 'year_added' (when Netflix added the title), not release_year.
    Rows with a missing/unparseable date_added are excluded, since they
    cannot be attributed to a specific year.
    """
    valid = df.dropna(subset=["year_added"])
    result = valid.groupby(["year_added", "type"]).size().unstack(fill_value=0)
    result["Total"] = result.sum(axis=1)
    result.index = result.index.astype(int)
    return result.sort_index()


def analyze_release_years(df: pd.DataFrame) -> pd.DataFrame:
    """Distribution of titles by release_year, split by content type."""
    result = df.groupby(["release_year", "type"]).size().unstack(fill_value=0)
    result["Total"] = result.sum(axis=1)
    return result.sort_index()


def analyze_date_added_patterns(df: pd.DataFrame) -> dict:
    """Year-added and month-added distributions."""
    valid = df.dropna(subset=["year_added", "month_added"])
    return {
        "by_year": valid["year_added"].astype(int).value_counts().sort_index(),
        "by_month": valid["month_added"].astype(int).value_counts().sort_index(),
    }


def analyze_countries(df: pd.DataFrame, top_n: int = 10) -> pd.Series:
    """
    Top producing countries, correctly handling multi-country cells by
    exploding the 'country' column first.
    """
    exploded = split_multivalue_column(df, "country")
    return exploded["country"].value_counts().head(top_n)


def analyze_countries_by_type(df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """Cross-tab of top countries vs. content type (Movie/TV Show)."""
    exploded = split_multivalue_column(df, "country")
    top_countries = exploded["country"].value_counts().head(top_n).index
    subset = exploded[exploded["country"].isin(top_countries)]
    return subset.groupby(["country", "type"]).size().unstack(fill_value=0).loc[top_countries]


def analyze_genres(df: pd.DataFrame, top_n: int = 10) -> pd.Series:
    """
    Most common genres, correctly handling multi-genre cells by exploding
    the 'listed_in' column first.
    """
    exploded = split_multivalue_column(df, "listed_in")
    return exploded["listed_in"].value_counts().head(top_n)


def analyze_genres_by_type(df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """Cross-tab of top genres vs. content type (Movie/TV Show)."""
    exploded = split_multivalue_column(df, "listed_in")
    top_genres = exploded["listed_in"].value_counts().head(top_n).index
    subset = exploded[exploded["listed_in"].isin(top_genres)]
    return subset.groupby(["listed_in", "type"]).size().unstack(fill_value=0).loc[top_genres]


def analyze_ratings(df: pd.DataFrame) -> pd.DataFrame:
    """Overall rating distribution, plus a breakdown by content type."""
    overall = df["rating"].value_counts(dropna=True)
    by_type = df.groupby(["rating", "type"]).size().unstack(fill_value=0)
    return overall, by_type


def analyze_movie_duration(df: pd.DataFrame) -> dict:
    """
    Descriptive statistics for movie duration (minutes).

    Median is reported alongside the mean because duration distributions
    are right-skewed (a small number of very long movies), so the median
    better represents a 'typical' movie length.
    """
    durations = df.loc[df["type"] == "Movie", "duration_minutes"].dropna()
    q1, q3 = durations.quantile([0.25, 0.75])
    return {
        "count": int(durations.count()),
        "mean": round(durations.mean(), 1),
        "median": durations.median(),
        "std": round(durations.std(), 1),
        "min": durations.min(),
        "max": durations.max(),
        "q1": q1,
        "q3": q3,
        "iqr": round(q3 - q1, 1),
    }


def analyze_tv_seasons(df: pd.DataFrame) -> dict:
    """Descriptive statistics for TV show season counts."""
    seasons = df.loc[df["type"] == "TV Show", "number_of_seasons"].dropna()
    return {
        "count": int(seasons.count()),
        "median": seasons.median(),
        "mean": round(seasons.mean(), 2),
        "max": seasons.max(),
        "one_season_shows": int((seasons == 1).sum()),
        "one_season_pct": round((seasons == 1).mean() * 100, 1),
        "multi_season_shows": int((seasons > 1).sum()),
    }


def analyze_directors(df: pd.DataFrame, top_n: int = 10) -> pd.Series:
    """
    Directors with the most titles. Rows with no listed director
    ('Not Specified', from the cleaning step) are excluded so that missing
    data is never counted as a real director.
    """
    exploded = split_multivalue_column(df, "director")
    return exploded["director"].value_counts().head(top_n)


def analyze_cast(df: pd.DataFrame, top_n: int = 10) -> pd.Series:
    """Most frequently appearing actors across the catalog."""
    exploded = split_multivalue_column(df, "cast")
    return exploded["cast"].value_counts().head(top_n)


def analyze_description_text(df: pd.DataFrame) -> dict:
    """Summary statistics for description length and word count."""
    return {
        "length_mean": round(df["description_length"].mean(), 1),
        "length_median": df["description_length"].median(),
        "length_std": round(df["description_length"].std(), 1),
        "word_count_mean": round(df["description_word_count"].mean(), 1),
        "word_count_median": df["description_word_count"].median(),
    }


def compute_correlations(df: pd.DataFrame) -> pd.DataFrame:
    """
    Correlation matrix across meaningful numerical variables only:
    release_year, duration_minutes, number_of_seasons,
    description_length, description_word_count.

    Categorical variables are intentionally excluded - correlating
    arbitrary encoded categories produces numbers without a coherent
    interpretation.
    """
    numeric_cols = [
        "release_year", "duration_minutes", "number_of_seasons",
        "description_length", "description_word_count",
    ]
    return df[numeric_cols].corr()


def detect_outliers(series: pd.Series) -> dict:
    """
    Detect outliers in a numeric series using the IQR method.

    Returns
    -------
    dict
        Bounds used and the outlier values found (not automatically removed).
    """
    clean = series.dropna()
    q1, q3 = clean.quantile([0.25, 0.75])
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    outliers = clean[(clean < lower) | (clean > upper)]
    return {
        "lower_bound": lower,
        "upper_bound": upper,
        "n_outliers": int(outliers.count()),
        "outlier_values": outliers,
    }


def generate_summary_statistics(df: pd.DataFrame) -> pd.DataFrame:
    """Standard descriptive statistics for the key numerical variables."""
    numeric_cols = [
        "release_year", "duration_minutes", "number_of_seasons",
        "description_length", "description_word_count",
    ]
    stats_df = df[numeric_cols].describe().T
    stats_df["iqr"] = stats_df["75%"] - stats_df["25%"]
    return stats_df


def content_type_growth_test(df: pd.DataFrame) -> dict:
    """
    Compare the share of TV Shows added in the earlier half vs. later half
    of the years present in the data, using a chi-square test of
    independence between (era) and (content type).

    This is a simple, transparent way to check whether the movie/TV-show
    mix has shifted over time, without overstating causal claims.
    """
    valid = df.dropna(subset=["year_added"]).copy()
    median_year = valid["year_added"].median()
    valid["era"] = np.where(valid["year_added"] <= median_year, "Earlier", "Later")
    contingency = pd.crosstab(valid["era"], valid["type"])
    chi2, p_value, dof, expected = stats.chi2_contingency(contingency)
    return {
        "contingency_table": contingency,
        "chi2": round(chi2, 2),
        "p_value": p_value,
        "median_split_year": median_year,
    }
