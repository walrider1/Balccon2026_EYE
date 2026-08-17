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
$env:CENTRAL_AI_MODEL="gpt-5.6"
node server.js
```

Longer term, create `.env` in the project root:

```env
OPENAI_API_KEY=your_api_key_here
CENTRAL_AI_MODEL=gpt-5.6
```

Windows user env, persists for new terminals:

```powershell
setx OPENAI_API_KEY "your_api_key_here"
setx CENTRAL_AI_MODEL "gpt-5.6"
```

Restart PowerShell and the server after changing env values. Do not commit `.env`.
