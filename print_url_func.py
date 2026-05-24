with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

import re
def decode_escapes(match):
    val = match.group(0)
    try:
        return bytes(val, "utf-8").decode("unicode_escape")
    except Exception:
        return val

decoded = re.sub(r'\\x[0-9a-fA-F]{2}', decode_escapes, content)

print("Printing code around index 501300:")
# Print a wider range to capture the whole function
print(decoded[501100:502500])
