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

# Search for "onMessage" definition
# Since it is defined as onMessage(_0x123456) or onMessage: function or similar
matches = [m.start() for m in re.finditer(r"onMessage", decoded)]
print(f"Found {len(matches)} occurrences of 'onMessage':")
for idx, p in enumerate(matches):
    print(f"\n--- Occurrence {idx+1} at {p} ---")
    print(decoded[p-100:p+1200])
