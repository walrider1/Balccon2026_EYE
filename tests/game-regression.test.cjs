const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
test('existing recovery rules, sedation, navigation and reset are preserved', () => {
  const timers = new Map(); let id = 0;
  const context = vm.createContext({ window: { setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: key => timers.delete(key) }, Date });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../terminal-sketch/game-engine.js'), 'utf8'), context);
  const game = new context.window.KosmosGame();
  assert.equal(game.authorize('comms', 'F-184-2317').ok, false);
  assert.equal(game.authorize('medical', 'wrong').ok, false);
  assert.equal(game.authorize('medical', 'MR-07-0412').ok, true);
  assert.equal(game.access, 1);
  assert.equal(game.authorize('comms', 'F-184-2317').ok, true);
  game.startSedation(() => {});
  assert.equal(game.canStartCortex(), true);
  assert.equal(game.recoverRoot().ok, false);
  assert.equal(game.authorize('cortex', game.issueCortexCode()).ok, true);
  assert.equal(game.recoverRoot().ok, true);
  assert.equal(game.sedationEndsAt, null);
  assert.equal(game.canAccessPath('/home/operator/command/navigation'), true);
  game.startMission(() => {}); game.pauseMission(); assert.equal(game.missionPaused, true);
  game.resumeMission(); assert.equal(game.missionPaused, false);
  assert.equal(game.confirmEarthIntercept(), true);
  game.reset(); assert.equal(game.access, 0); assert.equal(game.rootRecovered, false);
});

test('record observation fires only after a successful read and supports command promises', async () => {
  const context = vm.createContext({ window: {}, fetch: async () => ({ ok: true, text: async () => 'record' }) });
  for (const file of ['commands.js', 'command-registry.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../terminal-sketch', file), 'utf8'), context);
  const registry = new context.window.CommandRegistry(context.window.createCommands());
  let observed = 0;
  const ctx = { fs: { resolve: () => ({ path: '/record', node: { type: 'file', url: '/record' } }) }, state: {},
    game: { canAccessPath: () => true, registerFileRead: () => {}, requiredAccess: () => 1 }, print: () => {}, onRecordRead: () => observed++ };
  await registry.execute('cat record', ctx); assert.equal(observed, 1);
  ctx.game.canAccessPath = () => false;
  await registry.execute('cat record', ctx); assert.equal(observed, 1);
});
