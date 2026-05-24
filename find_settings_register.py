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

# Search for "settings.register"
matches = [m.start() for m in re.finditer(r"settings\.register", decoded, re.IGNORECASE)]
print(f"Found {len(matches)} matches for 'settings.register':")
for idx, pos in enumerate(matches):
    start = max(0, pos - 100)
    end = min(len(decoded), pos + 800)
    print(f"\n--- Register {idx+1} at {pos} ---")
    print(decoded[start:end])
