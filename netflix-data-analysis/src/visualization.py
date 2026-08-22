"""
visualization.py

Chart-generation functions for the Netflix EDA project. Every function
saves a labeled, titled PNG to the visualizations/ directory and also
returns the matplotlib Figure so it can be displayed inline in notebooks.

"""

import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
import pandas as pd
import numpy as np

NETFLIX_RED = "#E50914"
DARK_GRAY = "#333333"
PALETTE = [NETFLIX_RED, "#564d4d", "#8c8c8c", "#b3b3b3", "#221f1f"]


def set_style():
    sns.set_theme(style="whitegrid")
    plt.rcParams["figure.dpi"] = 110
    plt.rcParams["axes.titleweight"] = "bold"
    plt.rcParams["axes.titlesize"] = 13
    plt.rcParams["axes.labelsize"] = 11


def _save(fig, path):
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight")
    return fig


def plot_content_type_distribution(df: pd.DataFrame, out_path: str):
    """Bar + donut chart of Movie vs TV Show counts."""
    set_style()
    counts = df["type"].value_counts()
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))

    axes[0].bar(counts.index, counts.values, color=[NETFLIX_RED, DARK_GRAY])
    axes[0].set_title("Content Type Distribution (Count)")
    axes[0].set_xlabel("Content Type")
    axes[0].set_ylabel("Number of Titles")
    for i, v in enumerate(counts.values):
        axes[0].text(i, v + 30, str(v), ha="center", fontweight="bold")

    axes[1].pie(
        counts.values, labels=counts.index, autopct="%1.1f%%",
        colors=[NETFLIX_RED, DARK_GRAY], wedgeprops={"width": 0.4},
        startangle=90,
    )
    axes[1].set_title("Content Type Share (%)")

    return _save(fig, out_path)


def plot_content_over_time(growth_df: pd.DataFrame, out_path: str):
    """Time-series line chart: titles added to Netflix per year, by type."""
    set_style()
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.plot(growth_df.index, growth_df.get("Movie", 0), marker="o", color=NETFLIX_RED, label="Movie")
    ax.plot(growth_df.index, growth_df.get("TV Show", 0), marker="o", color=DARK_GRAY, label="TV Show")
    ax.set_title("Titles Added to Netflix per Year, by Content Type")
    ax.set_xlabel("Year Added")
    ax.set_ylabel("Number of Titles Added")
    ax.legend(title="Content Type")
    ax.xaxis.set_major_locator(mticker.MaxNLocator(integer=True))
    return _save(fig, out_path)


def plot_movies_vs_tv_over_time(growth_df: pd.DataFrame, out_path: str):
    """Stacked area chart showing the changing Movie/TV Show mix over time."""
    set_style()
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.stackplot(
        growth_df.index,
        growth_df.get("Movie", 0), growth_df.get("TV Show", 0),
        colors=[NETFLIX_RED, DARK_GRAY], labels=["Movie", "TV Show"],
    )
    ax.set_title("Movies vs. TV Shows Added Over Time (Stacked)")
    ax.set_xlabel("Year Added")
    ax.set_ylabel("Number of Titles Added")
    ax.legend(loc="upper left")
    return _save(fig, out_path)


def plot_top_countries(country_counts: pd.Series, out_path: str):
    """Horizontal bar chart of the top producing countries."""
    set_style()
    fig, ax = plt.subplots(figsize=(8, 6))
    ordered = country_counts.sort_values()
    ax.barh(ordered.index, ordered.values, color=NETFLIX_RED)
    ax.set_title(f"Top {len(ordered)} Countries by Number of Titles")
    ax.set_xlabel("Number of Titles")
    ax.set_ylabel("Country")
    return _save(fig, out_path)


def plot_top_genres(genre_counts: pd.Series, out_path: str):
    """Horizontal bar chart of the most common genres."""
    set_style()
    fig, ax = plt.subplots(figsize=(8, 6))
    ordered = genre_counts.sort_values()
    ax.barh(ordered.index, ordered.values, color=DARK_GRAY)
    ax.set_title(f"Top {len(ordered)} Genres by Number of Titles")
    ax.set_xlabel("Number of Titles")
    ax.set_ylabel("Genre")
    return _save(fig, out_path)


def plot_ratings_distribution(rating_counts: pd.Series, out_path: str):
    """Bar chart of content rating distribution."""
    set_style()
    fig, ax = plt.subplots(figsize=(9, 5))
    ordered = rating_counts.sort_values(ascending=False)
    ax.bar(ordered.index, ordered.values, color=NETFLIX_RED)
    ax.set_title("Distribution of Content Ratings")
    ax.set_xlabel("Rating")
    ax.set_ylabel("Number of Titles")
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
    return _save(fig, out_path)


def plot_duration_distribution(df: pd.DataFrame, out_path: str):
    """Histogram + boxplot of movie duration in minutes."""
    set_style()
    durations = df.loc[df["type"] == "Movie", "duration_minutes"].dropna()
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))

    axes[0].hist(durations, bins=30, color=NETFLIX_RED, edgecolor="white")
    axes[0].set_title("Movie Duration Distribution")
    axes[0].set_xlabel("Duration (minutes)")
    axes[0].set_ylabel("Number of Movies")

    axes[1].boxplot(durations, vert=True, patch_artist=True,
                     boxprops={"facecolor": NETFLIX_RED, "alpha": 0.6})
    axes[1].set_title("Movie Duration - Boxplot")
    axes[1].set_ylabel("Duration (minutes)")
    axes[1].set_xticks([])

    return _save(fig, out_path)


def plot_tv_seasons_distribution(df: pd.DataFrame, out_path: str):
    """Bar chart of TV show season counts."""
    set_style()
    seasons = df.loc[df["type"] == "TV Show", "number_of_seasons"].dropna()
    counts = seasons.value_counts().sort_index()
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.bar(counts.index.astype(int).astype(str), counts.values, color=DARK_GRAY)
    ax.set_title("Distribution of TV Show Season Counts")
    ax.set_xlabel("Number of Seasons")
    ax.set_ylabel("Number of TV Shows")
    return _save(fig, out_path)


def plot_release_year_distribution(df: pd.DataFrame, out_path: str):
    """Histogram of release years, split by content type."""
    set_style()
    fig, ax = plt.subplots(figsize=(9, 5))
    for t, color in zip(["Movie", "TV Show"], [NETFLIX_RED, DARK_GRAY]):
        subset = df.loc[df["type"] == t, "release_year"]
        ax.hist(subset, bins=30, alpha=0.6, label=t, color=color)
    ax.set_title("Distribution of Titles by Release Year")
    ax.set_xlabel("Release Year")
    ax.set_ylabel("Number of Titles")
    ax.legend(title="Content Type")
    return _save(fig, out_path)


def plot_monthly_additions(month_counts: pd.Series, out_path: str):
    """Bar chart of content additions by month (seasonality check)."""
    set_style()
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.bar([month_names[m - 1] for m in month_counts.index], month_counts.values, color=NETFLIX_RED)
    ax.set_title("Content Additions by Month (All Years Combined)")
    ax.set_xlabel("Month")
    ax.set_ylabel("Number of Titles Added")
    return _save(fig, out_path)


def plot_country_vs_type(cross_tab: pd.DataFrame, out_path: str):
    """Stacked horizontal bar chart: top countries vs. content type."""
    set_style()
    fig, ax = plt.subplots(figsize=(9, 6))
    cross_tab.plot(kind="barh", stacked=True, ax=ax, color=[NETFLIX_RED, DARK_GRAY])
    ax.set_title("Top Countries by Content Type")
    ax.set_xlabel("Number of Titles")
    ax.set_ylabel("Country")
    ax.legend(title="Content Type")
    return _save(fig, out_path)


def plot_genre_vs_type(cross_tab: pd.DataFrame, out_path: str):
    """Stacked horizontal bar chart: top genres vs. content type."""
    set_style()
    fig, ax = plt.subplots(figsize=(9, 6))
    cross_tab.plot(kind="barh", stacked=True, ax=ax, color=[NETFLIX_RED, DARK_GRAY])
    ax.set_title("Top Genres by Content Type")
    ax.set_xlabel("Number of Titles")
    ax.set_ylabel("Genre")
    ax.legend(title="Content Type")
    return _save(fig, out_path)


def plot_missing_data(missing_df: pd.DataFrame, out_path: str):
    """Horizontal bar chart of missing value percentage by column."""
    set_style()
    nonzero = missing_df[missing_df["missing_percent"] > 0].sort_values("missing_percent")
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.barh(nonzero.index, nonzero["missing_percent"], color=NETFLIX_RED)
    ax.set_title("Missing Data by Column")
    ax.set_xlabel("Missing (%)")
    ax.set_ylabel("Column")
    return _save(fig, out_path)


def plot_correlation_heatmap(corr_matrix: pd.DataFrame, out_path: str):
    """Correlation heatmap for the key numerical variables."""
    set_style()
    fig, ax = plt.subplots(figsize=(7, 6))
    sns.heatmap(corr_matrix, annot=True, fmt=".2f", cmap="RdGy_r", center=0,
                square=True, linewidths=0.5, ax=ax)
    ax.set_title("Correlation Matrix: Numerical Variables")
    return _save(fig, out_path)
