import re
import subprocess
import json

with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# We need to extract the parts at the beginning of the file.
# Specifically, we want:
# 1. function a0_0x36bc() { ... }
# 2. function a0_0x5b5e(...) { ... }
# 3. (function(_0x41afad,_0x5163a6){ ... }(a0_0x36bc, ...))

# Let's search for these definitions.
# Let's find the start of the IIFE rotator, which is (function(_0x41afad,_0x5163a6)
rotator_start = content.find("(function(_0x41afad,_0x5163a6)")
if rotator_start == -1:
    print("Could not find rotator IIFE start")
    exit(1)

# Find the end of the rotator IIFE, which is the matching parenthesis.
# Let's scan from rotator_start until we find the closing );
rotator_end = content.find("),((()=>", rotator_start)
if rotator_end == -1:
    # Try finding the end of the IIFE loop: we can look for the closing parenthesis of the IIFE call
    rotator_end = content.find("}(a0_0x36bc,", rotator_start)
    if rotator_end != -1:
        # Find closing paren
        close_paren = content.find(")", rotator_end)
        rotator_end = close_paren + 1

if rotator_end == -1:
    print("Could not find rotator IIFE end")
    exit(1)

print(f"Rotator found from {rotator_start} to {rotator_end}")

# The array definition and getter are before the rotator.
header_code = content[0:rotator_end]

# Let's append code to expose the getter function globally or return all decoded strings.
# Since we know the getter function is a0_0x5b5e, we can call it.
# What are the bounds of the array? It has parsed 16749 elements.
# Let's write a JS loop that calls a0_0x5b5e for all valid offsets.
# The offset in a0_0x5b5e is: _0xef74a = _0xef74a - (some expression).
# We can find the range of valid indices. Let's just try calling a0_0x5b5e from 0x0 to 0x6000.
js_injector = """
const decoded_strings = {};
// We want to find the valid range of index arguments for a0_0x5b5e
// Since a0_0x5b5e is: a0_0x5b5e(idx, unused)
// Let's run from 0 to 25000 and try to call it.
for (let i = 0; i < 30000; i++) {
    try {
        const val = a0_0x5b5e(i);
        if (val !== undefined && val !== null) {
            decoded_strings[i] = val;
        }
    } catch (e) {
        // ignore
    }
}
console.log(JSON.stringify(decoded_strings, null, 2));
"""

full_js_code = header_code + ";\n" + js_injector

with open("temp_decoder.js", "w", encoding="utf-8") as f:
    f.write(full_js_code)

print("Wrote temp_decoder.js. Now running it in Node.js...")
result = subprocess.run(["node", "temp_decoder.js"], capture_output=True, text=True, encoding="utf-8")
if result.returncode != 0:
    print("Node.js execution failed!")
    print("Stderr:", result.stderr)
else:
    print("Node.js execution completed successfully.")
    # Parse output as JSON
    try:
        decoded_map = json.loads(result.stdout)
        print(f"Decoded {len(decoded_map)} unique string values.")
        with open("decoded_strings_map.json", "w", encoding="utf-8") as out:
            json.dump(decoded_map, out, indent=2)
        print("Saved map to decoded_strings_map.json")
        
        # Look for interesting strings
        interesting = []
        for idx, val in decoded_map.items():
            if any(k in val for k in ["https://", "http://", "wss://", "ws://", "gamelog", "datapoint", "warhead", "Cobalt"]):
                interesting.append((idx, val))
        
        print("\nInteresting decoded strings:")
        for idx, val in interesting:
            print(f"  [{idx} / {hex(int(idx))}]: '{val}'")
            
    except Exception as e:
        print("Failed to parse output as JSON:", e)
        print("Stdout snippet:", result.stdout[:1000])
