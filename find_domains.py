import re

with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# Let's decode hex escapes in strings to make searching easier
# Standard javascript-obfuscator uses hex-escaped characters in strings like '\x20', '\x2e', etc.
def decode_escapes(match):
    val = match.group(0)
    try:
        return bytes(val, "utf-8").decode("unicode_escape")
    except Exception:
        return val

# A simple regex to find all hex strings and decode them
decoded_content = re.sub(r'\\x[0-9a-fA-F]{2}', decode_escapes, content)

print("Decoded content length:", len(decoded_content))

# Look for patterns in the decoded content
search_patterns = [
    r"datapoint",
    r"warhead",
    r"dndbeyond",
    r"game-log",
    r"gamelog",
    r"ws://",
    r"wss://",
    r"http://",
    r"https://",
    r"socket",
    r"cobalt"
]

for pat in search_patterns:
    matches = [m.start() for m in re.finditer(pat, decoded_content, re.IGNORECASE)]
    print(f"Found {len(matches)} matches for '{pat}':")
    for idx, pos in enumerate(matches[:10]):
        start = max(0, pos - 80)
        end = min(len(decoded_content), pos + 80)
        snippet = decoded_content[start:end].replace('\n', ' ')
        print(f"  [{idx+1}] at {pos}: ... {snippet} ...")
