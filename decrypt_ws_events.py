import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

hex_indices = [
    "0x14a0", "0x187d", "0xd23", "0x22db", "0x3f78", "0x3c4b"
]

print("Decrypted values for WebSocket event listeners:")
for h in hex_indices:
    dec_val = int(h, 16)
    val = decoded.get(str(dec_val), "NOT_FOUND")
    print(f"  {h} ({dec_val}): '{val}'")
