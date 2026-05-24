import re
import json

with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# Find the string array _0x2858e2
# It starts with: function a0_0x36bc(){var _0x2858e2=[...];
# Let's extract the array elements.
match = re.search(r'var _0x2858e2=\[(.*?)\];', content)
if not match:
    print("Could not find _0x2858e2 array")
    # Maybe it's named differently or formatted differently. Let's look for a large array.
    match = re.search(r'=\[((?:\'(?:\\x[0-9a-fA-F]{2}|[^\'])*\'|"(?:\\x[0-9a-fA-F]{2}|[^"])*"|,\s*)+)\]', content)

if match:
    array_content = match.group(1)
    # Parse elements. Since they are standard JS strings separated by commas, let's use regex or split.
    elements = re.findall(r"'(?:\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}|\\.|[^'])*'|\"(?:\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}|\\.|[^\"])*\"", array_content)
    print(f"Parsed {len(elements)} elements from the array")
    
    # Let's decode them
    decoded_elements = []
    for el in elements:
        # Strip quotes
        val = el[1:-1]
        # Decode hex escapes
        try:
            decoded_val = bytes(val, "utf-8").decode("unicode_escape")
        except Exception:
            decoded_val = val
        decoded_elements.append(decoded_val)
    
    # Save them to a file for easier analysis
    with open("parsed_strings.json", "w", encoding="utf-8") as out:
        json.dump(decoded_elements, out, indent=2)
    print("Saved decoded elements to parsed_strings.json")
    
    # Print interesting ones
    interesting_patterns = [
        r"http", r"ws", r"api", r"warhead", r"dnd", r"beyond", r"gamelog", r"cobalt", r"\.hu", r"\.com", r"\.net", r"\.org"
    ]
    print("\nInteresting strings in the array:")
    seen = set()
    for el in decoded_elements:
        for pat in interesting_patterns:
            if re.search(pat, el, re.IGNORECASE) and el not in seen:
                seen.add(el)
                print(f"  - {el}")
else:
    print("No array match found")
