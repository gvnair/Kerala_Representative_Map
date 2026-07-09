import csv
import json

input_csv = "data/kerala_lsgi/kerala_lsgi_summary_2025.csv"
output_json = "data/kerala_lsgi/kerala_lsgi_summary_2025.json"

lookup = {}

with open(input_csv, newline="", encoding="utf-8-sig") as csvfile:
    reader = csv.DictReader(csvfile)

    for row in reader:
        key = row["sec_kerala_code"].strip()
        lookup[key] = row

with open(output_json, "w", encoding="utf-8") as jsonfile:
    json.dump(lookup, jsonfile, indent=2, ensure_ascii=False)

print(f"Created {output_json}")
