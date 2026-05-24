import re

with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# Search for d3NzOi8 in raw content
matches = [m.start() for m in re.finditer(r"d3NzOi8", content)]
print(f"Found {len(matches)} occurrences of d3NzOi8 in raw code:")
for idx, pos in enumerate(matches):
    start = max(0, pos - 100)
    end = min(len(content), pos + 500)
    print(f"\n--- Occurrence {idx+1} at {pos} ---")
    print(content[start:end])
