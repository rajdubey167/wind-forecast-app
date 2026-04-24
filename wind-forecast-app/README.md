# Wind Power Forecast Challenge

This repository contains the full-stack SWE challenge submission, primarily composed of a **Forecast Monitoring Web Dashboard** and a **Data Analysis Jupyter Notebook**.

## 1. Forecast Monitoring Context
The app visualizes the actual vs forecasted wind generation in the UK for **January 2024**. Using simple controls, users can dynamically select a target time range and adjust the *Forecast Horizon*. A forecast horizon of $H$ hours means the app will only plot the closest valid forecast generated *at least* $H$ hours prior to the generation target time.

### Tech Stack
- Frontend: Next.js (React), Tailwind CSS, shadcn/ui, Recharts.
- Preprocessing & Analysis: Python (pandas, matplotlib, seaborn).
- Data Strategy: BMRS API data for Jan 2024 was fetched and precomputed into a static JSON payload to guarantee high application performance and reliable independent deployment.

## 2. Running the Application

### Running the Web Dashboard
```bash
cd forecast-dashboard
npm install
npm run dev
```
Navigate to `http://localhost:3000` to interact with the dashboard.

## 3. Recent Product Updates

The dashboard and analysis app now include several UX and reliability upgrades:

- **Live vs static data handling**
  - Switching to **Live** resets to the current default live window and fetches fresh data immediately.
  - Stale in-flight responses are ignored to prevent old KPI/chart flashes when switching data sources quickly.
- **Analysis controls**
  - In Analysis (live mode), date selection and refresh are intentionally separated:
    - **Apply Dates** recalculates analysis for the selected date range.
    - **Refresh Live** refreshes the currently applied live range.
- **First-visit guided tour**
  - A step-by-step tour highlights key controls on Dashboard and Analysis.
  - Includes **Next / Back / Skip All Tutorials** and persists completion in browser storage.
  - Tour layout is responsive for desktop and mobile.
- **Chart readability improvements**
  - The scatter correlation stats badge (`R²`, `r`) is moved to a reserved area to avoid overlapping plotted points.

### Running the Analysis Notebook
The `Analysis.ipynb` notebook is in the project root. To run it:
```bash
pip install pandas matplotlib seaborn jupyter
jupyter notebook Analysis.ipynb
```

## 4. Analysis Summary

Wind generation proves to be highly volatile over the analyzed period (January 2024).

1. **Overall Error Metrics:** Looked at MAE, MedAE, and P99 absolute error.
2. **Error Variation by Horizon:** As expected, errors tend to increase as the forecast horizon extends from 0 to 48 hours. Short-term forecasts (e.g., 0-4 hours) are significantly more accurate.
3. **Reliable Wind Power Capacity Recommendation:** 
   Our analysis on the empirical cumulative distribution of actual wind generation showed a large spread between maximum and minimum outputs. 
   - Based on the data, if the grid requires a **95% confidence level** (i.e. we are 95% sure wind will produce at least $X$ MW), we must rely on the **P95 Capacity** metric inside the notebook. 
   - Relying on mean/average wind generation for reliable capacity is risky, as actual generation will fall below this mark approximately 50% of the time. Dependable capacity must inherently be a conservative lower percentile baseline, heavily supplemented by dispatchable generation or storage.
