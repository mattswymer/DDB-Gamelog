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

# Search for "onClientCharacterUpdate"
pos = decoded.find("onClientCharacterUpdate")
if pos != -1:
    print(f"Found literal onClientCharacterUpdate at {pos}:")
    print(decoded[pos-100:pos+2000])
else:
    print("Could not find literal 'onClientCharacterUpdate'. searching for hex codes...")
    # It is call/definition of key 0xb72 + 0x10d9 + 0x74e
    # Let's search for 0xb72 in decoded
    matches = [m.start() for m in re.finditer(r"0xb72", decoded)]
    print(f"Found {len(matches)} occurrences of '0xb72':")
    for idx, p in enumerate(matches):
        print(f"  [{idx+1}] at {p}: {decoded[p-100:p+500]}")
