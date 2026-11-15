#!/usr/bin/env bash
# Adds the security-header include to the LifePlanner HTTPS server block, then
# validates and reloads nginx. Restores the original config if validation fails.
set -euo pipefail
CONF=/etc/nginx/sites-enabled/hilalsay
INC="    include /home/hilal/LifePlanner/deploy/nginx-security-headers.conf;"
[ "$(id -u)" = 0 ] || { echo "run with sudo"; exit 1; }
if grep -qF "nginx-security-headers.conf" "$CONF"; then echo "already applied"; exit 0; fi
cp "$CONF" "$CONF.bak-$(date +%Y%m%d%H%M%S)"
BACKUP=$(ls -t "$CONF".bak-* | head -1)
# Insert after the "client_max_body_size" line inside the lifeplanner server block.
awk -v inc="$INC" '
  /server_name lifeplanner\.hilalsay\.com\.tr;/ { inblk=1 }
  { print }
  inblk && /client_max_body_size/ { print inc; inblk=0 }
' "$BACKUP" > "$CONF"
grep -qF "nginx-security-headers.conf" "$CONF" || { cp "$BACKUP" "$CONF"; echo "insert point not found, nothing changed"; exit 1; }
if nginx -t; then systemctl reload nginx; echo "security headers applied"; else cp "$BACKUP" "$CONF"; echo "nginx -t failed, restored original"; exit 1; fi
