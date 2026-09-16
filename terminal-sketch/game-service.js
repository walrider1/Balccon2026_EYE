const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { KosmosGame } = require('./game-engine');
const { createPlannerPhysics } = require('./planner-physics');
const { variants, replay } = require('./replay');

class GameError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const CTF_FILES = ['/home/operator/comms/forensic_fragment.txt', '/home/operator/engineering/forensic_fragment.txt', '/home/operator/command/forensic_fragment.txt'];
const CTF_FLAG = 'EYE{SIGNAL_WITNESS_CONTINUITY}';
const savedFields = ['sessionNumber', 'access', 'rootRecovered', 'ending', 'neuralTransferDiscovered', 'sedationEndsAt',
  'missionDuration', 'missionEndsAt', 'missionRemaining', 'missionPaused', 'missionResolved', 'course',
  'cortexCodeIssued', 'cortexCodeAuthorized', 'rootShares', 'cortexCode'];

function createGameService({ now = Date.now, storage = null } = {}) {
  const sessions = new Map();
  let completedRuns = [];
  let committed = '[]';
  function restore(serialized) {
    sessions.clear();
    const data = JSON.parse(serialized);
    completedRuns = Array.isArray(data) ? [] : data.completedRuns;
    if (!Array.isArray(completedRuns)) throw new Error('Invalid run history');
    for (const [id, saved] of (Array.isArray(data) ? data : data.sessions)) sessions.set(id, { ...saved, game: Object.assign(new KosmosGame(), saved.game) });
  }
  function persist() {
    if (!storage) return;
    const values = [...sessions.entries()].map(([id, s]) => [id, { ...s,
      game: Object.fromEntries(savedFields.map(k => [k, s.game[k]])) }]);
    const temporary = `${storage}.tmp`;
    const serialized = JSON.stringify({ version: 2, sessions: values, completedRuns });
    for (let attempt = 0; ; attempt++) {
      try {
        fs.mkdirSync(path.dirname(storage), { recursive: true });
        fs.writeFileSync(temporary, serialized, { mode: 0o600 });
        fs.renameSync(temporary, storage);
        committed = serialized;
        break;
      } catch (error) {
        // Windows scanners/sync clients can briefly lock the replacement file.
        if (attempt >= 3 || !['EBUSY', 'EPERM', 'EACCES'].includes(error.code)) {
          console.error(`Game storage unavailable: ${error.code || 'unknown'}`);
          restore(committed);
          throw new GameError(503, 'SESSION STORAGE UNAVAILABLE. Contact the operator.');
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
      }
    }
  }
  if (storage && fs.existsSync(storage)) {
    // Fail startup on damaged state instead of silently losing sessions or granting fresh attempts.
    committed = fs.readFileSync(storage, 'utf8');
    restore(committed);
  }
  function create(replacingId = null) {
    for (const [id, s] of sessions) if (now() - s.lastActivity > 24 * 60 * 60 * 1000) { archive(s, 'expired', s.lastActivity); sessions.delete(id); }
    if (sessions.size >= 64 && !sessions.has(replacingId)) throw new GameError(429, 'SESSION CAPACITY REACHED. Contact the operator.');
    const id = crypto.randomBytes(32).toString('base64url');
    const game = new KosmosGame();
    const previousVariant = sessions.get(replacingId)?.replayVariant;
    const choices = variants.filter(v=>v.id!==previousVariant);
    const replayVariant = choices[crypto.randomInt(choices.length)].id;
    game.cortexCode = `CORTEX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const s = { game, replayVariant, runId: crypto.randomUUID(), createdAt: now(), lastActivity: now(), started: false, endingKind: null, endedAt: null,
      readFiles: [], events: [], attempts: [], cortex: null, planner: null, revision: 0, hintCounts: {}, ctf: null };
    sessions.set(id, s);
    if (replacingId && sessions.has(replacingId)) { archive(sessions.get(replacingId), 'abandoned', now()); sessions.delete(replacingId); }
    persist(); return id;
  }
  function has(id) { return sessions.has(id); }
  function archive(s, outcome, endedAt) {
    if (!s.started || s.archived) return;
    s.archived = true;
    outcome = s.endingKind || outcome;
    endedAt = s.endedAt ?? endedAt;
    completedRuns.push({ runId: s.runId || crypto.randomUUID(), startedAt: s.startedAt || s.createdAt,
      endedAt, durationMs: Math.max(0, endedAt - (s.startedAt || s.createdAt)), outcome,
      access: s.game.access, rootRecovered: s.game.rootRecovered, recordsRead: s.readFiles.length,
      ctfCompleted: Boolean(s.ctf?.completed), hints: Object.values(s.hintCounts).reduce((a,b)=>a+b,0) });
    completedRuns[completedRuns.length-1].replayVariant = replay(s.replayVariant).id;
    completedRuns = completedRuns.slice(-500);
  }
  function history() {
    const outcomes = {};
    for (const run of completedRuns) outcomes[run.outcome] = (outcomes[run.outcome] || 0) + 1;
    return { retention: 500, total: completedRuns.length, outcomes,
      averageDurationMs: completedRuns.length ? Math.round(completedRuns.reduce((n,r)=>n+r.durationMs,0)/completedRuns.length) : 0,
      runs: completedRuns.slice().reverse().map(r=>({...r})) };
  }
  function finish(s, kind, endedAt = now()) {
    if (s.endingKind) return;
    s.game.finish(); s.endingKind = kind; s.endedAt = endedAt; s.cortex = null; s.planner = null;
    s.revision++;
    archive(s, kind, endedAt);
  }
  function get(id) {
    const s = sessions.get(id);
    if (!s) throw new GameError(401, 'SESSION REQUIRED. Reload the terminal.');
    if (!s.game.ending && s.started) {
      if (s.game.missionResolved && s.earthEndingAt && now() >= s.earthEndingAt) {
        finish(s, 'earth', s.earthEndingAt); persist();
      }
      const deadlines = [!s.game.rootRecovered && s.game.sedationEndsAt ? [s.game.sedationEndsAt, 'sedation'] : null,
        !s.game.missionPaused && !s.game.missionResolved && s.game.missionEndsAt ? [s.game.missionEndsAt, 'mission'] : null].filter(Boolean).sort((a, b) => a[0] - b[0]);
      if (deadlines[0]?.[0] <= now()) { finish(s, deadlines[0][1], deadlines[0][0]); persist(); }
    }
    return s;
  }
  function snapshot(id) {
    const s = get(id), g = s.game;
    const publicFields = savedFields.filter(k => !['cortexCode', 'sessionNumber'].includes(k));
    return { ...Object.fromEntries(publicFields.map(k => [k, g[k]])), rootShares: { ...g.rootShares },
      cortexCode: g.cortexCodeIssued ? g.cortexCode : null, serverNow: now(), started: s.started,
      endingKind: s.endingKind, resetAt: s.endedAt === null ? null : s.endedAt + 60000,
      sessionTag: crypto.createHash('sha256').update(id).digest('hex').slice(0, 16),
      revision: s.revision, objective: objective(g), readFiles: [...s.readFiles], ctf: s.ctf ? { endsAt: s.ctf.endsAt, completed: s.ctf.completed, expired: !s.ctf.completed && now() >= s.ctf.endsAt } : null };
  }
  function objective(g) {
    if (g.ending) return { phase: 3, text: 'SESSION COMPLETE' };
    if (!g.rootShares.medical) return { phase: 1, text: 'Recover medical access. Read /medical/doctor_note.txt and /medical/recovery_service.txt.' };
    if (!g.rootShares.comms) return { phase: 2, text: 'Restore the blocked link using the relay application in /comms.' };
    if (!g.cortexCodeIssued) return { phase: 3, text: 'Stop sedation. Locate the independent response test in Medical.' };
    if (!g.rootShares.cortex) return { phase: 3, text: `Submit your verified response: auth cortex ${g.cortexCode}` };
    if (!g.rootRecovered) return { phase: 3, text: 'All three recovery shares are ready. Enter: root recover' };
    if (g.missionResolved) return { phase: 3, text: 'Earth transfer confirmed. Preparing the final report.' };
    return { phase: 3, text: 'Choose the outcome. Read /command/navigation/decision_brief.txt; use the orbital planner to return to Earth.' };
  }
  function canRead(id, file) {
    const s = get(id);
    return s.started && !s.game.ending && (!file.startsWith('/home/operator/.bonus') || Boolean(s.ctf?.completed)) && s.game.canAccessPath(file);
  }
  function recordRead(id, file) {
    const s = get(id);
    if (!canRead(id, file)) throw new GameError(403, 'ARCHIVE ACCESS DENIED');
    if (!s.readFiles.includes(file)) {
      s.readFiles.push(file); s.game.registerFileRead(file); s.revision++; persist();
    }
  }
  function narrative(id) {
    const s = get(id), g = s.game;
    return { replayVariant: replay(s.replayVariant).id, access: g.access, rootRecovered: g.rootRecovered, sedationActive: Boolean(g.sedationEndsAt) && !g.ending,
      course: g.course, readFiles: s.readFiles, cortexPassed: g.cortexCodeIssued };
  }
  function authorizeEvent(id, key) {
    const s = get(id);
    if (key === 'read-first-file' || key === 'display-media') return s.readFiles.length > 0;
    const evidence = { 'evidence-comms': '/home/operator/comms/raw_uplink_ledger.txt', 'evidence-neural': '/home/operator/command/neural_transfer.txt', 'evidence-pods': '/home/operator/hibernation/occupancy.txt' };
    return evidence[key] ? s.readFiles.includes(evidence[key]) : s.events.includes(key);
  }
  function event(s, key) { if (!s.events.includes(key)) s.events.push(key); }
  function ensureActive(s) {
    if (!s.started || s.game.ending) throw new GameError(409, 'NO ACTIVE SESSION');
  }
  function cortexSignal(c, delay = 0) {
    c.token = crypto.randomBytes(12).toString('hex');
    c.target = ['a', 's', 'k', 'l'][crypto.randomInt(4)];
    c.issuedAt = now() + delay; c.expiresAt = c.issuedAt + 1550;
  }
  function publicChallenge(c) { return { token: c.token, target: c.target, index: c.index, hits: c.hits, misses: c.misses, deadline: c.deadline, issuedAt: c.issuedAt, expiresAt: c.expiresAt }; }
  function validatePlan(s, nodes) {
    if (!s.planner || !s.game.rootRecovered || !s.game.missionPaused) throw new GameError(403, 'PLANNER NOT AUTHORIZED');
    if (!Array.isArray(nodes) || !nodes.length || nodes.length > 2) throw new GameError(400, 'INVALID BURN NODES');
    const clean = nodes.map(n => {
      if (!n || ![n.position, n.deltaV, n.angle].every(Number.isFinite) || n.position < s.planner.origin + 1 || n.position > 99.8 || n.deltaV < 0 || n.deltaV > 600 || n.angle < -180 || n.angle > 180) throw new GameError(400, 'INVALID BURN NODE');
      return { position: n.position, deltaV: n.deltaV, angle: n.angle };
    }).sort((a, b) => a.position - b.position);
    if (clean.reduce((sum, n) => sum + n.deltaV, 0) > 600 || (clean.length === 2 && clean[1].position - clean[0].position < 1)) throw new GameError(400, 'INVALID BURN BUDGET OR ORDER');
    const physics = createPlannerPhysics(); physics.originPosition = s.planner.origin; physics.nodes = clean;
    if (!physics.validTransfer()) throw new GameError(409, 'EARTH CAPTURE NOT CONFIRMED');
    return clean;
  }
  function action(id, input) {
    const s = get(id), g = s.game;
    if (!input || typeof input !== 'object' || typeof input.action !== 'string') throw new GameError(400, 'INVALID ACTION');
    const kind = input.action;
    if (kind === 'reset') {
      const eligible = s.endedAt !== null ? now() >= s.endedAt + 60000 : now() - s.lastActivity >= 5 * 60 * 1000;
      if (!eligible) throw new GameError(403, 'RESET IS NOT YET AVAILABLE');
      const next = create(id); return { newId: next, state: snapshot(next) };
    }
    if (kind === 'activity') { s.lastActivity = now(); persist(); return { state: snapshot(id) }; }
    if (kind === 'start') {
      if (!s.started) { s.started = true; s.startedAt = now(); g.missionEndsAt = now() + g.missionDuration; s.lastActivity = now(); s.revision++; persist(); }
      return { state: snapshot(id) };
    }
    if (kind === 'ending' && g.ending && input.kind === s.endingKind) return { ok: true, state: snapshot(id) };
    ensureActive(s); s.lastActivity = now();
    if (g.missionResolved && !['ending', 'hint', 'planner-commit'].includes(kind)) throw new GameError(409, 'EARTH TRANSFER ALREADY COMMITTED. Await the final report.');
    let result = { ok: true };
    if (kind === 'comms-start') {
      if (g.access < 1 || g.rootShares.comms) throw new GameError(403, 'MEDICAL ACCESS REQUIRED; COMMUNICATIONS MUST STILL BE LOCKED');
      s.link = { token: crypto.randomBytes(12).toString('hex'), targets: Array.from({length:3},()=>crypto.randomInt(4)) };
      result.challenge = s.link;
    } else if (kind === 'comms-submit') {
      if (!s.link || input.token !== s.link.token || g.access < 1 || g.rootShares.comms) throw new GameError(409, 'STALE LINK CHALLENGE');
      if (!Array.isArray(input.routes) || input.routes.length !== 3 || input.routes.some((v,i)=>v!==s.link.targets[i])) throw new GameError(400, 'SIGNAL BLOCKED. Match every relay to its destination.');
      result = g.authorize('comms', 'F-184-2317');
      s.link = null; g.sedationEndsAt = now() + 5*60*1000;
      event(s,'comms-auth');event(s,'sedation-started');
    } else if (kind === 'authorize') {
      if (typeof input.domain !== 'string' || typeof input.code !== 'string' || input.code.length > 80) throw new GameError(400, 'INVALID AUTHORIZATION');
      s.attempts = s.attempts.filter(time => now() - time < 10000);
      if (s.attempts.length >= 8) throw new GameError(429, 'AUTHORIZATION RATE LIMITED. Wait a few seconds.');
      s.attempts.push(now());
      result = g.authorize(input.domain, input.code);
      if (result.ok && input.domain.toLowerCase() === 'medical') event(s, 'medical-auth');
      if (result.ok && input.domain.toLowerCase() === 'comms') { g.sedationEndsAt = now() + 5 * 60 * 1000; event(s, 'comms-auth'); event(s, 'sedation-started'); }
    } else if (kind === 'root') {
      result = g.recoverRoot(); if (result.ok) event(s, 'root-recover');
    } else if (kind === 'cortex-start') {
      if (!g.canStartCortex()) throw new GameError(403, 'CORTEX REQUIRES ACTIVE SEDATION');
      if (s.cortex && now() < s.cortex.deadline) return { ok: true, challenge: publicChallenge(s.cortex), state: snapshot(id) };
      s.cortex = { index: 0, hits: 0, misses: 0, deadline: now() + 40000 };
      cortexSignal(s.cortex); result.challenge = publicChallenge(s.cortex); event(s, 'cortex-run');
    } else if (kind === 'cortex-answer') {
      const c = s.cortex;
      if (!c || input.token !== c.token) throw new GameError(409, 'STALE CORTEX SIGNAL');
      if (now() < c.issuedAt) throw new GameError(409, 'CORTEX SIGNAL NOT YET ACTIVE');
      const hit = now() <= c.expiresAt + 200 && now() <= c.deadline && input.key === c.target;
      c.index++; hit ? c.hits++ : c.misses++;
      result.done = c.index >= 20 || c.hits + 20 - c.index < 15 || now() >= c.deadline;
      result.hits = c.hits; result.misses = c.misses; result.index = c.index;
      if (result.done) {
        result.success = c.hits >= 15 && now() <= c.deadline;
        if (result.success) { g.issueCortexCode(); event(s, 'cortex-pass'); }
        s.cortex = null;
      } else { cortexSignal(c, 150); result.challenge = publicChallenge(c); }
    } else if (kind === 'cortex-cancel') {
      s.cortex = null;
    } else if (kind === 'planner-start') {
      if (!g.rootRecovered || g.missionResolved) throw new GameError(403, 'ROOT NAVIGATION AUTHORITY REQUIRED');
      if (!s.planner) {
        if (g.missionEndsAt - now() < g.missionDuration * .012) throw new GameError(409, 'MANEUVER WINDOW CLOSED. The remaining path cannot accommodate a burn node.');
        g.missionRemaining = Math.max(0, g.missionEndsAt - now()); g.missionEndsAt = null; g.missionPaused = true;
        s.planner = { origin: (1 - g.missionRemaining / g.missionDuration) * 100, armedAt: null, nodes: null };
      }
      result.origin = s.planner.origin; event(s, 'navigation-interest');
    } else if (kind === 'planner-exit') {
      if (g.missionPaused && !g.missionResolved) { g.missionPaused = false; g.missionEndsAt = now() + g.missionRemaining; }
      s.planner = null;
    } else if (kind === 'planner-arm') {
      const nodes = validatePlan(s, input.nodes); s.planner.nodes = nodes; s.planner.armedAt = now();
    } else if (kind === 'planner-commit') {
      if (g.missionResolved) return { ok: true, state: snapshot(id) };
      if (!s.planner || s.planner.armedAt === null || now() - s.planner.armedAt < 2000) throw new GameError(409, 'BURN HOLD INCOMPLETE');
      validatePlan(s, s.planner.nodes);
      g.confirmEarthIntercept(); event(s, 'earth-transfer'); s.planner = null; s.earthEndingAt = now() + 3000;
    } else if (kind === 'ending') {
      if (!g.rootRecovered) throw new GameError(403, 'ROOT AUTHORITY REQUIRED');
      if (!['earth', 'sun', 'shutdown', 'transfer'].includes(input.kind)) throw new GameError(400, 'UNKNOWN ENDING');
      if (g.missionResolved && input.kind !== 'earth') throw new GameError(409, 'EARTH TRANSFER IS IRREVERSIBLE');
      if (input.kind === 'earth' && !g.missionResolved) throw new GameError(403, 'EARTH TRANSFER NOT VERIFIED');
      if (input.kind === 'transfer' && !g.neuralTransferDiscovered) throw new GameError(403, 'NEURAL CHANNEL NOT DISCOVERED');
      finish(s, input.kind);
    } else if (kind === 'hint') {
      if (g.cortexCodeIssued && !g.rootShares.cortex || g.missionResolved) return { ok: true, message: `HINT // ${objective(g).text}`, state: snapshot(id) };
      const stage = !g.rootShares.medical ? 'medical' : !g.rootShares.comms ? 'comms' : !g.rootShares.cortex ? 'cortex' : !g.rootRecovered ? 'root' : 'navigation';
      const level = Math.min(3, (s.hintCounts[stage] || 0) + 1); s.hintCounts[stage] = level;
      const details = {
        medical: ['Read /medical/doctor_note.txt and /medical/recovery_service.txt.', 'Use CHAMBER 07 and LAST MANUAL OVERRIDE 04/12 from doctor_note.txt. Enter: auth medical MR-07-0412'],
        comms: ['Find the relay maintenance application in /comms.', 'Match each relay to its destination, then verify all three connections.'],
        cortex: ['Run /medical/cortex_echo.app while sedation is active.', 'Press the displayed A/S/K/L key once per signal. At least 15 of 20 must match; retries are allowed.'],
        root: ['All three shares have been accepted. Enter: root recover.', 'ROOT recovery stops sedation and opens the navigation archive. Enter: root recover.'],
        navigation: ['Read /command/navigation/legacy_flight_manual.txt and run its planner.', 'Place an early burn, adjust its vector and strength toward the blue ring, then use a second correction if needed. Hold Enter once capture is confirmed.']
      };
      result.message = level === 1 ? g.hint() : `HINT ${level}/3 // ${details[stage][level - 2]}`;
    } else if (kind === 'ctf-start') {
      if (g.access < 2) throw new GameError(403, 'ACCESS LEVEL 2 REQUIRED');
      if (!s.ctf || (!s.ctf.completed && now() >= s.ctf.endsAt)) s.ctf = { endsAt: now() + 120000, completed: false };
      result.message = s.ctf.completed ? 'OPTIONAL FORENSIC CTF // ALREADY VERIFIED. Continue your recovery objective.' : `OPTIONAL FORENSIC CTF // ${g.formatTime(s.ctf.endsAt - now())}\nRead forensic_fragment.txt in /comms, /engineering and /command. Join fragments in evidence-chain order, then submit: flag EYE{...}\nUse status to check time. Main mission and sedation clocks continue. This investigation is optional; you can complete ROOT first.`;
    } else if (kind === 'flag') {
      if (s.ctf?.completed) throw new GameError(409, 'FLAG ALREADY VERIFIED');
      if (!s.ctf || now() >= s.ctf.endsAt) throw new GameError(409, 'CTF WINDOW CLOSED. Use ctf to retry.');
      if (!CTF_FILES.every(file => s.readFiles.includes(file)) || input.flag !== CTF_FLAG) throw new GameError(403, 'FLAG REJECTED. Verify all three evidence fragments and their order.');
      s.ctf.completed = true; result.message = 'FLAG VERIFIED // CHAIN OF EVIDENCE RESTORED\nBonus archive unlocked: cd /home/operator/.bonus. Use ls, then display <file>.';
    } else throw new GameError(400, 'UNKNOWN ACTION');
    s.revision++; persist(); return { ...result, state: snapshot(id) };
  }
  return { create, has, snapshot, action, canRead, recordRead, narrative, authorizeEvent, history,
    replayMemo: id => replay(get(id).replayVariant).memo,
    operatorReset: id => { const next = create(has(id) ? id : null); return { newId: next, state: snapshot(next) }; } };
}
module.exports = { createGameService, GameError };
