import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

for word in ["settings", "register", "default", "url"]:
    print(f"\nMatches for '{word}':")
    for idx, val in decoded.items():
        if word in val.lower():
            print(f"  [{idx}]: '{val}'")
