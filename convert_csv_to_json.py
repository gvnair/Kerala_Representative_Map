import csv
import json
from pathlib import Path

# Project root
root = Path("data")

# Find every CSV under /data
csv_files = list(root.rglob("*.csv"))

print(f"Found {len(csv_files)} CSV files.\n")

for csv_file in csv_files:

    json_file = csv_file.with_suffix(".json")

    with open(csv_file, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        rows = list(reader)

    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)

    print(f"✓ {csv_file}  →  {json_file}")

print("\nFinished.")