from pathlib import Path
import csv
import json

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ROOT = PROJECT_ROOT / "data"


def csv_to_json(csv_path):
    """
    Convert CSV to JSON array.
    """

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    json_path = csv_path.with_suffix(".json")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)

    print(f"✓ {csv_path.name}")


def csv_to_lookup(csv_path, key):

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        lookup = {}

        for row in reader:

            lookup[row[key]] = row

    json_path = csv_path.with_name(
        csv_path.stem + "_lookup.json"
    )

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(lookup, f, indent=2, ensure_ascii=False)

    print(f"✓ {json_path.name}")


print("\nConverting CSV files...\n")

for csv_file in ROOT.rglob("*.csv"):

    csv_to_json(csv_file)

print("\nBuilding lookup tables...\n")

csv_to_lookup(
    ROOT /
    "kerala_lsgi" /
    "kerala_lsgi_summary_2025.csv",
    "sec_kerala_code"
)

print("\nFinished.\n")

print("Project root:", PROJECT_ROOT)
print("Data folder :", ROOT)