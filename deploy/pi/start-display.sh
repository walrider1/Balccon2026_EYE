#!/usr/bin/env bash
set -euo pipefail
# Run as the dedicated desktop user, never root. Same profile for both windows.
[[ $EUID -ne 0 ]] || { echo 'Run as the desktop user.'; exit 1; }
browser="$(command -v chromium || command -v chromium-browser)"
profile="${XDG_CONFIG_HOME:-$HOME/.config}/eye-browser"
for attempt in {1..60}; do
  if curl --fail --silent http://localhost:5173/api/eye >/dev/null; then break; fi
  sleep 1
done
curl --fail --silent http://localhost:5173/api/eye >/dev/null
exec 9>"${XDG_RUNTIME_DIR:?Desktop session required}/eye-display.lock"
flock -n 9 || { echo 'EYE display is already running.'; exit 1; }
# Open the eye first, then terminal so keyboard focus ends on the game.
# Both windows MUST share the profile: /api/eye follows the game session cookie.
"$browser" --user-data-dir="$profile" --no-first-run --noerrdialogs --kiosk --app=http://localhost:5173/eye.html?kiosk=1 &
main_pid=$!
trap 'kill "$main_pid" 2>/dev/null || true' EXIT
trap 'exit 0' TERM INT
sleep 3
"$browser" --user-data-dir="$profile" --no-first-run --noerrdialogs --kiosk --new-window --app=http://localhost:5173/
wait "$main_pid"
# eye-display.service restarts a failed/closed browser process. Individual-window
# closure and physical monitor placement must still pass the target-device test.
