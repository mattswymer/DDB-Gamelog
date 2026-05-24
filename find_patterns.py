import re

with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# Let's find matches for dndbeyond
matches = [m.start() for m in re.finditer(r"dndbeyond\.com", content, re.IGNORECASE)]
print(f"Found {len(matches)} occurrences of dndbeyond.com")
for idx, pos in enumerate(matches[:20]):
    start = max(0, pos - 100)
    end = min(len(content), pos + 100)
    snippet = content[start:end].replace('\n', ' ')
    print(f"Match {idx+1} at {pos}: ... {snippet} ...")

# Let's search for wss or websocket
ws_matches = [m.start() for m in re.finditer(r"wss?://", content, re.IGNORECASE)]
print(f"\nFound {len(ws_matches)} occurrences of wss?://")
for idx, pos in enumerate(ws_matches[:20]):
    start = max(0, pos - 100)
    end = min(len(content), pos + 100)
    snippet = content[start:end].replace('\n', ' ')
    print(f"WS Match {idx+1} at {pos}: ... {snippet} ...")

# Let's search for any external domain/IP or URL
url_matches = [m.start() for m in re.finditer(r"https?://", content, re.IGNORECASE)]
print(f"\nFound {len(url_matches)} occurrences of https?://")
for idx, pos in enumerate(url_matches[:20]):
    start = max(0, pos - 100)
    end = min(len(content), pos + 100)
    snippet = content[start:end].replace('\n', ' ')
    print(f"URL Match {idx+1} at {pos}: ... {snippet} ...")
