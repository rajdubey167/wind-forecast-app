import nbformat as nbf

nb = nbf.v4.new_notebook()

# Markdown definitions
md_intro = """# Wind Power Forecast Analysis
This notebook analyzes the error characteristics of the wind power forecasting model for the UK, utilizing data from the Elexon BMRS API for January 2024.

We will analyze:
1. Overall Error metrics: Mean, Median, and P99 Error.
2. Error variations as Forecast Horizon increases (0-48h).
3. Error variations across different times of the day.
4. Reliable MW capacity estimation based on historical actual generation."""

code_setup = """import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

# Configure plotting
sns.set_theme(style="whitegrid")
plt.rcParams['figure.figsize'] = (10, 6)

DATA_FILE = 'data/processed_wind_data.json'

print("Loading data...")
with open(DATA_FILE, 'r') as f:
    data = json.load(f)

# Convert actuals to a DataFrame
actuals_df = pd.DataFrame(list(data['actuals'].items()), columns=['targetTime', 'actualGeneration'])
actuals_df['targetTime'] = pd.to_datetime(actuals_df['targetTime'])
actuals_df.set_index('targetTime', inplace=True)

# Convert forecasts to a DataFrame
forecasts_df = pd.DataFrame(data['forecasts'])
forecasts_df['targetTime'] = pd.to_datetime(forecasts_df['targetTime'])
forecasts_df['publishTime'] = pd.to_datetime(forecasts_df['publishTime'])

# Filter out horizons > 48 hours for the scope of this analysis
forecasts_df = forecasts_df[forecasts_df['horizon'] <= 48].copy()

print(f"Loaded {len(actuals_df)} actual values and {len(forecasts_df)} forecast values.")"""

md_merge = """## 1. Merging Data & Calculating Error
We define error as: `Error = Forecast - Actual`.
A positive error means we over-forecasted (expected more wind than generated).
A negative error means we under-forecasted."""

code_merge = """# Merge forecasts with actuals based on targetTime
df = pd.merge(forecasts_df, actuals_df, on='targetTime', how='inner')

# Calculate Error
df['error'] = df['generation'] - df['actualGeneration']
df['abs_error'] = df['error'].abs()

df.sort_values(by=['targetTime', 'horizon'], inplace=True)
df.head()"""

md_overall_stats = """## 2. Overall Error Characteristics"""

code_overall_stats = """mae = df['abs_error'].mean()
median_abs_error = df['abs_error'].median()
p99_abs_error = df['abs_error'].quantile(0.99)
rmse = np.sqrt((df['error']**2).mean())

print("--- Overall Model Error Metrics (MW) ---")
print(f"Mean Absolute Error (MAE):   {mae:.2f}")
print(f"Median Absolute Error (MedAE): {median_abs_error:.2f}")
print(f"P99 Absolute Error:          {p99_abs_error:.2f}")
print(f"Root Mean Square Exp (RMSE): {rmse:.2f}")

plt.figure(figsize=(10, 5))
sns.histplot(df['error'], bins=100, kde=True)
plt.title('Distribution of Forecasting Errors (Forecast - Actual)')
plt.xlabel('Error (MW)')
plt.ylabel('Frequency')
plt.axvline(0, color='black', linestyle='--')
plt.show()"""

md_horizon = """## 3. Error Variation by Forecast Horizon
Intuitively, forecasting further into the future should result in higher errors."""

code_horizon = """# Group by forecast horizon (rounded to nearest hour) to see the trend
df['horizon_hr'] = df['horizon'].round()
horizon_stats = df.groupby('horizon_hr')['abs_error'].agg(['mean', 'median', lambda x: x.quantile(0.99)])
horizon_stats.columns = ['Mean Error', 'Median Error', 'P99 Error']

plt.figure(figsize=(12, 6))
sns.lineplot(data=horizon_stats)
plt.title('Error Characteristics by Forecast Horizon (0 to 48 hours)')
plt.xlabel('Forecast Horizon (Hours before target time)')
plt.ylabel('Absolute Error (MW)')
plt.legend(title='Metric')
plt.show()"""

md_timeofday = """## 4. Error Variation by Time of Day
Are forecasts less accurate during specific times of the day (e.g., peak demand hours)? """

code_timeofday = """# Extract hour from targetTime
df['target_hour'] = df['targetTime'].dt.hour
timeofday_stats = df.groupby('target_hour')['abs_error'].agg(['mean', 'median', lambda x: x.quantile(0.99)])
timeofday_stats.columns = ['Mean Error', 'Median Error', 'P99 Error']

plt.figure(figsize=(12, 6))
sns.lineplot(data=timeofday_stats)
plt.title('Error Characteristics by Time of Day (Hour of Target)')
plt.xlabel('Hour of Day (UTC)')
plt.ylabel('Absolute Error (MW)')
plt.xticks(range(0, 24))
plt.legend(title='Metric')
plt.show()"""

md_capacity = """## 5. Reliable Wind Power Capacity Recommendation
Wind power is highly variable. To plan for reliable capacity, we shouldn't rely on the *average* wind generation, but rather the *minimum dependable* generation.
We can look at the historical probability distribution (Actuals) and use percentiles (P95, P99) to recommend a reliable baseline."""

code_capacity = """# Let's look at the distribution of actual generation
actuals_clean = actuals_df['actualGeneration'].dropna()

mean_gen = actuals_clean.mean()
p50_gen = actuals_clean.median()
p90_gen = actuals_clean.quantile(0.10) # 90% of the time, generation is > this value
p95_gen = actuals_clean.quantile(0.05)
p99_gen = actuals_clean.quantile(0.01)

print("--- Wind Power Dependability (January 2024 Actuals) ---")
print(f"Mean Generation:           {mean_gen:.2f} MW")
print(f"Median Generation:         {p50_gen:.2f} MW")
print(f"P90 Dependable Capacity:   {p90_gen:.2f} MW (Available >= 90% of the time)")
print(f"P95 Dependable Capacity:   {p95_gen:.2f} MW (Available >= 95% of the time)")
print(f"P99 Dependable Capacity:   {p99_gen:.2f} MW (Available >= 99% of the time)")

# Plotting the Empirical Cumulative Distribution Function (ECDF)
plt.figure(figsize=(10, 6))
sns.ecdfplot(actuals_clean, complementary=True) # Prob(Generation >= x)
plt.title('Wind Power Generation Exceedance Curve')
plt.xlabel('Actual Generation (MW)')
plt.ylabel('Probability of Meeting or Exceeding Capacity')
plt.axhline(0.95, color='r', linestyle='--', label='95% Reliability threshold')
plt.axvline(p95_gen, color='r', linestyle=':')
plt.legend()
plt.show()"""

md_conclusion = """### Conclusion on Reliable Capacity
Based on the data for January 2024, wind generation is highly volatile. While the mean generation is around ~X MW, recommending this as "reliable capacity" is dangerous as half the time actual generation will fall short.

If the grid operators require a **95% confidence level** (i.e., we are 95% sure the wind will produce *at least* this much power), they can only reliably expect the **P95 Capacity**. 

It is important to note this is significantly lower than the installed capacity and average capacity. Wind must be supplemented by reliable baseload sources or energy storage (batteries/pumped hydro) to bridge the gap during the unpredictable wind lulls observed in the error analysis."""

# Create notebook structure
nb['cells'] = [
    nbf.v4.new_markdown_cell(md_intro),
    nbf.v4.new_code_cell(code_setup),
    nbf.v4.new_markdown_cell(md_merge),
    nbf.v4.new_code_cell(code_merge),
    nbf.v4.new_markdown_cell(md_overall_stats),
    nbf.v4.new_code_cell(code_overall_stats),
    nbf.v4.new_markdown_cell(md_horizon),
    nbf.v4.new_code_cell(code_horizon),
    nbf.v4.new_markdown_cell(md_timeofday),
    nbf.v4.new_code_cell(code_timeofday),
    nbf.v4.new_markdown_cell(md_capacity),
    nbf.v4.new_code_cell(code_capacity),
    nbf.v4.new_markdown_cell(md_conclusion)
]

with open('d:/AI/wind-forecast-app/Analysis.ipynb', 'w') as f:
    nbf.write(nb, f)
    
print("Notebook created successfully as Analysis.ipynb")
