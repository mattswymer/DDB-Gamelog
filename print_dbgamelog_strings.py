import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

print("Strings around index 12959:")
for i in range(12950, 12970):
    val = decoded.get(str(i), "")
    print(f"  [{i}]: '{val}'")
