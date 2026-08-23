"""
visualization.py
Reusable plotting functions for EDA and model evaluation. All functions save
a PNG to the visualizations/ directory and also return the matplotlib Figure.
"""

from __future__ import annotations
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix, roc_curve, auc, precision_recall_curve,
)

sns.set_theme(style="whitegrid")
VIZ_DIR = Path("visualizations")


def _save(fig, filename: str):
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(VIZ_DIR / filename, dpi=150, bbox_inches="tight")


def plot_target_distribution(df: pd.DataFrame, target_col: str = "Outcome"):
    fig, ax = plt.subplots(figsize=(6, 4.5))
    counts = df[target_col].value_counts().sort_index()
    labels = ["No Diabetes (0)", "Diabetes (1)"]
    ax.bar(labels, counts.values, color=["#508AA8", "#BA1200"])
    for i, v in enumerate(counts.values):
        ax.text(i, v + 5, f"{v} ({v/len(df):.1%})", ha="center")
    ax.set_title("Target Distribution (Outcome)")
    ax.set_ylabel("Count")
    _save(fig, "target_distribution.png")
    return fig


def plot_feature_distributions(df: pd.DataFrame, feature_columns: list[str]):
    n = len(feature_columns)
    ncols = 4
    nrows = int(np.ceil(n / ncols))
    fig, axes = plt.subplots(nrows, ncols, figsize=(4 * ncols, 3.2 * nrows))
    axes = np.array(axes).reshape(-1)
    for i, col in enumerate(feature_columns):
        sns.histplot(df[col], kde=True, ax=axes[i], color="#508AA8")
        axes[i].set_title(col)
    for j in range(i + 1, len(axes)):
        axes[j].axis("off")
    fig.suptitle("Feature Distributions", y=1.02)
    fig.tight_layout()
    _save(fig, "feature_distributions.png")
    return fig


def plot_correlation_heatmap(df: pd.DataFrame, columns: list[str]):
    fig, ax = plt.subplots(figsize=(8, 6.5))
    corr = df[columns].corr(method="pearson")
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", center=0, ax=ax)
    ax.set_title("Feature Correlation Heatmap (Pearson)")
    _save(fig, "correlation_heatmap.png")
    return fig


def plot_bivariate_vs_outcome(df: pd.DataFrame, feature: str, target_col: str = "Outcome"):
    fig, ax = plt.subplots(figsize=(6, 4.5))
    sns.boxplot(data=df, x=target_col, y=feature, hue=target_col, ax=ax,
                palette={0: "#508AA8", 1: "#BA1200"}, legend=False)
    ax.set_xticklabels(["No Diabetes", "Diabetes"])
    ax.set_title(f"{feature} vs Outcome")
    _save(fig, f"{feature.lower()}_vs_outcome.png")
    return fig


def plot_glucose_vs_bmi(df: pd.DataFrame, target_col: str = "Outcome"):
    fig, ax = plt.subplots(figsize=(6.5, 5))
    colors = df[target_col].map({0: "#508AA8", 1: "#BA1200"})
    ax.scatter(df["Glucose"], df["BMI"], c=colors, alpha=0.6, edgecolor="white", linewidth=0.3)
    ax.set_xlabel("Glucose")
    ax.set_ylabel("BMI")
    ax.set_title("Glucose vs BMI (colored by Outcome)")
    _save(fig, "glucose_vs_bmi.png")
    return fig


def plot_confusion_matrix(y_true, y_pred, model_name: str = "Model"):
    fig, ax = plt.subplots(figsize=(5, 4.5))
    cm = confusion_matrix(y_true, y_pred)
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["Pred 0", "Pred 1"],
                yticklabels=["True 0", "True 1"], ax=ax)
    ax.set_title(f"Confusion Matrix — {model_name}")
    _save(fig, "confusion_matrix.png")
    return fig


def plot_roc_curves(models_probs: dict, y_true):
    """models_probs: {model_name: predicted_probabilities_for_class_1}"""
    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    for name, probs in models_probs.items():
        fpr, tpr, _ = roc_curve(y_true, probs)
        roc_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, label=f"{name} (AUC={roc_auc:.3f})")
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Chance")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve Comparison")
    ax.legend(loc="lower right", fontsize=9)
    _save(fig, "roc_curve.png")
    return fig


def plot_precision_recall_curves(models_probs: dict, y_true):
    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    for name, probs in models_probs.items():
        precision, recall, _ = precision_recall_curve(y_true, probs)
        ax.plot(recall, precision, label=name)
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("Precision-Recall Curve Comparison")
    ax.legend(loc="lower left", fontsize=9)
    _save(fig, "precision_recall_curve.png")
    return fig


def plot_feature_importance(importances: pd.Series, model_name: str = "Model", top_n: int = 8):
    fig, ax = plt.subplots(figsize=(7, 4.5))
    imp = importances.sort_values(ascending=True).tail(top_n)
    ax.barh(imp.index, imp.values, color="#BA1200")
    ax.set_title(f"Feature Importance — {model_name}")
    ax.set_xlabel("Importance")
    _save(fig, "feature_importance.png")
    return fig


def plot_threshold_analysis(thresholds: list[float], metrics: dict):
    """metrics: {'precision': [...], 'recall': [...], 'f1': [...]}"""
    fig, ax = plt.subplots(figsize=(7, 5))
    for name, values in metrics.items():
        ax.plot(thresholds, values, marker="o", label=name)
    ax.set_xlabel("Decision Threshold")
    ax.set_ylabel("Score")
    ax.set_title("Threshold Analysis")
    ax.legend()
    _save(fig, "threshold_analysis.png")
    return fig
