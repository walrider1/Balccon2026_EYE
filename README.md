# Balccon2026_EYE

Keyboard-only terminal mystery game for BALCCon 2026.

## Run locally

```powershell
node server.js
```

Open `http://localhost:5173` in a browser, then type `start system`.

Keyboard flow:

- `Tab`: switch between KOSMOS and HRTOK channels
- `Ctrl+Left` / `Ctrl+Right`: jump to KOSMOS / HRTOK
- `PageUp` / `PageDown`: scroll the active channel

## AI mode

Optional live AI replies need `OPENAI_API_KEY` before `node server.js`.

Temporary, current PowerShell only:

```powershell
$env:OPENAI_API_KEY="your_api_key_here"
$env:CENTRAL_AI_MODEL="gpt-5.1"
node server.js
```

Longer term, create `.env` in the project root:

```env
OPENAI_API_KEY=your_api_key_here
CENTRAL_AI_MODEL=gpt-5.1
```

Windows user env, persists for new terminals:

```powershell
setx OPENAI_API_KEY "your_api_key_here"
setx CENTRAL_AI_MODEL "gpt-5.1"
```

Restart PowerShell and the server after changing env values. Do not commit `.env`.

## HRTOK conversation update

The existing puzzles, navigation simulation, timers and visual design are preserved.
HRTOK now keeps a separate in-memory relationship and conversation per server game session.
Positive interactions can earn cautious cooperation; threats can increase fear. Dialogue
never changes game permissions, timers, challenge scores or endings.

Evidence is selected from successful record reads and game progress. The full author lore
is no longer sent on every turn. Game progress, archive access and challenge results are now verified by the server.
This does not replace operating-system kiosk setup.

Optional settings (defaults shown):

```dotenv
CENTRAL_AI_TIMEOUT_MS=8000
CENTRAL_AI_SESSION_CALLS=60
CENTRAL_AI_CALLS_PER_MINUTE=20
```

The model identifier remains configurable; the default is `gpt-5.1` with reasoning effort `none`.
Its availability in your API account has not been verified. A missing key, inaccessible model,
timeout, quota/rate error or invalid reply produces an authored local response. Opening,
events, hints and memory recall use local replies without an API call. Request limits bound
call volume; they are not a guaranteed monetary spending cap. No automatic retry is made.

```powershell
node scripts/check-ai.cjs
node scripts/check-ai.cjs --live
node --test tests/*.test.cjs
node scripts/check-http.cjs
```

Start the server first for diagnostics/HTTP checks. `--live` makes one model request;
only `source: "openai"` confirms a live reply. Status reports configuration and safe error
categories, never the API key. AI memory expires after 30 minutes without requests; reload
keeps the game session. Conversation is not persisted across server restarts.

See `AI_IMPLEMENTATION.md` for scope, limitations and the playtest checklist.

## Server-owned game sessions (10 September 2026)

Game permissions, deadlines, Cortex attestation and orbital capture are verified on the local server.
The browser keeps an HttpOnly session cookie; game progress persists in ignored `.runtime/game-sessions.json`.
Reload preserves deadlines. The server listens on loopback only. Run only one server per checkout.
Original medical/comms puzzles, Cortex scoring, orbital physics and CSS are preserved.
New commands: `ctf` (optional 120-second evidence chain), `flag EYE{...}`, progressive `hint`,
and `course sun confirm` (voluntary quarantine after ROOT). `status` shows CTF time.
Developer mode is disabled. The new Cortex code is random and issued after verified responses.

See `GAME_IMPLEMENTATION.md` for verification and remaining deployment work.

## Operator controls

Read `OPERATOR_GUIDE.md` for the three-phase flow, endings, resets and installation checks.
Run `node scripts/setup-admin.cjs` in a local interactive terminal to set your administrator password (hidden input, salted hash; no default password).
Open `/admin.html` on the same localhost host/profile as the game for status, new game, logout and server stop.
The panel does not lock the operating system. `node scripts/preflight.cjs` checks bundled assets.
