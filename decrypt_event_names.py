import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

hex_indices = [
    "0x30a3", "0x998", "0x4169", "0x1d35", "0x2e8b", "0x23ff"
]

print("Decrypted values for event switch keys:")
for h in hex_indices:
    dec_val = int(h, 16)
    val = decoded.get(str(dec_val), "NOT_FOUND")
    print(f"  {h} ({dec_val}): '{val}'")
