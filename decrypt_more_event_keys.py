import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

hex_indices = [
    "0x3cc", "0x3c95", "0x412f", "0x25a3", "0x67d", "0x33c4",
    "0x38d0", "0x37ef", "0x24ff", "0x1393", "0x3f08", "0x2161",
    "0x3671", "0x157c", "0x35bd", "0xbae", "0x3e18", "0x14b1",
    "0xb72", "0x10d9", "0x74e"
]

print("Decrypted values for onMessage switch keys and functions:")
for h in hex_indices:
    dec_val = int(h, 16)
    val = decoded.get(str(dec_val), "NOT_FOUND")
    print(f"  {h} ({dec_val}): '{val}'")
