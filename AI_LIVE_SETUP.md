# Live AI setup — 2026-09-11

The local installation uses `gpt-4.1-mini` through the Responses API. Four live messages succeeded, including a three-message Serbian conversation. All 58 automated tests passed after the budget change. These are smoke tests, not a full character-quality evaluation or a 72-hour endurance test.

The API key belongs only in the ignored root `.env`. Rotate any key shared in chat. Restart `node server.js` after changing configuration. Verify with `node scripts/check-ai.cjs --live` (one paid request); success requires `source: openai`.

Current local settings: 60 calls per player session, 20 calls per minute across this process, 8-second timeout, and `CENTRAL_AI_BUDGET_USD=3`. Idle atmosphere and hints remain local and do not make API requests.

The installation budget conservatively reserves estimated cost before each provider attempt. Reservations include a UTF-8 byte estimate plus framing allowance and the full 700 output-token allowance. It uses GPT-4.1 mini standard prices checked on 2026-09-11: $0.40 input / $1.60 output per million tokens. Reservations are deliberately not refunded on errors or timeouts. This is not actual billed usage, and is not an account-wide spending guarantee.

The ledger lives in `.runtime/ai-budget.json` (or `EYE_STATE_DIR`). Keep this file across game resets and server restarts; deleting it resets the budget. Run one server per state directory. Multiple installations, other uses of the key, taxes, and provider price changes are outside this limiter. A missing price mapping, invalid budget, corrupt ledger, or failed write blocks paid calls and uses local dialogue. Reaching the limit also uses local dialogue without stopping the game. Changing model requires a reviewed price mapping.

For a three-day event, actual cost depends on the number and length of conversations. Remaining API credit alone does not establish that live responses will last 72 hours. Check OpenAI Billing for actual charges and `/api/central/status` for reserved budget and provider health.

Official model/pricing reference: https://developers.openai.com/api/docs/models/gpt-4.1-mini
