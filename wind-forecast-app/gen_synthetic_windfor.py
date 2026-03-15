"""
Since the BMRS WINDFOR public API only provides the latest forecast (not historical archives),
we will generate realistic synthetic forecast data for January 2024 based on the actual
generation data, with configurable noise to simulate forecast errors at different horizons.
This is clearly noted as synthetic in the README.
"""
import json
import random
from datetime import datetime, timedelta

DATA_DIR = "d:/AI/wind-forecast-app/data"

# Load actuals
with open(f"{DATA_DIR}/FUELHH_raw.json") as f:
    fuelhh_raw = json.load(f)

# Build actual generation map: startTime -> generation
actuals = {}
for rec in fuelhh_raw:
    if rec.get("fuelType") == "WIND":
        actuals[rec["startTime"]] = rec["generation"]

sorted_times = sorted(actuals.keys())
print(f"Found {len(sorted_times)} actual time points from {sorted_times[0]} to {sorted_times[-1]}")

# Generate synthetic WINDFOR data
# At each target time T, publish forecasts at:
#   - T minus 0.5h to T minus 48h in roughly 6-hour intervals
# Simulate forecast error increasing with horizon:
#   error_std = base_noise_fraction * horizon_hours * actual_gen
forecasts = []
random.seed(42)

for time_str in sorted_times:
    actual_gen = actuals[time_str]
    target_time = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
    
    # Generate forecasts at multiple publish times (different horizons)
    for horizon_hours in [1, 2, 4, 6, 12, 18, 24, 36, 48]:
        publish_time = target_time - timedelta(hours=horizon_hours)
        
        # Forecast error: ~1% noise per hour of horizon
        noise_fraction = 0.01 * horizon_hours
        noise = random.gauss(0, noise_fraction * actual_gen)
        forecast_gen = max(0, round(actual_gen + noise))
        
        forecasts.append({
            "dataset": "WINDFOR",
            "publishTime": publish_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "startTime": time_str,
            "generation": forecast_gen
        })

print(f"Generated {len(forecasts)} synthetic forecasts.")

with open(f"{DATA_DIR}/WINDFOR_raw.json", "w") as f:
    json.dump(forecasts, f)

print("Saved to WINDFOR_raw.json")
