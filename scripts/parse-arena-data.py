#!/usr/bin/env python3
"""Parse real arena data and generate TypeScript mock-data with real Victoria Royals data."""
import csv
import json
import os
from datetime import datetime, timedelta
from collections import defaultdict

DATA_DIR = "/Users/nimbleprofit/Downloads/data from arena - save on foods memorial center"

# --- Parse GameDetails.xlsx ---
import openpyxl
wb = openpyxl.load_workbook(f"{DATA_DIR}/GameDetails.xlsx")
ws = wb.active

games = []
for row in ws.iter_rows(min_row=2, values_only=True):
    _, opponent, day, date_val, puck_drop, note, attendance = row
    if not opponent or not date_val:
        continue
    # Skip repeated header rows (e.g. row 42 for 2025/26 season)
    if isinstance(attendance, str) and not attendance.isdigit():
        continue
    date_str = date_val.strftime("%Y-%m-%d") if hasattr(date_val, 'strftime') else str(date_val)
    puck_time = puck_drop.strftime("%H:%M") if hasattr(puck_drop, 'strftime') else "19:00"
    games.append({
        "id": f"game-{len(games)+1}",
        "opponent": str(opponent),
        "date": date_str,
        "venue": "Save-On-Foods Memorial Centre",
        "expectedAttendance": int(attendance) if attendance else 2500,
        "puckDropTime": puck_time,
        "status": "completed",
        "note": str(note) if note else None
    })

# Pick 6 diverse games for the app (mix of attendance levels)
selected_indices = [0, 4, 6, 10, 14, 33]  # Tri-City opener, Prince Albert, Saskatoon, Seattle, Vancouver, Vancouver(high)
selected_games = [games[i] for i in selected_indices if i < len(games)]
# Re-id them
for i, g in enumerate(selected_games):
    g["id"] = f"game-{i+1}"

# --- Parse transaction CSVs ---
csv_files = sorted([f for f in os.listdir(DATA_DIR) if f.endswith('.csv')])

# Collect all transactions
all_transactions = []
for cf in csv_files:
    with open(f"{DATA_DIR}/{cf}") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            qty = int(row.get("Qty", "0") or "0")
            if qty <= 0:
                continue  # skip refunds
            all_transactions.append({
                "date": row["Date"],
                "time": row["Time"],
                "category": row["Category"],
                "item": row["Item"],
                "qty": qty,
                "price_point": row.get("Price Point Name", ""),
                "location": row["Location"]
            })

print(f"Total transactions: {len(all_transactions)}")

# --- Extract unique locations as stands ---
LOCATIONS = [
    "SOFMC Island Canteen",
    "SOFMC Island Slice",
    "SOFMC Phillips Bar",
    "SOFMC Portable Stations",
    "SOFMC ReMax Fan Deck",
    "SOFMC TacoTacoTaco",
]

# Categorize locations
LOCATION_CATEGORY = {
    "SOFMC Island Canteen": "food",
    "SOFMC Island Slice": "food",
    "SOFMC Phillips Bar": "beer",
    "SOFMC Portable Stations": "beer",
    "SOFMC ReMax Fan Deck": "premium",
    "SOFMC TacoTacoTaco": "food",
}

# Count transactions per location to derive popularity
loc_counts = defaultdict(int)
for tx in all_transactions:
    loc_counts[tx["location"]] += 1

total_tx = sum(loc_counts.values())

# Estimate avg transaction values per location from item prices
# Since we don't have prices in CSV, use reasonable estimates based on category mix
AVG_TX_VALUES = {
    "SOFMC Island Canteen": 11.0,
    "SOFMC Island Slice": 9.50,
    "SOFMC Phillips Bar": 14.50,
    "SOFMC Portable Stations": 12.00,
    "SOFMC ReMax Fan Deck": 16.00,
    "SOFMC TacoTacoTaco": 10.50,
}

stands = []
for i, loc in enumerate(LOCATIONS):
    count = loc_counts.get(loc, 0)
    # Estimate staff: deliberately understaffed to create bottlenecks for demo
    # Real avg tx per game per stand, then staff at ~70% capacity
    avg_tx_per_game = count / max(len(games), 1)
    # Peak bucket is roughly 3x average, so divide by peak-adjusted rate
    peak_demand_per_10min = (avg_tx_per_game / 20) * 2.5  # ~20 buckets, peak is 2.5x avg
    ideal_staff = peak_demand_per_10min / 6  # 6 tx/staff/10min
    staff = max(2, min(8, round(ideal_staff * 0.65)))  # 65% of ideal, capped at 8
    stands.append({
        "id": f"s{i+1}",
        "name": loc.replace("SOFMC ", ""),
        "category": LOCATION_CATEGORY.get(loc, "food"),
        "location": "Save-On-Foods Memorial Centre",
        "staffCount": staff,
        "avgTransactionValue": AVG_TX_VALUES.get(loc, 12.0),
        "serviceRatePerStaff": 6,
    })

# --- Build demand curves per game date ---
# Group transactions by date and 10-min bucket
def time_to_bucket(time_str):
    """Convert HH:MM:SS to 10-min bucket like '19:00'"""
    parts = time_str.split(":")
    h, m = int(parts[0]), int(parts[1])
    m = (m // 10) * 10
    return f"{h:02d}:{m:02d}"

# Build demand data: for each game date, count tx per location per bucket
game_dates = {g["date"] for g in games}
demand_by_date = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

for tx in all_transactions:
    if tx["date"] in game_dates:
        bucket = time_to_bucket(tx["time"])
        demand_by_date[tx["date"]][tx["location"]][bucket] += tx["qty"]

# --- Generate TypeScript output ---
print(f"\nSelected {len(selected_games)} games")
print(f"Found {len(stands)} stands")
for s in stands:
    print(f"  {s['name']}: {loc_counts.get('SOFMC ' + s['name'], 0)} total tx, {s['staffCount']} staff")

# Write JSON files that the app can import
output_dir = "/Users/nimbleprofit/.ssh/vtn/src/lib/data"
os.makedirs(output_dir, exist_ok=True)

with open(f"{output_dir}/games.json", "w") as f:
    json.dump(selected_games, f, indent=2)

with open(f"{output_dir}/stands.json", "w") as f:
    json.dump(stands, f, indent=2)

# Build demand curves for selected games
demand_curves = {}
for game in selected_games:
    game_demand = demand_by_date.get(game["date"], {})
    curves = {}
    for stand in stands:
        full_name = "SOFMC " + stand["name"]
        stand_demand = game_demand.get(full_name, {})
        curves[stand["id"]] = stand_demand
    demand_curves[game["id"]] = curves

with open(f"{output_dir}/demand-curves.json", "w") as f:
    json.dump(demand_curves, f, indent=2)

print(f"\nData written to {output_dir}/")
print("Files: games.json, stands.json, demand-curves.json")
print("\nDemand curve sample (game-1):")
for sid, buckets in list(demand_curves.get("game-1", {}).items())[:3]:
    name = next(s["name"] for s in stands if s["id"] == sid)
    total = sum(buckets.values())
    print(f"  {name}: {total} tx across {len(buckets)} buckets")
