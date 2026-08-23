"""
train.py
End-to-end training pipeline:
  1. Load raw data
  2. Train/test split (stratified, 80/20, random_state=42)
  3. Build leakage-safe preprocessing pipeline (fit on train only)
  4. Train baseline + 5 classification models
  5. Stratified 5-fold cross-validation on training data
  6. Hyperparameter tuning of the strongest candidates
  7. Evaluate all models on the held-out test set
  8. Select final model based on a documented, justified strategy
  9. Save model, scaler-inclusive pipeline, and metadata
"""

from __future__ import annotations
import json
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.dummy import DummyClassifier
from sklearn.pipeline import Pipeline

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.data_loader import load_raw_data
from src.cleaning import clean_dataset, save_processed_data, data_quality_report
from src.preprocessing import build_preprocessing_pipeline
from src.evaluate import compute_metrics, cross_validate_model, threshold_scan
from src.visualization import (
    plot_target_distribution, plot_feature_distributions, plot_correlation_heatmap,
    plot_bivariate_vs_outcome, plot_glucose_vs_bmi, plot_confusion_matrix,
    plot_roc_curves, plot_precision_recall_curves, plot_feature_importance,
    plot_threshold_analysis,
)
from src.utils import RANDOM_STATE, FEATURE_COLUMNS, TARGET_COLUMN, set_global_seed

MODELS_DIR = Path("models")
REPORTS_DIR = Path("reports")


def get_candidate_models() -> dict:
    return {
        "Logistic Regression": LogisticRegression(max_iter=2000, class_weight="balanced",
                                                    random_state=RANDOM_STATE),
        "Decision Tree": DecisionTreeClassifier(class_weight="balanced", random_state=RANDOM_STATE),
        "Random Forest": RandomForestClassifier(class_weight="balanced", random_state=RANDOM_STATE,
                                                  n_estimators=300),
        "SVM": SVC(probability=True, class_weight="balanced", random_state=RANDOM_STATE),
        "KNN": KNeighborsClassifier(n_neighbors=15),
    }


def get_hyperparameter_grids() -> dict:
    """Grids for the models we choose to tune (the strongest / most promising candidates)."""
    return {
        "Random Forest": {
            "classifier__n_estimators": [200, 300, 500],
            "classifier__max_depth": [None, 5, 8, 12],
            "classifier__min_samples_leaf": [1, 2, 4],
        },
        "Logistic Regression": {
            "classifier__C": [0.01, 0.1, 1, 10],
            "classifier__penalty": ["l2"],
        },
    }


def main():
    set_global_seed(RANDOM_STATE)
    MODELS_DIR.mkdir(exist_ok=True)
    REPORTS_DIR.mkdir(exist_ok=True)

    print("=" * 70)
    print("DIABETES PREDICTION — TRAINING PIPELINE")
    print("=" * 70)

    # 1. Load raw data ------------------------------------------------------
    raw_df = load_raw_data("data/raw/diabetes.csv")
    print(f"\nRaw data shape: {raw_df.shape}")

    dq = data_quality_report(raw_df)
    print("Data quality report:")
    print(json.dumps({k: v for k, v in dq.items() if k != "dtypes"}, indent=2, default=str))

    # Save a cleaned artifact for reference/EDA (not used directly for training,
    # since the modeling pipeline re-fits imputation on the train split only).
    cleaned_df = clean_dataset(raw_df)
    save_processed_data(cleaned_df, "data/processed/diabetes_cleaned.csv")
    print("\nSaved cleaned reference dataset to data/processed/diabetes_cleaned.csv")

    # EDA visualizations (computed on cleaned data purely for visual inspection)
    plot_target_distribution(raw_df, TARGET_COLUMN)
    plot_feature_distributions(cleaned_df, FEATURE_COLUMNS)
    plot_correlation_heatmap(cleaned_df, FEATURE_COLUMNS + [TARGET_COLUMN])
    plot_bivariate_vs_outcome(cleaned_df, "Glucose", TARGET_COLUMN)
    plot_bivariate_vs_outcome(cleaned_df, "BMI", TARGET_COLUMN)
    plot_bivariate_vs_outcome(cleaned_df, "Age", TARGET_COLUMN)
    plot_glucose_vs_bmi(cleaned_df, TARGET_COLUMN)
    print("Saved EDA visualizations to visualizations/")

    # 2. Train/test split (on RAW data — preprocessing pipeline handles cleaning) ---
    X = raw_df[FEATURE_COLUMNS].values
    y = raw_df[TARGET_COLUMN].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=RANDOM_STATE
    )
    print(f"\nTrain shape: {X_train.shape}, Test shape: {X_test.shape}")
    print(f"Train class balance: {np.bincount(y_train)} | Test class balance: {np.bincount(y_test)}")

    # 3. Baseline -------------------------------------------------------------
    baseline = Pipeline([
        ("preprocessing", build_preprocessing_pipeline()),
        ("classifier", DummyClassifier(strategy="most_frequent", random_state=RANDOM_STATE)),
    ])
    baseline.fit(X_train, y_train)
    baseline_pred = baseline.predict(X_test)
    baseline_proba = baseline.predict_proba(X_test)[:, 1]
    baseline_metrics = compute_metrics(y_test, baseline_pred, baseline_proba)
    print("\n--- Baseline (DummyClassifier, most_frequent) ---")
    print(json.dumps(baseline_metrics, indent=2))

    # 4. Train + cross-validate all candidate models --------------------------
    candidates = get_candidate_models()
    results = {}
    fitted_pipelines = {}
    test_probas = {}

    for name, clf in candidates.items():
        pipe = Pipeline([
            ("preprocessing", build_preprocessing_pipeline()),
            ("classifier", clf),
        ])
        cv_scores = cross_validate_model(pipe, X_train, y_train, cv_folds=5)
        pipe.fit(X_train, y_train)
        y_pred = pipe.predict(X_test)
        y_proba = pipe.predict_proba(X_test)[:, 1]
        test_metrics = compute_metrics(y_test, y_pred, y_proba)

        results[name] = {**test_metrics, **cv_scores}
        fitted_pipelines[name] = pipe
        test_probas[name] = y_proba

        print(f"\n--- {name} ---")
        print(f"CV ROC-AUC: {cv_scores['roc_auc_mean']:.4f} (+/- {cv_scores['roc_auc_std']:.4f})")
        print(f"Test — Acc: {test_metrics['accuracy']:.4f} | Prec: {test_metrics['precision']:.4f} "
              f"| Rec: {test_metrics['recall']:.4f} | F1: {test_metrics['f1']:.4f} "
              f"| ROC-AUC: {test_metrics['roc_auc']:.4f}")

    # 5. Hyperparameter tuning of the two strongest candidates ---------------
    grids = get_hyperparameter_grids()
    tuned_results = {}
    tuned_pipelines = {}

    for name in grids:
        base_pipe = Pipeline([
            ("preprocessing", build_preprocessing_pipeline()),
            ("classifier", candidates[name]),
        ])
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
        search = GridSearchCV(base_pipe, grids[name], scoring="f1", cv=skf, n_jobs=-1)
        search.fit(X_train, y_train)

        tuned_pipe = search.best_estimator_
        y_pred = tuned_pipe.predict(X_test)
        y_proba = tuned_pipe.predict_proba(X_test)[:, 1]
        test_metrics = compute_metrics(y_test, y_pred, y_proba)
        cv_scores = cross_validate_model(tuned_pipe, X_train, y_train, cv_folds=5)

        tuned_name = f"{name} (Tuned)"
        tuned_results[tuned_name] = {**test_metrics, **cv_scores, "best_params": search.best_params_}
        tuned_pipelines[tuned_name] = tuned_pipe
        test_probas[tuned_name] = y_proba

        print(f"\n--- {tuned_name} ---")
        print(f"Best params: {search.best_params_}")
        print(f"Test — Acc: {test_metrics['accuracy']:.4f} | Prec: {test_metrics['precision']:.4f} "
              f"| Rec: {test_metrics['recall']:.4f} | F1: {test_metrics['f1']:.4f} "
              f"| ROC-AUC: {test_metrics['roc_auc']:.4f}")

    all_results = {**results, **tuned_results}
    all_pipelines = {**fitted_pipelines, **tuned_pipelines}

    # 6. Model comparison table -------------------------------------------------
    comparison_rows = []
    for name, m in all_results.items():
        comparison_rows.append({
            "Model": name,
            "Accuracy": m["accuracy"],
            "Precision": m["precision"],
            "Recall": m["recall"],
            "F1": m["f1"],
            "ROC-AUC": m["roc_auc"],
            "CV F1 Mean": m["f1_mean"],
            "CV F1 Std": m["f1_std"],
        })
    comparison_df = pd.DataFrame(comparison_rows).sort_values("F1", ascending=False)
    comparison_df.to_csv(REPORTS_DIR / "model_comparison.csv", index=False)
    print("\n" + "=" * 70)
    print("MODEL COMPARISON (sorted by F1)")
    print("=" * 70)
    print(comparison_df.to_string(index=False))

    # 7. Final model selection ---------------------------------------------
    # Strategy: in a diabetes-risk screening context, false negatives (missing
    # a person who is actually positive) are generally more costly than false
    # positives (flagging someone for a follow-up test who turns out negative).
    # We therefore prioritize F1 (balances precision/recall) and use Recall
    # as a tie-breaker, rather than optimizing for raw Accuracy alone.
    comparison_df["Recall_rank"] = comparison_df["Recall"].rank(ascending=False)
    comparison_df["F1_rank"] = comparison_df["F1"].rank(ascending=False)
    final_name = comparison_df.sort_values(["F1", "Recall"], ascending=False).iloc[0]["Model"]
    final_pipeline = all_pipelines[final_name]
    final_metrics = all_results[final_name]

    print(f"\nSelected final model: {final_name}")
    print(f"Rationale: highest F1-score on the held-out test set among tuned and "
          f"untuned candidates, which balances precision and recall — important "
          f"given that both false positives and false negatives carry real costs "
          f"in a diabetes-risk screening context, with a slight preference toward "
          f"recall via the tie-break to reduce missed positive cases.")

    # 8. Evaluation visuals for the FINAL model -----------------------------
    y_pred_final = final_pipeline.predict(X_test)
    y_proba_final = final_pipeline.predict_proba(X_test)[:, 1]

    plot_confusion_matrix(y_test, y_pred_final, model_name=final_name)

    # ROC / PR curves comparing top models (final + baseline + 2 others for context)
    top_for_plot = {final_name: y_proba_final, "Baseline": baseline_proba}
    for name in list(fitted_pipelines.keys())[:2]:
        if name != final_name:
            top_for_plot[name] = test_probas[name]
    plot_roc_curves(top_for_plot, y_test)
    plot_precision_recall_curves(top_for_plot, y_test)

    # Feature importance
    clf_final = final_pipeline.named_steps["classifier"]
    if hasattr(clf_final, "feature_importances_"):
        importances = pd.Series(clf_final.feature_importances_, index=FEATURE_COLUMNS)
        plot_feature_importance(importances, model_name=final_name)
    elif hasattr(clf_final, "coef_"):
        importances = pd.Series(np.abs(clf_final.coef_[0]), index=FEATURE_COLUMNS)
        plot_feature_importance(importances, model_name=final_name)
    else:
        importances = pd.Series(dtype=float)

    # Threshold analysis
    thresh_df = threshold_scan(y_test, y_proba_final)
    thresh_df.to_csv(REPORTS_DIR / "threshold_analysis.csv", index=False)
    plot_threshold_analysis(
        thresh_df["threshold"].tolist(),
        {
            "Precision": thresh_df["precision"].tolist(),
            "Recall": thresh_df["recall"].tolist(),
            "F1": thresh_df["f1"].tolist(),
        },
    )

    # 9. Error analysis -------------------------------------------------------
    test_df = pd.DataFrame(X_test, columns=FEATURE_COLUMNS)
    test_df["y_true"] = y_test
    test_df["y_pred"] = y_pred_final
    test_df["y_proba"] = y_proba_final
    false_positives = test_df[(test_df.y_true == 0) & (test_df.y_pred == 1)]
    false_negatives = test_df[(test_df.y_true == 1) & (test_df.y_pred == 0)]
    false_positives.to_csv(REPORTS_DIR / "false_positives.csv", index=False)
    false_negatives.to_csv(REPORTS_DIR / "false_negatives.csv", index=False)
    print(f"\nFalse Positives: {len(false_positives)} | False Negatives: {len(false_negatives)}")

    # 10. Save model artifacts -------------------------------------------------
    joblib.dump(final_pipeline, MODELS_DIR / "best_model.pkl")
    # The scaler lives inside the pipeline; we also export the fitted
    # preprocessing sub-pipeline separately for transparency / reuse.
    joblib.dump(final_pipeline.named_steps["preprocessing"], MODELS_DIR / "scaler.pkl")

    metadata = {
        "model_name": final_name,
        "training_date": datetime.now().isoformat(timespec="seconds"),
        "features": FEATURE_COLUMNS,
        "target": TARGET_COLUMN,
        "random_state": RANDOM_STATE,
        "sklearn_version": sklearn.__version__,
        "test_metrics": {k: v for k, v in final_metrics.items()
                          if k not in ("tn", "fp", "fn", "tp", "best_params")},
        "confusion_matrix": {
            "tn": final_metrics.get("tn"), "fp": final_metrics.get("fp"),
            "fn": final_metrics.get("fn"), "tp": final_metrics.get("tp"),
        },
        "cross_validation": {
            "folds": 5,
            "f1_mean": final_metrics.get("f1_mean"),
            "f1_std": final_metrics.get("f1_std"),
            "roc_auc_mean": final_metrics.get("roc_auc_mean"),
            "roc_auc_std": final_metrics.get("roc_auc_std"),
        },
        "best_params": final_metrics.get("best_params", "default (untuned)"),
        "train_size": int(X_train.shape[0]),
        "test_size": int(X_test.shape[0]),
        "disclaimer": "This model is for educational purposes only and is NOT a medical diagnostic tool.",
    }
    with open(MODELS_DIR / "model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2, default=str)

    print(f"\nSaved final model pipeline to {MODELS_DIR / 'best_model.pkl'}")
    print(f"Saved metadata to {MODELS_DIR / 'model_metadata.json'}")
    print("\nTraining pipeline complete.")

    return {
        "comparison_df": comparison_df,
        "final_name": final_name,
        "final_metrics": final_metrics,
        "metadata": metadata,
    }


if __name__ == "__main__":
    main()
