import re
import json

with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

def decode_escapes(match):
    val = match.group(0)
    try:
        return bytes(val, "utf-8").decode("unicode_escape")
    except Exception:
        return val

decoded = re.sub(r'\\x[0-9a-fA-F]{2}', decode_escapes, content)

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    strings_map = json.load(f)

# Find the definition of 'Vmomg' at index around 282800
pos = decoded.find("'Vmomg':", 280000)
if pos == -1:
    pos = decoded.find('"Vmomg":', 280000)

if pos == -1:
    print("Could not find Vmomg definition in decoded code.")
    exit(1)

print(f"Found Vmomg definition at {pos}")

# Let's extract the string concatenation that follows
# It looks like: _0x52760a(0xXXXX) + _0x52760a(0xYYYY) + ...
# Let's read until we find the end of the property definition (usually ending in , or })
# Let's get a large chunk of text after the colon
chunk = decoded[pos:pos+8000]

# Let's extract all calls of the pattern _0x[a-f0-9]+(0x[a-f0-9]+)
matches = re.findall(r'_0x[a-f0-9]+\((0x[a-f0-9]+)\)', chunk)
print(f"Extracted {len(matches)} hex indexes.")

decrypted_pieces = []
for h in matches:
    dec_val = int(h, 16)
    val = strings_map.get(str(dec_val), None)
    if val is None:
        print(f"  Warning: Index {h} ({dec_val}) not found in map!")
        val = f"[NOT_FOUND_{h}]"
    decrypted_pieces.append(val)

full_string = "".join(decrypted_pieces)
print("\nFull Decrypted Vmomg String:")
print(full_string)

# Try parsing it as JSON if it looks like JSON
try:
    parsed_json = json.loads(full_string)
    print("\nParsed JSON successfully:")
    print(json.dumps(parsed_json, indent=2))
except Exception as e:
    print("\nFailed to parse as JSON:", e)
