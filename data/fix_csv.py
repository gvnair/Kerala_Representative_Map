
import pandas as pd

df = pd.read_csv("lsgi_kerala2026.csv")
lookup = pd.read_csv("party_lookup.csv")

merged = df.merge(
    lookup,
    left_on="winning_party,      # your column
    right_on="winning_party",
    how="left"
)

merged.to_csv("enriched_data.csv", index=False)