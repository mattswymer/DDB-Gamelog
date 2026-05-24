with open("ddb-game-log/dist/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# Let's search for "return _0x2858e2;" or "return _0x2858e2}"
# which usually appears at the end of the string array function.
pos = content.find("return _0x2858e2")
if pos != -1:
    print(f"Found return _0x2858e2 at {pos}")
    print(content[pos:pos+2000])
else:
    print("Could not find return _0x2858e2")
