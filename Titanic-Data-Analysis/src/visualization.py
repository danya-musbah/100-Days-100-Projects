"""
visualization.py
------------------
Functions that build each chart used in the analysis and save them as
PNG files under outputs/charts/.
"""

import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd

sns.set_style("whitegrid")
plt.rcParams["font.size"] = 11
plt.rcParams["axes.titlesize"] = 14
plt.rcParams["axes.titleweight"] = "bold"

OUTPUT_DIR = "../outputs/charts"


def _save(fig, filename):
    fig.tight_layout()
    fig.savefig(f"{OUTPUT_DIR}/{filename}", dpi=150, bbox_inches="tight")


def plot_survival_counts(df: pd.DataFrame, save: bool = True):
    fig, ax = plt.subplots(figsize=(6, 5))
    counts = df["Survived"].value_counts().sort_index()
    labels = ["Did Not Survive", "Survived"]
    colors = ["#8C1C13", "#2E5266"]
    ax.bar(labels, counts.values, color=colors)
    ax.set_title("Survivors vs Non-Survivors")
    ax.set_ylabel("Number of Passengers")
    for i, v in enumerate(counts.values):
        ax.text(i, v + 3, str(v), ha="center", fontweight="bold")
    if save:
        _save(fig, "01_survival_counts.png")
    return fig


def plot_survival_by_sex(df: pd.DataFrame, save: bool = True):
    fig, ax = plt.subplots(figsize=(6, 5))
    rates = (df.groupby("Sex")["Survived"].mean() * 100).round(1)
    colors = ["#2E5266", "#8C1C13"]
    ax.bar(rates.index, rates.values, color=colors)
    ax.set_title("Survival Rate by Sex")
    ax.set_ylabel("Survival Rate (%)")
    ax.set_xlabel("Sex")
    ax.set_ylim(0, 100)
    for i, v in enumerate(rates.values):
        ax.text(i, v + 2, f"{v}%", ha="center", fontweight="bold")
    if save:
        _save(fig, "02_survival_by_sex.png")
    return fig


def plot_survival_by_class(df: pd.DataFrame, save: bool = True):
    fig, ax = plt.subplots(figsize=(6, 5))
    rates = (df.groupby("Pclass")["Survived"].mean() * 100).round(1)
    ax.bar(rates.index.astype(str), rates.values, color="#2E5266")
    ax.set_title("Survival Rate by Passenger Class")
    ax.set_ylabel("Survival Rate (%)")
    ax.set_xlabel("Passenger Class")
    ax.set_ylim(0, 100)
    for i, v in enumerate(rates.values):
        ax.text(i, v + 2, f"{v}%", ha="center", fontweight="bold")
    if save:
        _save(fig, "03_survival_by_class.png")
    return fig


def plot_age_distribution(df: pd.DataFrame, save: bool = True):
    fig, ax = plt.subplots(figsize=(7, 5))
    sns.histplot(df["Age"], bins=25, kde=True, color="#2E5266", ax=ax)
    ax.set_title("Age Distribution of Passengers")
    ax.set_xlabel("Age")
    ax.set_ylabel("Number of Passengers")
    if save:
        _save(fig, "04_age_distribution.png")
    return fig


def plot_fare_distribution(df: pd.DataFrame, save: bool = True):
    fig, ax = plt.subplots(figsize=(7, 5))
    sns.histplot(df["Fare"], bins=25, kde=True, color="#8C1C13", ax=ax)
    ax.set_title("Fare Distribution of Passengers")
    ax.set_xlabel("Fare")
    ax.set_ylabel("Number of Passengers")
    if save:
        _save(fig, "05_fare_distribution.png")
    return fig


def plot_survival_by_family_size(df: pd.DataFrame, save: bool = True):
    fig, ax = plt.subplots(figsize=(7, 5))
    rates = (df.groupby("FamilySize")["Survived"].mean() * 100).round(1)
    ax.bar(rates.index.astype(str), rates.values, color="#2E5266")
    ax.set_title("Survival Rate by Family Size")
    ax.set_xlabel("Family Size (passenger + relatives aboard)")
    ax.set_ylabel("Survival Rate (%)")
    ax.set_ylim(0, 105)
    for i, v in enumerate(rates.values):
        ax.text(i, v + 2, f"{v}%", ha="center", fontweight="bold", fontsize=9)
    if save:
        _save(fig, "06_survival_by_family_size.png")
    return fig


def plot_survival_by_sex_and_class(df: pd.DataFrame, save: bool = True):
    fig, ax = plt.subplots(figsize=(7, 5))
    pivot = df.pivot_table(index="Pclass", columns="Sex", values="Survived", aggfunc="mean") * 100
    pivot.plot(kind="bar", ax=ax, color=["#8C1C13", "#2E5266"])
    ax.set_title("Survival Rate by Sex and Passenger Class")
    ax.set_xlabel("Passenger Class")
    ax.set_ylabel("Survival Rate (%)")
    ax.set_ylim(0, 100)
    ax.legend(title="Sex")
    ax.set_xticklabels(ax.get_xticklabels(), rotation=0)
    if save:
        _save(fig, "07_survival_by_sex_and_class.png")
    return fig


def plot_correlation_heatmap(df: pd.DataFrame, save: bool = True):
    numeric_cols = ["Survived", "Pclass", "Age", "SibSp", "Parch", "Fare", "FamilySize", "IsAlone"]
    fig, ax = plt.subplots(figsize=(8, 6))
    corr = df[numeric_cols].corr()
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", center=0, ax=ax, square=True)
    ax.set_title("Correlation Heatmap of Numerical Variables")
    if save:
        _save(fig, "08_correlation_heatmap.png")
    return fig


def generate_all_charts(df: pd.DataFrame):
    """Generate and save every chart used in the analysis."""
    plot_survival_counts(df)
    plot_survival_by_sex(df)
    plot_survival_by_class(df)
    plot_age_distribution(df)
    plot_fare_distribution(df)
    plot_survival_by_family_size(df)
    plot_survival_by_sex_and_class(df)
    plot_correlation_heatmap(df)
    plt.close("all")
    print(f"All charts saved to {OUTPUT_DIR}/")


if __name__ == "__main__":
    from data_loading import load_titanic_data
    from data_cleaning import clean_titanic_data

    raw = load_titanic_data()
    df = clean_titanic_data(raw)
    generate_all_charts(df)
