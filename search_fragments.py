import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

# Let's search for fragments of:
# wss://gamelog.datapoint.hu -> d3NzOi8vZ2FtZWxvZy5kYXRhcG9pbnQuaHU=
# wss://ddbgamelog.datapoint.hu -> d3NzOi8vZGRiZ2FtZWxvZy5kYXRhcG9pbnQuaHU=

fragments = ["d3NzOi8", "Z2FtZWxvZy", "ZGRiZ2FtZWxvZy", "kYXRhcG9pbnQ", "Lmh1", "YXBpLmdhbWVsb2c"]

for frag in fragments:
    print(f"\nSearching for fragment '{frag}':")
    found = False
    for idx, val in decoded.items():
        if frag in val:
            print(f"  [{idx}]: '{val}'")
            found = True
    if not found:
        print("  Not found")
