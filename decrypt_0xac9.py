import json

with open("decoded_strings_python.json", "r", encoding="utf-8") as f:
    decoded = json.load(f)

# Decrypt 0x15db
dec_val = int("0x15db", 16)
val = decoded.get(str(dec_val), "NOT_FOUND")
print(f"0x15db ({dec_val}): '{val}'")
