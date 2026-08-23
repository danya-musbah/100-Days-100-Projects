"""
app.py — Diabetes Prediction: Streamlit interactive application.
"""

from __future__ import annotations
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.utils import FEATURE_COLUMNS

MODEL_PATH = Path("models/best_model.pkl")
METADATA_PATH = Path("models/model_metadata.json")

# --------------------------------------------------------------------------
# Page config + palette
# --------------------------------------------------------------------------
st.set_page_config(
    page_title="Diabetes Prediction",
    page_icon="🩺",
    layout="wide",
    initial_sidebar_state="expanded",
)

PALETTE = {
    "brick_ember": "#BA1200",
    "ink_black": "#031927",
    "air_force_blue": "#508AA8",
    "baby_blue": "#9DD1F1",
    "pale_sky": "#C8E0F4",
}

CUSTOM_CSS = f"""
<style>
:root {{
    --brick-ember: {PALETTE['brick_ember']};
    --ink-black: {PALETTE['ink_black']};
    --air-force-blue: {PALETTE['air_force_blue']};
    --baby-blue: {PALETTE['baby_blue']};
    --pale-sky: {PALETTE['pale_sky']};
}}

.stApp {{
    background-color: var(--ink-black);
    color: var(--pale-sky);
}}

section[data-testid="stSidebar"] {{
    background-color: #05202f;
    border-right: 1px solid var(--air-force-blue);
}}

h1, h2, h3 {{
    color: var(--pale-sky) !important;
    font-weight: 700;
    letter-spacing: -0.01em;
}}

.eyebrow {{
    color: var(--air-force-blue);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.78rem;
    font-weight: 600;
}}

.card {{
    background-color: var(--pale-sky);
    color: var(--ink-black);
    border-radius: 10px;
    padding: 1.4rem 1.6rem;
    border: 1px solid var(--air-force-blue);
    margin-bottom: 1rem;
}}

.card h4 {{ color: var(--ink-black) !important; margin-top: 0; }}

.metric-chip {{
    display: inline-block;
    background-color: var(--baby-blue);
    color: var(--ink-black);
    border-radius: 999px;
    padding: 0.25rem 0.9rem;
    font-weight: 600;
    font-size: 0.85rem;
    margin-right: 0.4rem;
}}

.disclaimer {{
    background-color: rgba(186, 18, 0, 0.12);
    border: 1px solid var(--brick-ember);
    border-radius: 10px;
    padding: 1rem 1.2rem;
    color: var(--pale-sky);
    font-size: 0.92rem;
}}

.result-positive {{
    background-color: var(--brick-ember);
    color: white;
    border-radius: 10px;
    padding: 1.6rem;
    text-align: center;
}}

.result-negative {{
    background-color: var(--air-force-blue);
    color: white;
    border-radius: 10px;
    padding: 1.6rem;
    text-align: center;
}}

div.stButton > button {{
    background-color: var(--brick-ember);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.6rem 1.4rem;
    font-weight: 600;
}}
div.stButton > button:hover {{
    background-color: #950e00;
    color: white;
}}

hr {{ border-color: var(--air-force-blue); opacity: 0.4; }}
</style>
"""
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


# --------------------------------------------------------------------------
# Load model + metadata
# --------------------------------------------------------------------------
@st.cache_resource
def load_model_and_metadata():
    if not MODEL_PATH.exists():
        return None, None
    model = joblib.load(MODEL_PATH)
    metadata = {}
    if METADATA_PATH.exists():
        with open(METADATA_PATH) as f:
            metadata = json.load(f)
    return model, metadata


model, metadata = load_model_and_metadata()

# --------------------------------------------------------------------------
# Sidebar navigation
# --------------------------------------------------------------------------
st.sidebar.markdown("### 🩺 Diabetes Prediction")
section = st.sidebar.radio(
    "Navigate",
    ["Overview", "Patient Input & Prediction", "Model Information", "Feature Importance", "Disclaimer"],
    label_visibility="collapsed",
)

if model is None:
    st.sidebar.warning("No trained model found. Run `python -m src.train` first.")

# --------------------------------------------------------------------------
# Overview
# --------------------------------------------------------------------------
if section == "Overview":
    st.markdown('<div class="eyebrow">Machine Learning · Classification · Healthcare Data</div>',
                unsafe_allow_html=True)
    st.title("Diabetes Prediction")
    st.subheader("Predicting Diabetes Risk Using Machine Learning")

    st.markdown(
        """
        This application demonstrates an end-to-end **binary classification** pipeline
        trained on the **Pima Indians Diabetes Dataset**. It estimates the likelihood
        that a patient's clinical measurements resemble those historically associated
        with a diabetes diagnosis in this dataset.
        """
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown('<div class="card"><h4>Objective</h4>Binary classification of diabetes '
                    'status from 8 clinical features.</div>', unsafe_allow_html=True)
    with col2:
        st.markdown('<div class="card"><h4>Dataset</h4>768 patient records · Pima Indians '
                    'Diabetes Dataset (UCI).</div>', unsafe_allow_html=True)
    with col3:
        model_name = metadata.get("model_name", "N/A") if metadata else "N/A"
        st.markdown(f'<div class="card"><h4>Final Model</h4>{model_name}</div>',
                    unsafe_allow_html=True)

    st.markdown("---")
    st.markdown(
        '<div class="disclaimer">⚠️ <b>Educational tool only.</b> This application is not a '
        "medical diagnostic tool and must not be used to make real medical decisions. "
        "See the Disclaimer section for full details.</div>",
        unsafe_allow_html=True,
    )

# --------------------------------------------------------------------------
# Patient Input & Prediction
# --------------------------------------------------------------------------
elif section == "Patient Input & Prediction":
    st.markdown('<div class="eyebrow">Model Estimate</div>', unsafe_allow_html=True)
    st.title("Patient Input & Prediction")

    if model is None:
        st.error("No trained model found. Please run `python -m src.train` first to generate "
                 "models/best_model.pkl.")
    else:
        st.markdown("Enter patient measurements below. All fields reflect the features used "
                    "to train the model.")

        left, right = st.columns(2)
        with left:
            pregnancies = st.number_input("Pregnancies", min_value=0, max_value=20, value=1, step=1)
            glucose = st.number_input("Glucose (mg/dL)", min_value=0, max_value=300, value=120)
            blood_pressure = st.number_input("Blood Pressure (mm Hg)", min_value=0, max_value=200, value=70)
            skin_thickness = st.number_input("Skin Thickness (mm)", min_value=0, max_value=100, value=20)
        with right:
            insulin = st.number_input("Insulin (mu U/mL)", min_value=0, max_value=900, value=79)
            bmi = st.number_input("BMI", min_value=0.0, max_value=70.0, value=28.0, step=0.1)
            dpf = st.number_input("Diabetes Pedigree Function", min_value=0.0, max_value=3.0,
                                   value=0.35, step=0.01)
            age = st.number_input("Age (years)", min_value=1, max_value=120, value=33)

        threshold = st.slider("Decision threshold", min_value=0.1, max_value=0.9, value=0.5, step=0.05,
                              help="Probability cutoff above which the model predicts the positive class.")

        if st.button("Run Prediction"):
            features = {
                "Pregnancies": pregnancies, "Glucose": glucose, "BloodPressure": blood_pressure,
                "SkinThickness": skin_thickness, "Insulin": insulin, "BMI": bmi,
                "DiabetesPedigreeFunction": dpf, "Age": age,
            }
            X = np.array([[features[c] for c in FEATURE_COLUMNS]], dtype=float)
            probability = float(model.predict_proba(X)[0, 1])
            prediction = int(probability >= threshold)

            st.markdown("---")
            res_col, chart_col = st.columns([1, 1])
            with res_col:
                if prediction == 1:
                    st.markdown(
                        f'<div class="result-positive"><h3>Model predicts the POSITIVE class</h3>'
                        f'<p style="font-size:2rem;font-weight:700;margin:0;">{probability:.1%}</p>'
                        f'<p>Model-estimated probability</p></div>',
                        unsafe_allow_html=True,
                    )
                else:
                    st.markdown(
                        f'<div class="result-negative"><h3>Model predicts the NEGATIVE class</h3>'
                        f'<p style="font-size:2rem;font-weight:700;margin:0;">{probability:.1%}</p>'
                        f'<p>Model-estimated probability</p></div>',
                        unsafe_allow_html=True,
                    )
            with chart_col:
                st.markdown("**Confidence**")
                st.progress(min(max(probability, 0.0), 1.0))
                st.caption(f"Model-estimated probability of the positive class: {probability:.3f} "
                          f"(threshold: {threshold})")

            st.markdown("#### Patient Feature Summary")
            summary_df = pd.DataFrame([features])
            st.dataframe(summary_df, use_container_width=True, hide_index=True)

            st.markdown(
                '<div class="disclaimer">This is a <b>model prediction</b>, not a medical diagnosis. '
                "Please consult a qualified healthcare professional for any medical concerns.</div>",
                unsafe_allow_html=True,
            )

# --------------------------------------------------------------------------
# Model Information
# --------------------------------------------------------------------------
elif section == "Model Information":
    st.markdown('<div class="eyebrow">Reproducibility & Performance</div>', unsafe_allow_html=True)
    st.title("Model Information")

    if not metadata:
        st.warning("No metadata found. Run `python -m src.train` first.")
    else:
        st.markdown(f"**Model:** {metadata.get('model_name')}")
        st.markdown(f"**Training date:** {metadata.get('training_date')}")
        st.markdown(f"**Random state:** {metadata.get('random_state')}")
        st.markdown(f"**Train / Test size:** {metadata.get('train_size')} / {metadata.get('test_size')}")

        tm = metadata.get("test_metrics", {})
        st.markdown("#### Held-Out Test Set Metrics")
        c1, c2, c3, c4, c5 = st.columns(5)
        c1.metric("Accuracy", f"{tm.get('accuracy', 0):.3f}")
        c2.metric("Precision", f"{tm.get('precision', 0):.3f}")
        c3.metric("Recall", f"{tm.get('recall', 0):.3f}")
        c4.metric("F1-score", f"{tm.get('f1', 0):.3f}")
        c5.metric("ROC-AUC", f"{tm.get('roc_auc', 0):.3f}")

        cv = metadata.get("cross_validation", {})
        st.markdown(
            f"**5-fold CV F1:** {cv.get('f1_mean', 0):.3f} ± {cv.get('f1_std', 0):.3f} &nbsp;&nbsp; "
            f"**5-fold CV ROC-AUC:** {cv.get('roc_auc_mean', 0):.3f} ± {cv.get('roc_auc_std', 0):.3f}"
        )

        st.markdown("#### Confusion Matrix (Test Set)")
        cm = metadata.get("confusion_matrix", {})
        cm_df = pd.DataFrame(
            [[cm.get("tn"), cm.get("fp")], [cm.get("fn"), cm.get("tp")]],
            columns=["Predicted: No Diabetes", "Predicted: Diabetes"],
            index=["Actual: No Diabetes", "Actual: Diabetes"],
        )
        st.dataframe(cm_df, use_container_width=True)

        img_path = Path("visualizations/confusion_matrix.png")
        if img_path.exists():
            st.image(str(img_path), caption="Confusion Matrix", width=420)

        roc_path = Path("visualizations/roc_curve.png")
        if roc_path.exists():
            st.image(str(roc_path), caption="ROC Curve Comparison", width=480)

# --------------------------------------------------------------------------
# Feature Importance
# --------------------------------------------------------------------------
elif section == "Feature Importance":
    st.markdown('<div class="eyebrow">Model Interpretation</div>', unsafe_allow_html=True)
    st.title("Feature Importance")
    st.markdown(
        "These values reflect how strongly each feature influenced the model's predictions "
        "on this dataset. **This does not imply that a feature causes diabetes** — only that "
        "it had a stronger statistical influence on the model's output."
    )
    img_path = Path("visualizations/feature_importance.png")
    if img_path.exists():
        st.image(str(img_path), use_container_width=True)
    else:
        st.warning("Feature importance chart not found. Run `python -m src.train` first.")

# --------------------------------------------------------------------------
# Disclaimer
# --------------------------------------------------------------------------
elif section == "Disclaimer":
    st.markdown('<div class="eyebrow">Please Read</div>', unsafe_allow_html=True)
    st.title("Disclaimer")
    st.markdown(
        """
        <div class="disclaimer">
        <b>This tool is for educational purposes only and is not a medical diagnostic tool.</b>
        <br><br>
        - This application does not diagnose diabetes or any other medical condition.<br>
        - Predictions are statistical estimates derived from a limited historical dataset
          (768 records from a single population).<br>
        - The dataset has known limitations, including class imbalance and a demographic
          scope that does not generalize to all populations.<br>
        - Results should never be used as a substitute for professional medical advice,
          diagnosis, or treatment.<br>
        - If you have concerns about your health, please consult a qualified healthcare
          professional.
        </div>
        """,
        unsafe_allow_html=True,
    )
