import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

# List of hex indices in the WebSocket init block
hex_indices = [
    "0xab9", "0x2926", "0x329e", "0x24e3", "0x1eb9", "0x14b2", "0x1b42", 
    "0x31dc", "0x25b9", "0x109b", "0x3950", "0x36a1", "0x40d8", "0xd72",
    "0x1c58", "0x2bd2"
]

print("Decrypted values for WebSocket init block:")
for h in hex_indices:
    dec_val = int(h, 16)
    val = decoded.get(str(dec_val), "NOT_FOUND")
    print(f"  {h} ({dec_val}): '{val}'")
