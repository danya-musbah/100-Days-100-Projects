"""
data_loading.py
----------------
Small helper functions for loading the Titanic sample dataset from Excel.
"""

import pandas as pd

DEFAULT_PATH = "../data/Titanic_Sample_Data.xlsx"
DEFAULT_SHEET = "Titanic_Data"


def load_titanic_data(path: str = DEFAULT_PATH, sheet_name: str = DEFAULT_SHEET) -> pd.DataFrame:
    """
    Load the Titanic sample dataset from an Excel file into a pandas DataFrame.
    """
    df = pd.read_excel(path, sheet_name=sheet_name)
    return df


def load_supporting_sheets(path: str = DEFAULT_PATH) -> dict:
    """
    Load the supporting sheets (Data_Dictionary, Analysis_Questions, Notes)
    from the workbook.
    """
    sheet_names = ["Data_Dictionary", "Analysis_Questions", "Notes"]
    return {name: pd.read_excel(path, sheet_name=name) for name in sheet_names}


if __name__ == "__main__":
    data = load_titanic_data()
    print(f"Loaded {data.shape[0]} rows and {data.shape[1]} columns.")
    print(data.head())
