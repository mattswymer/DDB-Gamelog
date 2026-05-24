import json

with open("parsed_strings.json", "r", encoding="utf-8") as f:
    strings = json.load(f)

for idx, val in enumerate(strings):
    if "WSS_URI" in val:
        print(f"Found WSS_URI at index {idx}: '{val}'")
        # Print surrounding strings
        start = max(0, idx - 10)
        end = min(len(strings), idx + 10)
        print("Surrounding strings:")
        for i in range(start, end):
            prefix = "--> " if i == idx else "    "
            print(f"{prefix}[{i}]: '{strings[i]}'")

print("\nLet's search for some other server URLs or endpoints:")
for idx, val in enumerate(strings):
    if val.startswith("https://") or val.startswith("http://") or val.startswith("wss://") or val.startswith("ws://"):
        print(f"[{idx}]: '{val}'")
        # Print surrounding
        start = max(0, idx - 3)
        end = min(len(strings), idx + 3)
        print("  Surrounding:")
        for i in range(start, end):
            print(f"    [{i}]: '{strings[i]}'")
