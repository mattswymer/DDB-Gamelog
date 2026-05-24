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

# Search for "0x31dc"
matches = [m.start() for m in re.finditer(r"0x31dc", decoded)]
print(f"Found {len(matches)} occurrences of '0x31dc':")
for idx, p in enumerate(matches):
    print(f"\n--- Occurrence {idx+1} at {p} ---")
    print(decoded[p-300:p+500])
