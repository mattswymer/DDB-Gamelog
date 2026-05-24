import re

with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# Search for "2761:" or '"2761":' or similar patterns at the start of a webpack module block
# In webpack, it looks like:
# 2761: ((module, exports, __webpack_require__) => { ... })
# or 0xac9: ...
# Let's search for "2761:" and "0xac9:" or "2761" as a key
patterns = [
    r"\b2761\s*:",
    r"\b0xac9\s*:",
    r"'\b2761'\s*:",
    r"\"\b2761\"\s*:"
]

for pat in patterns:
    matches = [m.start() for m in re.finditer(pat, content)]
    print(f"Found {len(matches)} matches for '{pat}':")
    for idx, pos in enumerate(matches):
        start = max(0, pos - 100)
        end = min(len(content), pos + 2000)
        print(f"  [{idx+1}] at {pos}:")
        print(content[start:end])
