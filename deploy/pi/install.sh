#!/usr/bin/env bash
set -euo pipefail
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ "${1:-}" != '--apply' ]]; then
  printf '%s\n' 'Preparation only. On the Pi: sudo bash deploy/pi/install.sh --apply' 'Installs /opt/eye, /var/lib/eye, /etc/eye.env and eye.service. Does not enable desktop autologin.'
  exit 0
fi
[[ $EUID -eq 0 ]] || { echo 'Run with sudo on the target Pi.'; exit 1; }
[[ -x /usr/bin/node ]] || { echo 'Install Node.js 22+ at /usr/bin/node first.'; exit 1; }
/usr/bin/node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)'
command -v rsync >/dev/null
[[ "$root_dir" != /opt/eye ]] || { echo 'Run installer from an unpacked release outside /opt/eye.'; exit 1; }
[[ ! -e /opt/eye ]] || { echo '/opt/eye exists. Stop service and back up the installation before upgrading.'; exit 1; }
id eye-server >/dev/null 2>&1 || useradd --system --home-dir /var/lib/eye --shell /usr/sbin/nologin eye-server
install -d -o root -g root -m 755 /opt/eye
rsync -r --exclude='.env*' --exclude='.runtime' --exclude='.git' --exclude='node_modules' "$root_dir/" /opt/eye/
chown -R root:root /opt/eye
chmod -R a+rX,go-w /opt/eye
install -d -o eye-server -g eye-server -m 700 /var/lib/eye
if [[ ! -e /etc/eye.env ]]; then
  install -o root -g root -m 600 "$root_dir/.env.example" /etc/eye.env
fi
install -o root -g root -m 644 "$root_dir/deploy/pi/eye.service" /etc/systemd/system/eye.service
systemctl daemon-reload
printf '%s\n' 'Installed, not started.' 'Set API key locally: sudoedit /etc/eye.env' 'Set admin password: sudo -u eye-server env EYE_STATE_DIR=/var/lib/eye /usr/bin/node /opt/eye/scripts/setup-admin.cjs' 'Then: sudo systemctl enable --now eye.service'
