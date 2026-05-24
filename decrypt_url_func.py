import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

hex_indices = [
    "0xfb8", "0x3bf6", "0x25d7", "0x31dc", "0x2ec2", "0xf0a", "0x31d5",
    "0x1041", "0x2c7e", "0x26d0", "0x1eee", "0x3baf"
]

print("Decrypted values for getMainConnectionUrl:")
for h in hex_indices:
    dec_val = int(h, 16)
    val = decoded.get(str(dec_val), "NOT_FOUND")
    print(f"  {h} ({dec_val}): '{val}'")
