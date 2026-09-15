const fs = require('node:fs');
const path = require('node:path');

// Conservative reservations, not a billing ledger. One server per state directory.
// GPT-4.1 mini standard prices verified 2026-09-11: $0.40/$1.60 per million.
// GPT-5.1 standard prices verified 2026-09-15: $1.25/$10 per million.
// https://developers.openai.com/api/docs/models/gpt-5.1
const PRICES = new Map([['gpt-4.1-mini', [0.4, 1.6]], ['gpt-5.1', [1.25, 10]]]);
function createBudget({ limit, file }) {
  let reserved = 0, blocked = false;
  try {
    if (file && fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Number.isSafeInteger(data.reservedMicros) || data.reservedMicros < 0) throw new Error('invalid_budget');
      reserved = data.reservedMicros;
    }
  } catch { blocked = true; }
  const ceiling = Math.floor(Number(limit) * 1e6);
  return {
    reserve(model, body) {
      if (!Number.isSafeInteger(ceiling) || ceiling <= 0 || blocked) throw new Error('budget_storage');
      const prices = PRICES.get(model);
      if (!prices) throw new Error('budget_model');
      // UTF-8 byte count overestimates ordinary text tokens; include framing margin.
      const cost = Math.ceil((Buffer.byteLength(body, 'utf8') + 2048) * prices[0] + 700 * prices[1]);
      if (reserved + cost > ceiling) throw new Error('installation_budget');
      try {
        if (file) {
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file + '.tmp', JSON.stringify({ reservedMicros: reserved + cost }));
          fs.renameSync(file + '.tmp', file);
        }
      } catch { blocked = true; throw new Error('budget_storage'); }
      reserved += cost; // Retain reservations even on timeouts or invalid replies.
    },
    status: () => ({ limitUsd: ceiling / 1e6, reservedUsd: reserved / 1e6, blocked })
  };
}
module.exports = { createBudget };
