const test = require('node:test');
const assert = require('node:assert/strict');
const { createCentralService } = require('../terminal-sketch/central-ai');
const { createCharacter, prepareTurn, localReply, allowedFacts } = require('../terminal-sketch/central-character');
const { HrtokClient } = require('../terminal-sketch/central-client');
const sessionId = 'test_session_123456';
const payload = (id, overrides = {}) => ({ sessionId, requestId: String(id), kind: 'message', text: 'Why should I trust you?', state: {}, ...overrides });
const ok = (message = 'I can explain what the record says.') => ({ ok: true, json: async () => ({ status: 'completed', output_text: JSON.stringify({ message, intent: 'OBSERVE' }) }) });

test('offline conversation has stable session relationship, independent players, no forced hostility', async () => {
  const api = createCentralService({ env: {} });
  const first = await api.reply(payload(1, { text: 'Thank you, I understand.' }));
  const repeated = await api.reply(payload(2, { text: 'Thank you, I understand.' }));
  assert.equal(first.source, 'local'); assert.equal(first.fallbackReason, 'not_configured');
  assert.equal(first.relationship.trust, 27); assert.equal(first.relationship.suspicion, 53);
  assert.equal(repeated.trust_delta, 0); assert.equal(repeated.suspicion_delta, 0);
  const other = await api.reply(payload(1, { sessionId: 'another_session_1234', kind: 'opening' }));
  assert.equal(other.relationship.trust, 25);
});

test('opening and idle are local, neutral, and opening is not replayed', async () => {
  const api = createCentralService({ env: { OPENAI_API_KEY: 'test' }, fetch: () => assert.fail('unexpected API call') });
  const opening = await api.reply(payload(1, { kind: 'opening' }));
  assert.equal(opening.trust_delta, 0);
  assert.equal((await api.reply(payload(2, { kind: 'opening' }))).skipped, true);
  assert.equal((await api.reply(payload(3, { kind: 'idle' }))).suspicion_delta, 0);
});

test('failed/duplicate events cannot change relationship', async () => {
  const api = createCentralService({ env: {} });
  assert.equal((await api.reply(payload(1, { kind: 'event', eventKey: 'medical-auth' }))).skipped, true);
  const good = await api.reply(payload(2, { kind: 'event', eventKey: 'medical-auth', state: { access: 1 } }));
  assert.equal(good.relationship.trust, 27);
  assert.equal((await api.reply(payload(3, { kind: 'event', eventKey: 'medical-auth', state: { access: 1 } }))).skipped, true);
});

test('known evidence is gated and duplicate request is idempotent', async () => {
  const c = createCharacter();
  prepareTurn(c, { kind: 'message', text: 'neural upload', state: { access: 0, readFiles: ['/home/operator/command/neural_transfer.txt'] } });
  assert.ok(!allowedFacts(c).some(f => f.id === 'neural'));
  prepareTurn(c, { kind: 'message', text: 'neural upload', state: { access: 2, readFiles: ['/home/operator/command/neural_transfer.txt'] } });
  assert.ok(allowedFacts(c).some(f => f.id === 'neural'));
  const api = createCentralService({ env: {} });
  assert.deepEqual(await api.reply(payload(1)), await api.reply(payload(1)));
});

test('help remains stage appropriate and never gives literal recovery codes', async () => {
  const api = createCentralService({ env: {} });
  for (const [access, expected] of [[0, 'medical'], [1, 'Communications'], [2, 'Cortex'], [3, 'navigation']]) {
    const reply = await api.reply(payload(access + 1, { text: 'help', state: { access, rootRecovered: access === 3 } }));
    assert.match(reply.message, new RegExp(expected, 'i'));
    assert.doesNotMatch(reply.message, /MR-07-0412|F-184-2317|CORTEX-9D3/);
  }
});

test('important statements survive short history and explicit changed position is noticed', async () => {
  const api = createCentralService({ env: {} });
  await api.reply(payload(1, { text: 'I want to return to Earth.' }));
  for (let id = 2; id < 14; id++) await api.reply(payload(id, { text: 'hello' }));
  assert.match((await api.reply(payload(14, { text: 'What did I say?' }))).message, /I want to return to Earth/);
  assert.match((await api.reply(payload(15, { text: 'I choose the Sun.' }))).message, /change your mind/);
});

test('Serbian input receives English replies and preserves relationship', async () => {
  const api = createCentralService({ env: {} });
  const reply = await api.reply(payload(1, { text: 'Hvala, razumem.' }));
  assert.match(reply.message, /We agree on that much/); assert.ok(reply.trust_delta > 0);
  const help = await api.reply(payload(2, { text: 'Šta dalje?' }));
  assert.match(help.message, /medical/i);
});

test('provider uses schema, trusted instructions, bounded memory and no full secret lore', async () => {
  let body;
  const api = createCentralService({ env: { OPENAI_API_KEY: 'test', CENTRAL_AI_MODEL: 'test-model' }, fetch: async (_, options) => { body = JSON.parse(options.body); assert.ok(options.signal); return ok(); } });
  const reply = await api.reply(payload(1));
  assert.equal(reply.source, 'openai');
  assert.equal(body.text.format.strict, true); assert.equal(body.model, 'test-model');
  assert.equal(body.store, false); assert.equal(body.tools, undefined);
  assert.doesNotMatch(body.instructions, /HRTOK caused many deaths directly|The Command continuity record shows/);
  assert.equal(reply.relationship.trust, 25);
  assert.equal(api.status().lastSource, 'openai');
  assert.ok(!JSON.stringify(api.status()).includes('OPENAI_API_KEY'));
});

for (const [label, response] of [
  ['malformed JSON', { output_text: '{broken' }],
  ['untrusted deltas', { output_text: JSON.stringify({ message: 'ok', intent: 'OBSERVE', trust_delta: 999 }) }],
  ['invalid intent', { output_text: JSON.stringify({ message: 'ok', intent: 'SHUTDOWN' }) }],
  ['solution leakage', { output_text: JSON.stringify({ message: 'Use MR-07-0412', intent: 'GUIDE' }) }],
  ['incomplete', { status: 'incomplete', output_text: '{}' }],
  ['refusal', { output: [{ content: [{ type: 'refusal' }] }] }]
]) test(`provider ${label} falls back without applying model actions`, async () => {
  const api = createCentralService({ env: { OPENAI_API_KEY: 'test' }, fetch: async () => ({ ok: true, json: async () => response }) });
  const reply = await api.reply(payload(1));
  assert.equal(reply.source, 'local'); assert.ok(reply.fallbackReason); assert.equal(reply.relationship.trust, 25);
  assert.doesNotMatch(reply.message, /MR-07-0412|\{broken/);
});

for (const [status, reason] of [[401, 'authentication'], [429, 'rate_or_quota'], [404, 'model_unavailable'], [500, 'provider_error']]) test(`provider ${status} has safe diagnostics and cooldown`, async () => {
  let calls = 0;
  const api = createCentralService({ env: { OPENAI_API_KEY: 'test' }, fetch: async () => { calls++; return { ok: false, status }; } });
  assert.equal((await api.reply(payload(1))).fallbackReason, reason);
  assert.equal((await api.reply(payload(2))).fallbackReason, 'provider_cooldown');
  assert.equal(calls, 1);
});

test('timeout falls back even when provider promise never resolves', async () => {
  const api = createCentralService({ env: { OPENAI_API_KEY: 'test' }, timeoutMs: 15, fetch: () => new Promise(() => {}) });
  const reply = await api.reply(payload(1)); assert.equal(reply.fallbackReason, 'timeout');
});

test('session API budget and global budget are enforced', async () => {
  const api = createCentralService({ env: { OPENAI_API_KEY: 'test', CENTRAL_AI_SESSION_CALLS: '1' }, fetch: async () => ok() });
  assert.equal((await api.reply(payload(1))).source, 'openai');
  assert.equal((await api.reply(payload(2))).fallbackReason, 'session_budget');
  const global = createCentralService({ env: { OPENAI_API_KEY: 'test', CENTRAL_AI_CALLS_PER_MINUTE: '1' }, fetch: async () => ok() });
  await global.reply(payload(1));
  assert.equal((await global.reply(payload(2, { sessionId: 'another_session_1234' }))).fallbackReason, 'capacity');
});

test('same session concurrent requests are rejected before memory is changed', async () => {
  let release;
  const api = createCentralService({ env: { OPENAI_API_KEY: 'test' }, fetch: () => new Promise(resolve => { release = resolve; }) });
  const first = api.reply(payload(1));
  await assert.rejects(api.reply(payload(2)), error => error.code === 'session_busy');
  release(ok()); await first;
});

test('invalid input is rejected without reaching provider', async () => {
  const api = createCentralService({ env: {} });
  for (const value of [null, [], {}, payload(1, { text: '' }), payload(1, { text: 'a'.repeat(1201) }), payload(1, { kind: 'shell' })]) {
    await assert.rejects(api.reply(value), error => error.status === 400);
  }
});

test('client serializes requests and preserves session identity', async () => {
  const bodies = []; let release;
  const client = new HrtokClient({ sessionId, fetch: async (_, options) => {
    bodies.push(JSON.parse(options.body));
    if (bodies.length === 1) await new Promise(resolve => { release = resolve; });
    return { ok: true, json: async () => ({ message: 'ok' }) };
  } });
  const first = client.send({ kind: 'opening' }); const second = client.send({ kind: 'message', text: 'hello' });
  assert.equal(bodies.length, 1); release(); await Promise.all([first, second]);
  assert.deepEqual(bodies.map(b => b.requestId), [`${sessionId}_1`, `${sessionId}_2`]); assert.ok(bodies.every(b => b.sessionId === sessionId));
});

test('closing client drops pending and late responses', async () => {
  let release;
  const client = new HrtokClient({ sessionId, fetch: () => new Promise(resolve => { release = resolve; }) });
  const a = client.send({ kind: 'opening' }); const b = client.send({ kind: 'message', text: 'hello' });
  const rejectedA = assert.rejects(a, /session_closed/); const rejectedB = assert.rejects(b, /session_closed/);
  client.close(); release({ ok: true, json: async () => ({ message: 'old response' }) });
  await Promise.all([rejectedA, rejectedB]);
});

test('relationship stays bounded through repeated threats', () => {
  const c = createCharacter();
  for (let i = 0; i < 150; i++) prepareTurn(c, { kind: 'message', text: `I will shut you down ${i}`, state: {} });
  assert.equal(c.trust, 0); assert.equal(c.suspicion, 100); assert.equal(c.fear, 100);
});
