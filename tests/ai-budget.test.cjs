const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createBudget } = require('../terminal-sketch/ai-budget');
const { createCentralService } = require('../terminal-sketch/central-ai');

test('GPT-5.1 conversation reaches provider with budget enabled and reasoning disabled', async () => {
  let request;
  const api = createCentralService({ env: { OPENAI_API_KEY: 'test', CENTRAL_AI_BUDGET_USD: '3' }, budgetFile: null,
    fetch: async (_url, options) => {
      request = JSON.parse(options.body);
      return { ok: true, json: async () => ({ status: 'completed', output_text: JSON.stringify({ message: 'Then check what I said.', intent: 'OBSERVE' }) }) };
    } });
  const reply = await api.reply({ sessionId: 'model_session_12345', requestId: 'one', kind: 'message', text: 'I do not trust you.', state: {} });
  assert.equal(reply.source, 'openai');
  assert.equal(request.model, 'gpt-5.1');
  assert.equal(request.reasoning.effort, 'none');
  const budget = createBudget({ limit: 3, file: null });
  budget.reserve('gpt-5.1', '{}');
  assert.equal(budget.status().reservedUsd, 0.009563);
});

test('budget survives restart and rejects overspend and unknown price models', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eye-budget-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const options = { limit: 0.003, file: path.join(dir, 'budget.json') };
  const first = createBudget(options);
  first.reserve('gpt-4.1-mini', '{}');
  const restored = createBudget(options);
  assert.deepEqual(restored.status(), first.status());
  assert.throws(() => restored.reserve('gpt-4.1-mini', '{}'), /installation_budget/);
  assert.throws(() => restored.reserve('unknown', '{}'), /budget_model/);
});

test('corrupt ledger and unwritable ledger fail closed', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eye-budget-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'budget.json');
  fs.writeFileSync(file, 'broken');
  assert.throws(() => createBudget({ limit: 5, file }).reserve('gpt-4.1-mini', '{}'), /budget_storage/);
  assert.throws(() => createBudget({ limit: 5, file: path.join(file, 'child') }).reserve('gpt-4.1-mini', '{}'), /budget_storage/);
});

test('exhausted installation budget uses local reply without provider call', async () => {
  const api = createCentralService({ env: { OPENAI_API_KEY: 'test', CENTRAL_AI_BUDGET_USD: '0.000001' }, budgetFile: null,
    fetch: () => assert.fail('must not call provider') });
  const result = await api.reply({ sessionId: 'budget_session_12345', requestId: 'one', kind: 'message', text: 'Why should I trust you?', state: {} });
  assert.equal(result.source, 'local');
  assert.equal(result.fallbackReason, 'installation_budget');
});
