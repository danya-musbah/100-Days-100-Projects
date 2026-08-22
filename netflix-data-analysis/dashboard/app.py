"""
Netflix Data Analysis - Interactive Dashboard (optional, supplementary)
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt

from src.data_loader import load_data
from src.cleaning import clean_data
from src.utils import engineer_features
from src import analysis as az
from src import visualization as viz

st.set_page_config(
    page_title="Netflix Data Analysis",
    page_icon="🎬",
    layout="wide",
)

# --- Dark, Netflix-inspired (but original) theme ---
st.markdown(
    """
    <style>
    .stApp { background-color: #141414; color: #FFFFFF; }
    h1, h2, h3 { color: #FFFFFF; }
    .metric-red { color: #E50914; }
    section[data-testid="stSidebar"] { background-color: #221f1f; }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def get_data():
    raw_path = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "netflix_titles.csv")
    df = load_data(raw_path)
    df = clean_data(df)
    df = engineer_features(df)
    return df


df = get_data()

st.title("🎬 Netflix Data Analysis")
st.caption("Exploring Netflix's Content Catalog Through Data — interactive companion to the EDA notebooks")

# --- Sidebar filters ---
st.sidebar.header("Filters")
content_type_filter = st.sidebar.multiselect(
    "Content Type", options=sorted(df["type"].unique()), default=sorted(df["type"].unique())
)
year_min, year_max = int(df["release_year"].min()), int(df["release_year"].max())
year_range = st.sidebar.slider("Release Year Range", year_min, year_max, (2010, year_max))

filtered = df[
    df["type"].isin(content_type_filter)
    & df["release_year"].between(year_range[0], year_range[1])
]

st.sidebar.markdown(f"**Titles matching filters:** {len(filtered):,}")

tabs = st.tabs(["Overview", "Content Types", "Countries", "Genres", "Ratings", "Duration & Seasons", "Trends"])

with tabs[0]:
    col1, col2, col3 = st.columns(3)
    col1.metric("Total Titles", f"{len(filtered):,}")
    col2.metric("Movies", f"{(filtered['type']=='Movie').sum():,}")
    col3.metric("TV Shows", f"{(filtered['type']=='TV Show').sum():,}")
    st.dataframe(filtered.head(20), use_container_width=True)

with tabs[1]:
    st.subheader("Content Type Distribution")
    fig = viz.plot_content_type_distribution(filtered, "/tmp/_dash_content_type.png")
    st.pyplot(fig)
    plt.close(fig)

with tabs[2]:
    st.subheader("Top Countries")
    top_n = st.slider("Number of countries to show", 5, 20, 10, key="country_n")
    top_countries = az.analyze_countries(filtered, top_n)
    fig = viz.plot_top_countries(top_countries, "/tmp/_dash_countries.png")
    st.pyplot(fig)
    plt.close(fig)
    st.dataframe(top_countries)

with tabs[3]:
    st.subheader("Top Genres")
    top_n_g = st.slider("Number of genres to show", 5, 20, 10, key="genre_n")
    top_genres = az.analyze_genres(filtered, top_n_g)
    fig = viz.plot_top_genres(top_genres, "/tmp/_dash_genres.png")
    st.pyplot(fig)
    plt.close(fig)
    st.dataframe(top_genres)

with tabs[4]:
    st.subheader("Ratings Distribution")
    overall_ratings, ratings_by_type = az.analyze_ratings(filtered)
    fig = viz.plot_ratings_distribution(overall_ratings, "/tmp/_dash_ratings.png")
    st.pyplot(fig)
    plt.close(fig)

with tabs[5]:
    st.subheader("Movie Duration")
    fig = viz.plot_duration_distribution(filtered, "/tmp/_dash_duration.png")
    st.pyplot(fig)
    plt.close(fig)
    st.write(az.analyze_movie_duration(filtered))

    st.subheader("TV Show Seasons")
    fig = viz.plot_tv_seasons_distribution(filtered, "/tmp/_dash_seasons.png")
    st.pyplot(fig)
    plt.close(fig)
    st.write(az.analyze_tv_seasons(filtered))

with tabs[6]:
    st.subheader("Content Added Over Time")
    growth = az.analyze_growth(filtered)
    fig = viz.plot_content_over_time(growth, "/tmp/_dash_growth.png")
    st.pyplot(fig)
    plt.close(fig)
    st.dataframe(growth)

st.markdown("---")
st.caption(
    "Data reflects a single snapshot of Netflix's public titles catalog and does not include "
    "viewership or popularity data. See reports/netflix_eda_report.md for full limitations."
)
