import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

for idx, val in decoded.items():
    if "ddb" in val.lower():
        print(f"[{idx}]: '{val}'")
