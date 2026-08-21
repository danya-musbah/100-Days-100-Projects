"""
analysis.py
------------
Functions that compute the statistics and survival breakdowns used
throughout the notebook, the README, and the dashboard.

"""

import pandas as pd


def basic_statistics(df: pd.DataFrame) -> dict:
    """Compute the headline summary statistics for the cleaned dataset."""
    total_passengers = int(len(df))
    survivors = int(df["Survived"].sum())
    non_survivors = int(total_passengers - survivors)
    survival_rate = float(df["Survived"].mean() * 100)

    return {
        "total_passengers": total_passengers,
        "survivors": survivors,
        "non_survivors": non_survivors,
        "survival_rate_percent": round(survival_rate, 2),
        "average_age": round(float(df["Age"].mean()), 2),
        "median_age": round(float(df["Age"].median()), 2),
        "average_fare": round(float(df["Fare"].mean()), 2),
        "min_fare": round(float(df["Fare"].min()), 2),
        "max_fare": round(float(df["Fare"].max()), 2),
    }


def survival_by_sex(df: pd.DataFrame) -> pd.Series:
    """Survival rate (%), grouped by sex."""
    return (df.groupby("Sex")["Survived"].mean() * 100).round(2)


def survival_by_class(df: pd.DataFrame) -> pd.Series:
    """Survival rate (%), grouped by passenger class."""
    return (df.groupby("Pclass")["Survived"].mean() * 100).round(2)


def survival_by_sex_and_class(df: pd.DataFrame) -> pd.Series:
    """Survival rate (%), grouped by sex and passenger class together."""
    return (df.groupby(["Sex", "Pclass"])["Survived"].mean() * 100).round(2)


def survival_by_alone_status(df: pd.DataFrame) -> pd.Series:
    """Survival rate (%), grouped by whether the passenger was travelling alone."""
    result = (df.groupby("IsAlone")["Survived"].mean() * 100).round(2)
    result.index = result.index.map({0: "With Family", 1: "Alone"})
    return result


def survival_by_family_size(df: pd.DataFrame) -> pd.Series:
    """Survival rate (%), grouped by family size."""
    return (df.groupby("FamilySize")["Survived"].mean() * 100).round(2)


def average_fare_by_class(df: pd.DataFrame) -> pd.Series:
    """Average fare paid, grouped by passenger class."""
    return df.groupby("Pclass")["Fare"].mean().round(2)


if __name__ == "__main__":
    from data_loading import load_titanic_data
    from data_cleaning import clean_titanic_data

    raw = load_titanic_data()
    df = clean_titanic_data(raw)

    print("Basic statistics:")
    print(basic_statistics(df))
    print("\nSurvival by sex:")
    print(survival_by_sex(df))
    print("\nSurvival by class:")
    print(survival_by_class(df))
