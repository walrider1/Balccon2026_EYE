// Read-only diagnostics by default. --live sends one small test message to the configured model.
const { randomUUID } = require('node:crypto');
const base = process.env.EYE_URL || 'http://localhost:5173';
(async () => {
  const status = await fetch(`${base}/api/central/status`).then(r => r.json());
  console.log(JSON.stringify(status, null, 2));
  if (!process.argv.includes('--live')) return;
  if (!status.configured) { console.log('OPENAI_API_KEY is not configured. Add it to the local root .env, then restart the server.'); process.exitCode = 1; return; }
  const session = await fetch(`${base}/api/game`);
  const cookie = session.headers.get('set-cookie').split(';')[0];
  const response = await fetch(`${base}/api/central`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ sessionId: randomUUID(), requestId: 'live-check', kind: 'message', text: 'HRTOK, why should I trust your judgment?', state: { access: 0 } }) });
  const reply = await response.json();
  console.log(JSON.stringify(reply, null, 2));
  if (reply.source !== 'openai') process.exitCode = 1;
})().catch(error => { console.error(`AI check failed: ${error.message}`); process.exitCode = 1; });
