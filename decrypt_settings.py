import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

hex_indices = [
    "0x3637", "0x2e23", "0x1a08", "0x2563", "0x37ce", "0x379f",
    "0xa64", "0x9f3", "0x2e58"
]

print("Decrypted values for settings registration:")
for h in hex_indices:
    dec_val = int(h, 16)
    val = decoded.get(str(dec_val), "NOT_FOUND")
    print(f"  {h} ({dec_val}): '{val}'")
