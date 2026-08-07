with open('/Users/lucien-air/.loop/agents/agt_g1t680o3mqw8la/beerfest-api/internal/repository/db.go', 'r') as f:
    lines = f.readlines()

# Insert ALTERs after line 114 (index 113, 0-based): add 3 new alter lines
new_alters = [
    '\t\t\t`ALTER TABLE users ADD COLUMN username VARCHAR(64)`,\n',
    '\t\t\t`ALTER TABLE users ADD COLUMN password_hash VARCHAR(256)`,\n',
    '\t\t\t`ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT \'user\'`,\n',
]
# Line 114 is index 113 (the user_agent alter line), insert after it
for i, line in enumerate(reversed(new_alters)):
    lines.insert(114, line)

print("ALTERs inserted after line 114")

# Insert seedAdmin call before "return nil" in the Migrate function
# Find the return nil just after "migrations applied"
for i, line in enumerate(lines):
    if line.strip() == 'log.Println("migrations applied")':
        # Insert seedAdmin call before the next return nil
        j = i + 1
        while j < len(lines) and 'return nil' not in lines[j]:
            j += 1
        if j < len(lines):
            lines.insert(j, '\t\t// Seed default admin user\n')
            lines.insert(j+1, '\t\tseedAdmin(db)\n')
            lines.insert(j+2, '\n')
            print(f"seedAdmin call inserted at line {j}")
        break

with open('/Users/lucien-air/.loop/agents/agt_g1t680o3mqw8la/beerfest-api/internal/repository/db.go', 'w') as f:
    f.writelines(lines)

print("Done")
