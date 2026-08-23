# Diabetes Prediction

**Predicting Diabetes Risk Using Machine Learning**

> Educational machine-learning project. This model is not a medical diagnostic
> system. All outputs are model predictions/estimates, not medical advice.

## Executive Summary

This project builds a reproducible binary classification pipeline that
predicts a `diabetes` outcome from 8 clinical measurements using the Pima
Indians Diabetes Dataset (768 records). Seven models (a `DummyClassifier`
baseline plus 5 candidate algorithms and 2 tuned variants) were trained,
cross-validated, and evaluated on a held-out test set. The final selected
model is a **tuned Random Forest** achieving **F1 = 0.661** and
**ROC-AUC = 0.818** on the test set (5-fold CV F1 = 0.701 ± 0.020). All
figures in this report are generated directly by `python -m src.train` and
are not hand-edited or fabricated.

## Problem Definition

Binary classification: predict `Outcome` (0 = No Diabetes, 1 = Diabetes)
from `Pregnancies`, `Glucose`, `BloodPressure`, `SkinThickness`, `Insulin`,
`BMI`, `DiabetesPedigreeFunction`, and `Age`.

Key questions investigated:
- Which features are most associated with the diabetes classification?
- Which algorithm generalizes best on held-out data?
- How does class imbalance affect model behavior and metric choice?
- What are the practical limitations of the resulting model?

## Dataset

**Pima Indians Diabetes Dataset** — 768 rows, 8 features, 1 binary target.
Sourced as a standard, publicly available reference copy of the UCI Pima
Indians Diabetes Database (all female patients of Pima Indian heritage,
age 21+). No synthetic data was generated; the raw dataset is committed at
`data/raw/diabetes.csv`.

## Data Quality

A quality audit (see `notebooks/01_data_understanding.ipynb`) found:
- 0 duplicate rows.
- 0 native (`NaN`) missing values.
- Substantial numbers of **implausible zero values** in columns where 0 is
  not a physiologically valid reading:

| Column | Zero count | % of rows |
|---|---|---|
| Glucose | 5 | 0.7% |
| BloodPressure | 35 | 4.6% |
| SkinThickness | 227 | 29.6% |
| Insulin | 374 | 48.7% |
| BMI | 11 | 1.4% |

`Pregnancies == 0` is left untouched since zero pregnancies is a valid,
common value. These zero values were treated as **missing measurements**
rather than genuine physiological readings, then imputed with the **median**
of the training split only (median chosen for robustness to the right-skew
observed in these features; see `notebooks/02_eda.ipynb`).

## Exploratory Data Analysis

- **Target distribution**: 500 No-Diabetes (65.1%) vs 268 Diabetes (34.9%) —
  a moderate class imbalance that makes plain Accuracy a misleading primary
  metric.
- **Univariate**: `Glucose`, `BMI`, and `Insulin` are right-skewed; `Age` is
  concentrated in younger ranges with a long tail.
- **Bivariate**: `Glucose`, `BMI`, and `Age` show the clearest separation
  between Outcome classes in boxplots.
- **Correlation**: `Glucose` has the strongest linear correlation with
  `Outcome`, followed by `BMI` and `Age`. No feature pair is correlated
  strongly enough to warrant removal for multicollinearity.
- **Outliers**: IQR-based scanning flags a modest number of outliers per
  feature; these were retained as plausible extreme values rather than
  removed, since no clear evidence of data-entry error was found.

Full details, tables, and charts: `notebooks/02_eda.ipynb` and
`visualizations/`.

## Preprocessing

A leakage-safe `sklearn.pipeline.Pipeline` performs, **fit only on the
training split**:
1. Implausible-zero → `NaN` conversion (custom transformer).
2. Median imputation (`SimpleImputer`).
3. Standardization (`StandardScaler`).

The test set is transformed using statistics learned exclusively from
training data — verified explicitly in `notebooks/03_preprocessing.ipynb`.
Data was split 80/20 with stratification on `Outcome`, `random_state=42`.

## Models

Baseline: `DummyClassifier` (most-frequent strategy).

Candidates: Logistic Regression, Decision Tree, Random Forest, SVM
(RBF kernel), K-Nearest Neighbors — all trained with `class_weight="balanced"`
where supported, inside the same preprocessing pipeline.

Tuned (via `GridSearchCV`, scoring = F1, 5-fold `StratifiedKFold`, training
data only): Random Forest and Logistic Regression.

## Cross Validation

Stratified 5-fold cross-validation on the training set only
(`random_state=42`), scored on Accuracy, Precision, Recall, F1, and ROC-AUC.

## Model Comparison

Test-set metrics (sorted by F1) — computed by `python -m src.train`:

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC | CV F1 (mean ± std) |
|---|---|---|---|---|---|---|
| **Random Forest (Tuned)** | 0.740 | 0.609 | 0.722 | **0.661** | 0.818 | 0.701 ± 0.020 |
| SVM | 0.727 | 0.591 | 0.722 | 0.650 | 0.814 | 0.690 ± 0.029 |
| Logistic Regression | 0.734 | 0.603 | 0.704 | 0.650 | 0.813 | 0.672 ± 0.013 |
| Logistic Regression (Tuned) | 0.708 | 0.571 | 0.667 | 0.615 | 0.810 | 0.682 ± 0.017 |
| KNN | 0.740 | 0.652 | 0.556 | 0.600 | 0.807 | 0.632 ± 0.048 |
| Random Forest | 0.734 | 0.644 | 0.537 | 0.586 | 0.816 | 0.645 ± 0.033 |
| Decision Tree | 0.714 | 0.619 | 0.481 | 0.542 | 0.661 | 0.546 ± 0.046 |
| Baseline (DummyClassifier) | 0.649 | 0.000 | 0.000 | 0.000 | 0.500 | — |

The baseline reaches 64.9% accuracy while identifying **zero** true positive
cases — direct evidence that accuracy alone is insufficient for this
imbalanced problem.

## Final Model

**Selected: Random Forest (Tuned)**
(`max_depth=5, min_samples_leaf=1, n_estimators=200`)

**Rationale**: F1 balances Precision and Recall, which matters because both
false positives and false negatives carry real costs in a diabetes-risk
screening context. Random Forest (Tuned) has the highest test F1 (0.661)
among all candidates and tuned variants, with a Recall (0.722) tied for the
highest of any model — reducing missed positive cases relative to
Accuracy-optimized alternatives, without a large sacrifice in Precision.
Its cross-validated F1 (0.701 ± 0.020) is also the highest and among the
most stable across folds, giving reasonable confidence it isn't a
test-set-specific artifact.

## Evaluation

Held-out test set (n=154): Accuracy 0.740, Precision 0.609, Recall 0.722,
F1 0.661, ROC-AUC 0.818, Specificity 0.750, NPV 0.833.

**Confusion Matrix** (test set): TN=75, FP=25, FN=15, TP=39.

False negatives (15 cases) represent instances where the model predicted
"No Diabetes" for a patient whose Outcome was recorded as 1. In a
diabetes-risk screening context, false negatives are often considered more
costly than false positives, since a false positive typically leads to a
low-cost follow-up test, while a false negative could delay appropriate
care — this is a modeling design consideration for this dataset, not a
clinical claim about any individual.

## Feature Importance

For the final Random Forest model, feature importances are visualized in
`visualizations/feature_importance.png`. Consistent with the EDA
correlation analysis, `Glucose`, `BMI`, and `Age` are the most influential
features. These features had the **strongest statistical influence on the
model's predictions** for this dataset — this is not evidence that any
feature *causes* diabetes.

## Error Analysis

Misclassified test-set examples (`reports/false_positives.csv`,
`reports/false_negatives.csv`) were compared against correctly classified
examples. False negatives tend to have feature values closer to the overall
population average than clearly positive cases — consistent with these
being borderline cases near the model's decision boundary, rather than
systematic data errors. See `notebooks/05_model_evaluation.ipynb` for the
full breakdown, including a threshold-sensitivity analysis
(`reports/threshold_analysis.csv`) showing how Precision/Recall/F1 trade off
across thresholds 0.3–0.7.

## Limitations

- **Dataset size and scope**: 768 records from a single population (Pima
  Indian heritage, female, age 21+) — findings do not generalize to other
  demographics, sexes, or age groups.
- **Missingness handling**: median imputation is a simplification; more
  sophisticated approaches (e.g. multiple imputation) might improve
  performance but add complexity.
- **Class imbalance**: while addressed via `class_weight="balanced"` and by
  reporting Precision/Recall/F1/ROC-AUC, the minority (positive) class
  remains harder to predict reliably, as reflected in Precision ≈ 0.61.
- **No external validation**: the model has not been tested on any
  population outside this single dataset.
- **Feature set**: only 8 measurements are used; real diabetes risk
  assessment involves substantially more clinical and lifestyle information.

## Ethical Considerations

- This model must **not** be used for real clinical decision-making or
  self-diagnosis.
- The dataset's narrow demographic scope means the model's outputs could be
  misleading or biased if applied to populations outside the training
  distribution.
- False negatives could, in a real-world deployment, delay someone from
  seeking care; false positives could cause unnecessary worry or testing.
  Both are acknowledged limitations of any model trained on this dataset.
- Any real-world use of an ML system for diabetes risk would require
  extensive clinical validation, regulatory review, and involvement of
  medical professionals — none of which this project provides.
- All predictions produced by `src/predict.py` and the Streamlit app are
  explicitly labeled as **model-estimated probabilities**, not medical
  certainty or diagnosis.

## Conclusion

This project demonstrates a complete, reproducible, leakage-safe machine
learning pipeline for a healthcare-adjacent classification problem: EDA,
principled missing-data handling, multiple algorithms compared with
cross-validation, hyperparameter tuning, multi-metric evaluation, error
analysis, and model interpretability — packaged behind a clearly-labeled,
non-diagnostic prediction interface. The final Random Forest (Tuned) model
achieves reasonable, honestly-reported performance (F1 = 0.661,
ROC-AUC = 0.818) for an 8-feature classical ML approach on this dataset,
while being transparent about its limitations and appropriate scope of use.
