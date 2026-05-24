import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

for idx, val in decoded.items():
    if "character-service" in val or "/character/" in val:
        print(f"[{idx}]: '{val}'")
