import re

with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

def decode_escapes(match):
    val = match.group(0)
    try:
        return bytes(val, "utf-8").decode("unicode_escape")
    except Exception:
        return val

decoded = re.sub(r'\\x[0-9a-fA-F]{2}', decode_escapes, content)

# Let's search for "defaults = {" or "defaults: {" or "defaults" assignment
# Since defaults maps to 0x1b0e (6926), let's find all occurrences of 0x1b0e
matches = [m.start() for m in re.finditer(r"0x1b0e", decoded)]
print(f"Found {len(matches)} occurrences of '0x1b0e':")
for idx, p in enumerate(matches):
    print(f"\n--- Occurrence {idx+1} at {p} ---")
    print(decoded[p-200:p+400])
