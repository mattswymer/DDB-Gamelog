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

# Search for the string 'getMainConnectionUrl' in decoded content
# Wait, it might be defined as an object key:
# "getMainConnectionUrl": ... or getMainConnectionUrl() ... or similar
pos = decoded.find("getMainConnectionUrl")
if pos != -1:
    print(f"Found getMainConnectionUrl at index {pos}:")
    start = max(0, pos - 100)
    end = min(len(decoded), pos + 1000)
    print(decoded[start:end])
else:
    print("Could not find literal 'getMainConnectionUrl' in decoded code.")
    # Let's search for the hex values 0x25b9 and 0x109b in proximity in the original file
    # Or in the decoded file, search for _0xXXXXXX(0x25b9)+_0xYYYYYY(0x109b)
    # Let's search for '0x25b9' in decoded
    matches = [m.start() for m in re.finditer(r"0x25b9", decoded)]
    print(f"Found {len(matches)} occurrences of '0x25b9':")
    for idx, p in enumerate(matches):
        print(f"  [{idx+1}] at {p}: {decoded[p-100:p+200]}")
