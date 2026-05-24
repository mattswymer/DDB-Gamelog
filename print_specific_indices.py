import json
import base64

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

print("Strings around index 3267:")
for i in range(3260, 3276):
    val = decoded.get(str(i), "")
    print(f"  [{i}]: '{val}'")

# Let's concatenate these strings and see if they form a base64 string we can decode!
# Let's see if there is any obvious base64-like string here.
# For example, look at 3267: '":"d3NzOi8'
# Let's print out what is there.
# Let's search for "d3NzOi8" in any string in decoded
for idx, val in decoded.items():
    if "d3NzOi8" in val:
        print(f"\nFound 'd3NzOi8' at index {idx}: '{val}'")
        # Let's try to extract base64-like parts and decode them
        # Let's search for anything starting with d3NzOi8 and ending with Ukk= or similar,
        # or just try decoding the string itself or concatenating next strings.
        # Wait! What if it's 'd3NzOi8v' followed by other strings?
        # Let's see: _0x1234(0x3267) might return '":"d3NzOi8...'
        # Actually, let's print indices 3260 to 3280.
