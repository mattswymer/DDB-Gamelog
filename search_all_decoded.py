import json
import re

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded_map = json.load(f)

search_terms = ["gamelog", "datapoint", "warhead", "dndbeyond", "wss://", "ws://", "api", "socket", "wss", "ws", "http", "https"]

results = {}
for term in search_terms:
    results[term] = []

for idx, val in decoded_map.items():
    for term in search_terms:
        # Match word boundaries or substring depending on term
        if term in val.lower():
            results[term].append((idx, val))

for term, matches in results.items():
    if matches:
        print(f"\nMatches for '{term}':")
        # Print top 50 matches
        for idx, val in matches[:50]:
            print(f"  [{idx} / {hex(int(idx))}]: '{val}'")
