import json
import zipfile

file_path = "user_data/backtest_results/backtest-result-2026-01-24_01-05-13.zip"

with zipfile.ZipFile(file_path, "r") as z:
    json_files = [f for f in z.namelist() if f.endswith(".json") and "_config" not in f]
    with z.open(json_files[0]) as f:
        data = json.load(f)

# Get trades from correct location
strategy_name = list(data["strategy"].keys())[0]
trades = data["strategy"][strategy_name]["trades"]

print(f"✅ TRADES COUNT: {len(trades)}")
print(f"✅ FIRST TRADE KEYS: {list(trades[0].keys())}")
print(f"✅ SAMPLE profit_ratio: {trades[0].get('profit_ratio')}")