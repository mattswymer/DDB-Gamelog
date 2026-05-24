import re

with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# Let's search for the definition of _0x761ef3 or similar patterns
# Look for _0x761ef3 = function or function _0x761ef3
patterns = [
    r"_0x761ef3\s*=\s*function",
    r"function\s+_0x761ef3",
    r"var\s+_0x761ef3"
]

for pat in patterns:
    matches = [m.start() for m in re.finditer(pat, content)]
    print(f"Found {len(matches)} matches for '{pat}':")
    for idx, pos in enumerate(matches):
        start = max(0, pos - 100)
        end = min(len(content), pos + 500)
        print(f"  [{idx+1}] at {pos}: {content[start:end]}")
