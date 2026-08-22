# Netflix Data Analysis

*Exploring Netflix's Content Catalog Through Data*

---

## Executive Summary

This report analyzes a public snapshot of Netflix's titles catalog (7,787
titles, 12 original fields) to understand its composition, growth,
geography, genres, ratings, and content characteristics. All figures below
are computed directly from the dataset; no numbers are invented.

**Major findings:**

1. **Movies dominate the catalog (69.1%)**, with TV Shows making up 30.9%
   (5,377 vs. 2,410 titles) — but the mix has shifted toward TV Shows over
   time (chi-square test, p < 0.001).
2. **Content additions peaked in 2019**, with 2,153 titles added that year,
   as part of a rapid expansion from 2016 through 2020.
3. **The United States is the leading content-producing country** (3,297
   titles), followed by India (990) and the United Kingdom (723).
4. **International Movies, Dramas, and Comedies** are the most represented
   genre tags in the catalog.
5. **TV-MA is the most common content rating**; Adult-oriented ratings
   (TV-MA, R, NC-17) account for the largest single rating_category group
   (3,531 titles).
6. **The typical movie runs 98 minutes** (median), with an IQR of 86-114
   minutes.
7. **About two-thirds of TV shows (66.7%) have only one season** recorded
   in this snapshot.
8. **The catalog skews toward recent releases** — about 70% of titles were
   released in 2015 or later, though the oldest title dates back to 1925.
9. **About 15.8% of titles list more than one country**, which is why
   multi-country cells were split before counting country totals.
10. **Director information is missing for about 30.7% of titles** — a
    meaningful data-quality caveat for any director-based finding.

---

## Dataset Overview

- **Source:** Public Netflix titles dataset (distributed via the
  R for Data Science *TidyTuesday* project; originally sourced from
  Flixable/Kaggle).
- **Shape:** 7,787 rows × 12 original columns.
- **Fields:** `show_id`, `type`, `title`, `director`, `cast`, `country`,
  `date_added`, `release_year`, `rating`, `duration`, `listed_in`,
  `description`.
- **Unique identifier:** `show_id` (0 duplicate rows, 0 duplicate IDs found).

## Data Quality

| Column | Missing Count | Missing % |
|---|---|---|
| director | 2,389 | 30.68% |
| cast | 718 | 9.22% |
| country | 507 | 6.51% |
| date_added | 10 | 0.13% |
| rating | 7 | 0.09% |
| all other columns | 0 | 0.00% |

No fully duplicated rows or duplicate `show_id` values were found. The
`duration` field is overloaded — it stores minutes for Movies and a season
count for TV Shows — which required splitting into two dedicated columns
before analysis.

## Data Cleaning

The cleaning pipeline (fully reproducible via `src/cleaning.py`):

1. Normalized column names and stripped whitespace from all text fields.
2. Removed duplicate rows / duplicate `show_id`s (none found).
3. Parsed `date_added` into a real datetime.
4. Split `duration` into `duration_minutes` (Movies) and
   `number_of_seasons` (TV Shows).
5. Normalized the `country` field's formatting.
6. Added explicit missing-value flag columns before imputation.
7. Filled `director`/`cast` with `"Not Specified"` and `country` with
   `"Unknown"` — explicit labels rather than silent drops or guesses.

No rows were dropped due to missing values alone.

## Content Analysis

Movies account for 5,377 titles (69.05%) and TV Shows for 2,410 (30.95%).
A chi-square test of independence, comparing content type between the
earlier and later halves of the dataset (split at the median year added,
2019), found a statistically significant shift toward TV Shows in the
later period (χ² = 14.62, p ≈ 0.00013).

## Country Analysis

Because 15.8% of titles list more than one country, the `country` field
was exploded before counting so that a title like *"United States, India"*
contributes to both countries rather than a single combined category.

**Top 5 countries by title count:**

| Country | Titles |
|---|---|
| United States | 3,297 |
| India | 990 |
| United Kingdom | 723 |
| Canada | 412 |
| France | 349 |

## Genre Analysis

The `listed_in` field was similarly exploded to correctly count
multi-genre titles.

**Top 5 genre tags:**

| Genre | Titles |
|---|---|
| International Movies | 2,437 |
| Dramas | 2,106 |
| Comedies | 1,471 |
| International TV Shows | 1,199 |
| Documentaries | 786 |

## Rating Analysis

TV-MA is the single most common rating. Grouping ratings into broad
audience bands:

| Rating Category | Titles |
|---|---|
| Adults (TV-MA, R, NC-17) | 3,531 |
| Teens (PG-13, TV-14, PG, TV-PG) | 3,370 |
| Kids (G, TV-G, TV-Y, TV-Y7, TV-Y7-FV) | 790 |
| Unrated (NR, UR) | 89 |
| Unknown (missing) | 7 |

## Movie Duration

- Count: 5,377 movies with a parsed duration
- Mean: 99.3 minutes | Median: 98.0 minutes
- Std. dev.: 28.5 minutes
- Min: 3 minutes | Max: 312 minutes
- Q1: 86.0 | Q3: 114.0 | IQR: 28.0 minutes

IQR-based outlier detection flags 337 movies outside [44.0, 156.0] minutes.
These are assessed as plausible extreme content (short films, long-format
documentaries/epics) rather than data errors, given both bounds correspond
to realistic runtimes.

## TV Show Seasons

- Count: 2,410 TV shows with a parsed season count
- Median: 1 season | Mean: 1.78 seasons | Max: 16 seasons
- One-season shows: 1,608 (66.7%)
- Multi-season shows: 802 (33.3%)

IQR-based outlier detection flags shows with 4+ seasons (236 shows) as
statistical outliers relative to the one-season-skewed distribution — these
are legitimate long-running series, not data errors.

## Time Trends

Content additions to Netflix grew from single/double digits in 2013-2015 to
a peak of 2,153 titles added in 2019, before declining in 2020-2021 — the
2021 figure (117 titles) reflects the dataset's snapshot cutoff partway
through that year rather than an actual slowdown in Netflix's real-world
content additions.

Monthly seasonality in additions is present but mild — not strong enough to
support a confident claim of a deliberate seasonal release calendar from
this dataset alone.

## Key Findings

See the Executive Summary above; the full statistical and visual support
for each finding is in `notebooks/03_eda.ipynb`.

## Limitations

- This dataset is a single historical snapshot and does not represent
  Netflix's complete, current global catalog.
- Missing values in `director` (30.7%), `cast` (9.2%), and `country` (6.5%)
  may bias analyses involving those fields toward the subset of titles with
  recorded data.
- Multi-valued `country` and `listed_in` fields require careful splitting;
  results should be read as "titles associated with X," not exclusive
  categorization.
- **This dataset contains no viewership or popularity data.** All findings
  describe *representation in the catalog*, not popularity — e.g. the most
  frequently credited directors/actors are the most *represented*, not
  necessarily the most *popular*.
- Correlations reported in the multivariate analysis describe association,
  not causation.

## Conclusion

Netflix's catalog, as captured in this dataset, is movie-heavy but shifting
toward television, anchored in US production with substantial
international representation (led by India), weighted toward mature
content ratings, and concentrated in recent release years. These patterns
are well-supported by the data; claims about *why* these patterns exist
(e.g. business strategy, licensing decisions) go beyond what this dataset
alone can confirm.
