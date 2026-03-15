"""
Corrected BMRS data download script.
- FUELHH: Uses settlementDateFrom/To (correct historical API)
- WINDFOR: Uses publishTimeFrom/To (stream endpoint)
"""
import urllib.request
import urllib.parse
import json
import os
from datetime import datetime, timedelta

DATA_DIR = "d:/AI/wind-forecast-app/data"
os.makedirs(DATA_DIR, exist_ok=True)

def fetch_fuelhh_wind(start_date, end_date):
    """Fetch FUELHH WIND data using the settlement date range."""
    all_data = []
    current = start_date
    while current < end_date:
        next_batch = min(current + timedelta(days=3), end_date)
        params = {
            "settlementDateFrom": current.strftime("%Y-%m-%d"),
            "settlementDateTo": (next_batch - timedelta(days=1)).strftime("%Y-%m-%d"),
            "fuelType": "WIND",
            "format": "json"
        }
        url = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH?" + urllib.parse.urlencode(params)
        print(f"Fetching FUELHH WIND {params['settlementDateFrom']} to {params['settlementDateTo']}...")
        try:
            req = urllib.request.Request(url, headers={'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read()
                data = json.loads(raw)
                items = data.get("data", data) if isinstance(data, dict) else data
                all_data.extend(items)
                print(f"  -> Got {len(items)} records")
        except Exception as e:
            print(f"  Error: {e}")
        current = next_batch

    with open(f"{DATA_DIR}/FUELHH_raw.json", "w") as f:
        json.dump(all_data, f)
    print(f"Saved {len(all_data)} total FUELHH WIND records.")
    return all_data

def fetch_windfor(start_date, end_date):
    """Fetch WINDFOR data using the non-stream paginated endpoint with publishDateTimeFrom/To."""
    all_data = []
    current = start_date
    while current < end_date:
        next_batch = min(current + timedelta(days=2), end_date)
        params = {
            "publishDateTimeFrom": current.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "publishDateTimeTo": next_batch.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "format": "json"
        }
        url = "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR?" + urllib.parse.urlencode(params)
        print(f"Fetching WINDFOR {current.strftime('%Y-%m-%d')} to {next_batch.strftime('%Y-%m-%d')}...")
        try:
            req = urllib.request.Request(url, headers={'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                items = data.get("data", data) if isinstance(data, dict) else data
                all_data.extend(items)
                print(f"  -> Got {len(items)} records")
        except Exception as e:
            print(f"  Error: {e}")
        current = next_batch

    with open(f"{DATA_DIR}/WINDFOR_raw.json", "w") as f:
        json.dump(all_data, f)
    print(f"Saved {len(all_data)} total WINDFOR records.")
    return all_data

if __name__ == "__main__":
    start = datetime(2024, 1, 1)
    end = datetime(2024, 2, 1)

    fetch_fuelhh_wind(start, end)
    fetch_windfor(start, end)
    print("All done! Run process_data.py next.")
