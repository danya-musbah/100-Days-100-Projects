"""
data_cleaning.py
-----------------
Functions that turn the raw Titanic sample data into a clean,
analysis-ready DataFrame.

"""

import pandas as pd


def clean_titanic_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the raw Titanic DataFrame.
    """
    clean_df = df.copy()

    # --- Age: median imputation ---
    median_age = clean_df["Age"].median()
    clean_df["Age"] = clean_df["Age"].fillna(median_age)

    # --- Embarked: mode imputation ---
    mode_embarked = clean_df["Embarked"].mode()[0]
    clean_df["Embarked"] = clean_df["Embarked"].fillna(mode_embarked)

    # --- Cabin: keep the column, but add a "was it recorded?" flag ---
    clean_df["HasCabin"] = clean_df["Cabin"].notnull().astype(int)

    return clean_df


def add_family_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add FamilySize and IsAlone engineered features.
    """
    out = df.copy()
    out["FamilySize"] = out["SibSp"] + out["Parch"] + 1
    out["IsAlone"] = (out["FamilySize"] == 1).astype(int)
    return out


def get_missing_value_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    Return a small summary table of missing values per column:
    count missing and percent missing, sorted from most to least missing.
    """
    missing_count = df.isnull().sum()
    missing_percent = (df.isnull().mean() * 100).round(2)
    summary = pd.DataFrame(
        {"missing_count": missing_count, "missing_percent": missing_percent}
    )
    return summary[summary["missing_count"] > 0].sort_values(
        "missing_count", ascending=False
    )


if __name__ == "__main__":
    from data_loading import load_titanic_data

    raw = load_titanic_data()
    print("Missing values before cleaning:")
    print(get_missing_value_summary(raw))

    cleaned = clean_titanic_data(raw)
    print("\nMissing values after cleaning:")
    print(get_missing_value_summary(cleaned))
