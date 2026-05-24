import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

for idx in [11750, 12849, 13632, 15298]:
    print(f"\n--- Around {idx} ---")
    for i in range(max(0, idx - 5), min(len(decoded), idx + 6)):
        val = decoded.get(str(i), "")
        print("  [{}]: '{}'".format(i, val))
