import re
import json

with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Parse raw string array elements from _0x2858e2
match = re.search(r'var _0x2858e2=\[(.*?)\];', content)
if not match:
    # Try alternate regex for safety
    match = re.search(r'=\[((?:\'(?:\\x[0-9a-fA-F]{2}|[^\'])*\'|"(?:\\x[0-9a-fA-F]{2}|[^"])*"|,\s*)+)\]', content)

if not match:
    print("Could not find the array _0x2858e2")
    exit(1)

array_content = match.group(1)
elements_raw = re.findall(r"'(?:\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}|\\.|[^'])*'|\"(?:\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}|\\.|[^\"])*\"", array_content)

# Decode hex/unicode escapes in raw strings
strings_list = []
for el in elements_raw:
    val = el[1:-1] # strip quotes
    try:
        decoded_val = bytes(val, "utf-8").decode("unicode_escape")
    except Exception:
        # Fallback if decode fails
        decoded_val = val
    strings_list.append(decoded_val)

print(f"Loaded {len(strings_list)} raw strings.")

# 2. Setup the offset and the getter
# _0xef74a = _0xef74a - 136;
offset = 136

def get_string(idx, current_list):
    arr_idx = idx - offset
    if 0 <= arr_idx < len(current_list):
        return current_list[arr_idx]
    return None

def parse_int_val(s):
    # Python equivalent of parseInt. s is usually a string, e.g. "123" or "0x12"
    if not s:
        return 0
    # Strip any non-digit chars if needed, but usually it's clean
    s = s.strip()
    if s.startswith("0x") or s.startswith("-0x"):
        sign = -1 if s.startswith("-") else 1
        val_str = s.replace("-", "").replace("+", "")
        try:
            return sign * int(val_str, 16)
        except ValueError:
            return 0
    else:
        # standard integer
        # strip trailing letters
        m = re.match(r'^[-+]?\d+', s)
        if m:
            try:
                return int(m.group(0))
            except ValueError:
                return 0
        return 0

# 3. Simulate rotation IIFE
# Rotation target is 829608
target = 829608
current_strings = list(strings_list)
rotated_count = 0
max_rotations = len(strings_list) * 2

print("Simulating rotation...")
success = False
for _ in range(max_rotations):
    try:
        # The rotation condition from JS:
        # -parseInt(a0_0x5b5e(0x3625))/1 +
        # -parseInt(a0_0x5b5e(0x15eb))/2 * (-parseInt(a0_0x5b5e(0x1a52))/3) +
        # -parseInt(a0_0x5b5e(0x1337))/4 +
        # parseInt(a0_0x5b5e(0x1734))/5 * (-parseInt(a0_0x5b5e(0x57d))/6) +
        # parseInt(a0_0x5b5e(0x3658))/7 +
        # -parseInt(a0_0x5b5e(0x351c))/8 +
        # -parseInt(a0_0x5b5e(0x1cb3))/9 * (-parseInt(a0_0x5b5e(0x11d3))/10)
        
        v_3625 = parse_int_val(get_string(0x3625, current_strings))
        v_15eb = parse_int_val(get_string(0x15eb, current_strings))
        v_1a52 = parse_int_val(get_string(0x1a52, current_strings))
        v_1337 = parse_int_val(get_string(0x1337, current_strings))
        v_1734 = parse_int_val(get_string(0x1734, current_strings))
        v_57d  = parse_int_val(get_string(0x57d, current_strings))
        v_3658 = parse_int_val(get_string(0x3658, current_strings))
        v_351c = parse_int_val(get_string(0x351c, current_strings))
        v_1cb3 = parse_int_val(get_string(0x1cb3, current_strings))
        v_11d3 = parse_int_val(get_string(0x11d3, current_strings))
        
        calc = (
            -v_3625 // 1 +
            (-v_15eb // 2) * (-v_1a52 // 3) +
            -v_1337 // 4 +
            (v_1734 // 5) * (-v_57d // 6) +
            v_3658 // 7 +
            -v_351c // 8 +
            (-v_1cb3 // 9) * (-v_11d3 // 10)
        )
        
        # JS uses floating/standard division but matches exact target. Let's do standard division first
        calc_float = (
            -v_3625 / 1.0 +
            (-v_15eb / 2.0) * (-v_1a52 / 3.0) +
            -v_1337 / 4.0 +
            (v_1734 / 5.0) * (-v_57d / 6.0) +
            v_3658 / 7.0 +
            -v_351c / 8.0 +
            (-v_1cb3 / 9.0) * (-v_11d3 / 10.0)
        )
        
        # Check if matches target (allowing minor rounding differences)
        if abs(calc_float - target) < 1.0 or int(calc_float) == target:
            print(f"Matched target {target} after {rotated_count} rotations!")
            success = True
            break
            
    except Exception as e:
        # Ignore errors during parsing (since incorrect rotation returns non-number strings)
        pass
        
    # Rotate array: push(shift())
    first = current_strings.pop(0)
    current_strings.append(first)
    rotated_count += 1

if not success:
    print("Failed to find rotation alignment.")
    exit(1)

# Save the rotated string array as a JSON file
with open("rotated_strings.json", "w", encoding="utf-8") as f:
    json.dump(current_strings, f, indent=2)

# Save a map of decoded strings for all valid indexes
decoded_map = {}
for i in range(len(current_strings) + offset + 100):
    val = get_string(i, current_strings)
    if val is not None:
        decoded_map[i] = val

with open("decoded_strings_python.json", "w", encoding="utf-8") as f:
    json.dump(decoded_map, f, indent=2)

# Print some statistics and look for WSS_URI or endpoints
print(f"Successfully decoded and saved {len(decoded_map)} indices to decoded_strings_python.json")

# Look for specific keys
for idx, val in decoded_map.items():
    if any(k in val for k in ["https://", "http://", "wss://", "ws://", "gamelog", "datapoint", "warhead", "Cobalt"]):
        print(f"  [{idx} / {hex(idx)}]: '{val}'")
