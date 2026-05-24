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

# Search for anything containing ".hu"
hu_matches = [m.start() for m in re.finditer(r"\.hu", decoded, re.IGNORECASE)]
print(f"Found {len(hu_matches)} occurrences of .hu:")
for idx, pos in enumerate(hu_matches):
    start = max(0, pos - 100)
    end = min(len(decoded), pos + 100)
    print(f"  [{idx+1}] at {pos}: {decoded[start:end]}")

# Let's search for anything containing "http" in decoded
http_matches = [m.start() for m in re.finditer(r"https?://", decoded, re.IGNORECASE)]
print(f"\nFound {len(http_matches)} occurrences of http(s):")
for idx, pos in enumerate(http_matches):
    start = max(0, pos - 100)
    end = min(len(decoded), pos + 100)
    print(f"  [{idx+1}] at {pos}: {decoded[start:end]}")
