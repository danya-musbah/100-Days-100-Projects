# Diabetes Prediction

**Predicting Diabetes Risk Using Machine Learning**

A complete, reproducible binary classification pipeline that predicts
diabetes status from clinical measurements, built on the Pima Indians
Diabetes Dataset.

> ⚠️ **Educational project.** This model is not a medical diagnostic system.
> All predictions are model estimates, not medical advice.

## Overview

This repository demonstrates a full applied machine learning workflow:
exploratory data analysis, principled data cleaning, leakage-safe
preprocessing, multi-model training and comparison, cross-validation,
hyperparameter tuning, multi-metric evaluation, feature importance /
interpretability, a reusable prediction function, and an interactive
Streamlit application — all built around a single, honestly-evaluated
classification problem.

## Project Objective

Predict `Outcome` (0 = No Diabetes, 1 = Diabetes) from 8 clinical features:
`Pregnancies`, `Glucose`, `BloodPressure`, `SkinThickness`, `Insulin`, `BMI`,
`DiabetesPedigreeFunction`, `Age`.

## Dataset

**Pima Indians Diabetes Dataset** (768 rows, 8 features + target). The raw
file is included at `data/raw/diabetes.csv`. If you need to re-obtain it:
source it from the UCI Machine Learning Repository or Kaggle
("Pima Indians Diabetes Database") and place it at that same path with the
column headers: `Pregnancies, Glucose, BloodPressure, SkinThickness,
Insulin, BMI, DiabetesPedigreeFunction, Age, Outcome`.

## Features

| Feature | Description |
|---|---|
| Pregnancies | Number of times pregnant |
| Glucose | Plasma glucose concentration |
| BloodPressure | Diastolic blood pressure (mm Hg) |
| SkinThickness | Triceps skinfold thickness (mm) |
| Insulin | 2-hour serum insulin (mu U/mL) |
| BMI | Body mass index |
| DiabetesPedigreeFunction | Diabetes pedigree function (genetic risk score) |
| Age | Age in years |
| Outcome | Target: 0 = No Diabetes, 1 = Diabetes |

## Data Cleaning

Implausible zeros in `Glucose`, `BloodPressure`, `SkinThickness`, `Insulin`,
`BMI` are converted to `NaN` and imputed with the median (fit on training
data only, inside the modeling pipeline, to avoid leakage). `Pregnancies`
is left untouched — 0 is a valid value. See `src/cleaning.py` and
`notebooks/03_preprocessing.ipynb`.

## Machine Learning Pipeline

`ZeroToNaN → SimpleImputer(median) → StandardScaler → Classifier`, wrapped
in a single `sklearn.pipeline.Pipeline`, fit exclusively on an 80% stratified
training split (`random_state=42`). See `src/preprocessing.py` and
`src/train.py`.

## Models

Baseline (`DummyClassifier`) plus five candidates: Logistic Regression,
Decision Tree, Random Forest, SVM, K-Nearest Neighbors. Random Forest and
Logistic Regression were further tuned via `GridSearchCV` (5-fold
`StratifiedKFold`, scored on F1).

## Evaluation Metrics

Accuracy, Precision, Recall, F1, ROC-AUC, Specificity, and Negative
Predictive Value — accuracy alone is insufficient given class imbalance
(the baseline reaches 64.9% accuracy while catching **zero** true positive
cases).

## Model Comparison

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| **Random Forest (Tuned)** | 0.740 | 0.609 | 0.722 | **0.661** | 0.818 |
| SVM | 0.727 | 0.591 | 0.722 | 0.650 | 0.814 |
| Logistic Regression | 0.734 | 0.603 | 0.704 | 0.650 | 0.813 |
| Logistic Regression (Tuned) | 0.708 | 0.571 | 0.667 | 0.615 | 0.810 |
| KNN | 0.740 | 0.652 | 0.556 | 0.600 | 0.807 |
| Random Forest | 0.734 | 0.644 | 0.537 | 0.586 | 0.816 |
| Decision Tree | 0.714 | 0.619 | 0.481 | 0.542 | 0.661 |

Full table with CV scores: `reports/model_comparison.csv`.

## Final Model

**Random Forest (Tuned)** — selected for the highest test-set F1 (balancing
Precision and Recall) and highest cross-validated F1, with strong Recall to
limit missed positive cases. Full rationale in
`reports/diabetes_prediction_report.md`.

## Feature Importance

`Glucose`, `BMI`, and `Age` are the most influential features for the final
model (`visualizations/feature_importance.png`). This reflects statistical
influence on model predictions, not medical causation.

## Project Structure

```
diabetes-prediction/
├── data/
│   ├── raw/diabetes.csv
│   └── processed/diabetes_cleaned.csv
├── src/
│   ├── data_loader.py
│   ├── cleaning.py
│   ├── preprocessing.py
│   ├── train.py
│   ├── evaluate.py
│   ├── predict.py
│   ├── visualization.py
│   ├── explainability.py
│   └── utils.py
├── models/
│   ├── best_model.pkl
│   ├── scaler.pkl
│   └── model_metadata.json
├── visualizations/
├── app/app.py
├── reports/diabetes_prediction_report.md
├── requirements.txt
└── README.md
```