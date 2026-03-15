import json
from datetime import datetime
import os

DATA_DIR = "d:/AI/wind-forecast-app/data"

print("Loading raw data...")
with open(f"{DATA_DIR}/FUELHH_raw.json", "r") as f:
    fuelhh_raw = json.load(f)

with open(f"{DATA_DIR}/WINDFOR_raw.json", "r") as f:
    windfor_raw = json.load(f)

print(f"Loaded {len(fuelhh_raw)} FUELHH records and {len(windfor_raw)} WINDFOR records.")

# 1. Filter and Process FUELHH (Actuals)
actuals = {}
for record in fuelhh_raw:
    if record.get("fuelType") == "WIND" and record.get("dataset") == "FUELHH":
        start_time_str = record.get("startTime")
        generation = record.get("generation")
        if start_time_str is not None and generation is not None:
            actuals[start_time_str] = generation

print(f"Extracted {len(actuals)} WIND actuals.")

# 2. Process WINDFOR (Forecasts)
forecasts = []
for record in windfor_raw:
    if record.get("dataset") == "WINDFOR":
        start_time_str = record.get("startTime")
        publish_time_str = record.get("publishTime")
        generation = record.get("generation")
        
        if start_time_str and publish_time_str and generation is not None:
            start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
            publish_time = datetime.fromisoformat(publish_time_str.replace("Z", "+00:00"))
            
            # Forecast horizon in hours
            horizon_hours = (start_time - publish_time).total_seconds() / 3600.0
            
            forecasts.append({
                "targetTime": start_time_str,
                "publishTime": publish_time_str,
                "horizon": horizon_hours,
                "generation": generation
            })

print(f"Extracted {len(forecasts)} forecasts.")

# Let's save a unified dataset
# We want to be able to query: given a target_time, what is the actual generation?
# And what are the forecasts available for different horizons?

processed = {
    "actuals": actuals, # map of targetTime -> MW
    "forecasts": forecasts # list of forecast objects
}

with open(f"{DATA_DIR}/processed_wind_data.json", "w") as f:
    json.dump(processed, f)

print("Saved processed_wind_data.json!")
