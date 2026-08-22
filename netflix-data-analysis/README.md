# Netflix Data Analysis

## Overview

The project takes a raw Netflix titles CSV through a full analytical
pipeline: data understanding → data quality assessment → cleaning →
feature engineering → univariate/bivariate/multivariate EDA → time-series
analysis → outlier analysis → data-driven insights → a written report.

## Objectives

Demonstrate strong applied skills in:

- Python & Pandas / NumPy
- Data cleaning and reproducible pipelines
- Exploratory data analysis
- Data visualization
- Statistical analysis (correlation, chi-square testing, IQR outlier detection)
- Data storytelling (Finding → Evidence → Interpretation, throughout)

## Dataset

A public snapshot of Netflix's titles catalog (distributed via the
R for Data Science **TidyTuesday** project; originally sourced from
Flixable/Kaggle). 7,787 titles with fields including `show_id`, `type`,
`title`, `director`, `cast`, `country`, `date_added`, `release_year`,
`rating`, `duration`, `listed_in`, and `description`.

## Questions Investigated

- Movies vs. TV Shows — composition and how it has changed over time
- Content growth: which years saw the largest expansion?
- Which countries and genres dominate the catalog?
- What content ratings are most common?
- How long are movies, and how many seasons do shows run?
- Is the catalog concentrated in recent releases?
- Which numerical variables are (and aren't) meaningfully related?
- What data-quality limitations should shape how findings are read?

## Technologies

Python 3 · Pandas · NumPy · Matplotlib · Seaborn · SciPy · Jupyter ·
Streamlit (optional dashboard) · Plotly (available, optional)

## Project Structure

```
netflix-data-analysis/
├── data/
│   ├── raw/netflix_titles.csv          # original, untouched dataset
│   └── processed/netflix_cleaned.csv   # cleaned + feature-engineered output
├── src/
│   ├── data_loader.py                  # loading, validation, inspection
│   ├── cleaning.py                     # reproducible cleaning pipeline
│   ├── analysis.py                     # all analytical functions
│   ├── visualization.py                # chart-generation functions
│   └── utils.py                        # feature engineering
├── visualizations/                     # 14 saved PNG charts
├── reports/netflix_eda_report.md       # narrative write-up
├── dashboard/app.py                    # optional Streamlit dashboard
├── requirements.txt
└── .gitignore
```

## Key Insights

- Movies make up 69.1% of the catalog; TV Shows 30.9% — but TV Shows'
  share has grown significantly over time (chi-square p < 0.001).
- Content additions peaked in 2019 (2,153 titles added).
- The United States (3,297 titles), India (990), and the United Kingdom
  (723) are the leading producing countries.
- International Movies, Dramas, and Comedies are the most common genres.
- TV-MA is the most common rating; median movie runtime is 98 minutes;
  66.7% of TV shows have only one season.
- About 70% of titles were released in 2015 or later.

Full details, statistical support, and caveats are in
`reports/netflix_eda_report.md`.