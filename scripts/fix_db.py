import sys

with open(sys.argv[1], 'r') as f:
    content = f.read()

# Fix ALTERs
old1 = '\t\t\t`ALTER TABLE coupons ADD COLUMN user_agent VARCHAR(512)`,\n\t\t}'
new1 = '\t\t\t`ALTER TABLE coupons ADD COLUMN user_agent VARCHAR(512)`,\n\t\t\t`ALTER TABLE users ADD COLUMN username VARCHAR(64)`,\n\t\t\t`ALTER TABLE users ADD COLUMN password_hash VARCHAR(256)`,\n\t\t\t`ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT "user"`,\n\t\t}'

if old1 in content:
    content = content.replace(old1, new1)
    print("ALTERs fixed")
else:
    print("ALTERs not found - checking raw")
    # Check what's actually there
    idx = content.find('user_agent VARCHAR(512)')
    if idx >= 0:
        snippet = content[idx-10:idx+80]
        print(repr(snippet))

# Fix seedAdmin call
old2 = 'log.Println("migrations applied")\n\t\treturn nil'
new2 = 'log.Println("migrations applied")\n\n\t\t// Seed default admin user\n\t\tseedAdmin(db)\n\n\t\treturn nil'

if old2 in content:
    content = content.replace(old2, new2)
    print("seedAdmin call fixed")
else:
    print("seedAdmin call not found - checking raw")
    idx = content.find('migrations applied')
    if idx >= 0:
        snippet = content[idx-5:idx+80]
        print(repr(snippet))

with open(sys.argv[1], 'w') as f:
    f.write(content)
print("Done")
