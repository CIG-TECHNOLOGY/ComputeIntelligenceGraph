#!/bin/bash
# Patches DATABASE_URL in /opt/monitor/.env to URL-encode the password.
# Runs on the EC2 via SSM. No secrets passed as arguments.
python3 - <<'PYEOF'
import urllib.parse, re

env_path = "/opt/monitor/.env"
with open(env_path) as f:
    env = f.read()

m = re.search(r"POSTGRES_PASSWORD=(.*)", env)
if not m:
    print("ERROR: POSTGRES_PASSWORD not found in .env")
    raise SystemExit(1)

raw_pass = m.group(1).strip()
encoded = urllib.parse.quote(raw_pass, safe="")

env2 = re.sub(
    r"(DATABASE_URL=postgresql://postgres:)[^@]+(@)",
    lambda x: x.group(1) + encoded + x.group(2),
    env
)

with open(env_path, "w") as f:
    f.write(env2)

print("DATABASE_URL patched — password URL-encoded")
PYEOF
