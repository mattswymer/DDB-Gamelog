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

# Let's search for "new WebSocket"
ws_init_matches = [m.start() for m in re.finditer(r"new\s+WebSocket", decoded, re.IGNORECASE)]
print(f"Found {len(ws_init_matches)} matches for 'new WebSocket':")
for idx, pos in enumerate(ws_init_matches):
    start = max(0, pos - 500)
    end = min(len(decoded), pos + 500)
    print(f"\n--- Match {idx+1} at {pos} ---")
    print(decoded[start:end])

# Also search for 'datapoint' and 'warhead' specifically in decoded content
for keyword in ["datapoint", "warhead", "dndbeyond", "game-log-rest"]:
    matches = [m.start() for m in re.finditer(keyword, decoded, re.IGNORECASE)]
    print(f"\nFound {len(matches)} matches for '{keyword}':")
    for idx, pos in enumerate(matches):
        start = max(0, pos - 150)
        end = min(len(decoded), pos + 150)
        print(f"  [{idx+1}] at {pos}: {decoded[start:end]}")
