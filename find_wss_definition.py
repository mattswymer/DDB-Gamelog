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

# Search for any occurrences of "WSS_URI" in decoded content
matches = [m.start() for m in re.finditer(r"WSS_URI", decoded)]
print(f"Found {len(matches)} occurrences of WSS_URI in decoded code:")
for idx, pos in enumerate(matches):
    start = max(0, pos - 500)
    end = min(len(decoded), pos + 500)
    print(f"\n--- Occurrence {idx+1} at {pos} ---")
    print(decoded[start:end])
