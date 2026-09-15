const bootScreen = document.querySelector('#boot-screen');
const bootSequence = document.querySelector('#boot-sequence');
const game = document.querySelector('#game');
const displayMode = new URLSearchParams(window.location.search).get('display');
function updateDisplayMode() {
  document.documentElement.classList.toggle('crt-readable', displayMode === 'crt');
}
updateDisplayMode();
document.querySelector('#show-kosmos').addEventListener('click', () => setActiveChannel('command'));
document.querySelector('#show-hrtok').addEventListener('click', () => setActiveChannel('central'));
const compactClock = document.querySelector('#compact-clock');
const sourceClock = document.querySelector('#mission-clock');
new MutationObserver(() => { compactClock.textContent = sourceClock.textContent; })
  .observe(sourceClock, { childList:true, characterData:true, subtree:true });
const bootForm = document.querySelector('#boot-form');
const bootInput = document.querySelector('#boot-input');
const mountStatus = document.querySelector('#mount-status');
const yspBootAnimation = document.querySelector('#ysp-boot-animation');
const yspBootSound = document.querySelector('#ysp-boot-sound');
const bootStage = document.querySelector('#boot-stage');
const bootEmblem = document.querySelector('#boot-emblem');
const bootLogItems = [...document.querySelectorAll('[data-boot-log]')];
const bootProgressBar = document.querySelector('#boot-progress-bar');
const bootPostMessage = document.querySelector('#boot-post-message');
const bootPostStatus = document.querySelector('#boot-post-status');
const commandForm = document.querySelector('#command-form');
const commandInput = document.querySelector('#command-input');
const terminalScroll = document.querySelector('#terminal-scroll');
const output = document.querySelector('#output');
const locationLabel = document.querySelector('#location');
const prompt = document.querySelector('#prompt');
const terminalPanel = document.querySelector('.terminal-panel');
const mediaOverlay = document.querySelector('#media-overlay');
const mediaContent = document.querySelector('#media-content');
const mediaTitle = document.querySelector('#media-title');
const cortexOverlay = document.querySelector('#cortex-overlay');
const cortexClock = document.querySelector('#cortex-clock');
const cortexPulse = document.querySelector('#cortex-pulse');
const cortexTrack = document.querySelector('#cortex-track');
const cortexStatus = document.querySelector('#cortex-status');
const notesPanel = document.querySelector('#notes-panel');
const notesInput = document.querySelector('#notes-input');
const sedationHud = document.querySelector('#sedation-hud');
const sedationClock = document.querySelector('#sedation-clock');
const sedationProgress = document.querySelector('#sedation-progress');
const sedationMessage = document.querySelector('#sedation-message');
const failureScreen = document.querySelector('#failure-screen');
const resetClock = document.querySelector('#reset-clock');
const failureLabel = document.querySelector('#failure-label');
const failureTitle = document.querySelector('#failure-title');
const failureBody = document.querySelector('#failure-body');
const failureQuote = document.querySelector('.failure-quote');
const crtTransition = document.querySelector('#crt-transition');
const trajectoryPanel = document.querySelector('.trajectory-panel');
const missionClock = document.querySelector('#mission-clock');
const missionPath = document.querySelector('#mission-path');
const missionShip = document.querySelector('#mission-ship');
const missionDestination = document.querySelector('#mission-destination');
const missionObjective = document.querySelector('#mission-objective');
const centralFeed = document.querySelector('#central-feed');
const centralForm = document.querySelector('#central-form');
const centralInput = document.querySelector('#central-input');
const centralStatus = document.querySelector('#central-status');
const plannerOverlay = document.querySelector('#planner-overlay');
const plannerPredictedPath = document.querySelector('#planner-predicted-path');
const plannerCursor = document.querySelector('#planner-cursor');
const plannerNodeLayer = document.querySelector('#planner-node-layer');
const plannerShip = document.querySelector('#planner-ship');
const plannerTransferPulse = document.querySelector('#planner-transfer-pulse');
const plannerIntercept = document.querySelector('#planner-intercept');
const plannerNodeCount = document.querySelector('#planner-node-count');
const plannerDv = document.querySelector('#planner-dv');
const plannerSelected = document.querySelector('#planner-selected');
const plannerStatus = document.querySelector('#planner-status');
const devMenuOverlay = document.querySelector('#dev-menu-overlay');
const devMenuList = document.querySelector('#dev-menu-list');

// Set this to false for the convention build. The hidden `dev` command is then unavailable.
const DEV_MODE = false;
const state = { cwd: '/home/operator', history: [], historyIndex: 0 };
const gameState = new KosmosGame();
gameState.onSessionChange = () => window.location.reload();
let fs;
let outputTyping = false;
let outputToken = 0;
const outputQueue = [];
const typewriterDelay = 3;
const registry = new CommandRegistry(createCommands());
let lastTabCompletion = '';
let sedationDisplayTimer;
let fatigueTimer;
let failureResetTimer;
let failureClockTimer;
let missionDisplayTimer;
let centralIdleTimer;
let postTransferTimer;
let idleResetTimer;
let crtTransitionTimer;
let resetInProgress = false;
let bootTimer;
let bootStepTimer;
let bootStartedAt = 0;
let bootStepIndex = 0;
let bootFinished = false;
let confirmedEarthPath = null;
const centralMemory = {
  observed: new Set(),
  exchangeCount: 0,
  messages: [],
  idleCount: 0,
  lastIdleMessage: ''
};
let activeChannel = 'command';
let centralPrompt = null;
const captainName = 'HRTOK';
const hrtokClient = new HrtokClient();
const readRecords = new Set();
let centralMessagePending = false;
centralInput.maxLength = 1200;
const BOOT_SEQUENCE_MS = 5000;
const RESET_DELAY_MS = 60000;
const IDLE_RESET_MS = 5 * 60 * 1000;
const sfx = {
  files: {
    ambientShip: 'audio/sfx/ambient_ship_loop.wav',
    ambientNav: 'audio/sfx/ambient_nav_loop.wav',
    ambientSedation: 'audio/sfx/ambient_sedation_loop.wav',
    terminalTick: 'audio/sfx/terminal_tick.wav',
    commandError: 'audio/sfx/command_error.wav',
    archiveOpen: 'audio/sfx/archive_open.wav',
    sedationAlarm: 'audio/sfx/sedation_alarm.wav',
    fatigueBreathe: 'audio/sfx/fatigue_breathe.wav',
    cortexPulse: 'audio/sfx/cortex_pulse.wav',
    cortexHit: 'audio/sfx/cortex_hit.wav',
    cortexMiss: 'audio/sfx/cortex_miss.wav',
    rootUnlock: 'audio/sfx/root_unlock.wav',
    plannerNode: 'audio/sfx/planner_node.wav',
    plannerVectorTick: 'audio/sfx/planner_vector_tick.wav',
    burnExecute: 'audio/sfx/burn_execute.wav',
    earthCapture: 'audio/sfx/earth_capture.wav',
    centralSting: 'audio/sfx/central_sting.wav',
    endingSuccess: 'audio/sfx/ending_success.wav',
    endingFailure: 'audio/sfx/ending_failure.wav'
  },
  cache: {},
  buffers: {},
  decodedBuffers: {},
  pendingPlays: {},
  loops: {},
  context: null,
  lastPlayed: {},

  get(name) {
    if (!this.cache[name]) {
      const audio = new Audio(this.files[name]);
      audio.preload = 'auto';
      this.cache[name] = audio;
    }
    return this.cache[name];
  },

  ensureContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!this.context) this.context = new AudioContextClass();
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    return this.context;
  },

  async loadBuffer(name) {
    const context = this.ensureContext();
    if (!context) return null;
    if (this.decodedBuffers[name]) return this.decodedBuffers[name];
    if (!this.buffers[name]) {
      this.buffers[name] = fetch(this.files[name])
        .then((response) => response.arrayBuffer())
        .then((data) => context.decodeAudioData(data))
        .then((buffer) => {
          this.decodedBuffers[name] = buffer;
          return buffer;
        });
    }
    return this.buffers[name];
  },

  prime(names = Object.keys(this.files)) {
    this.ensureContext();
    names.forEach((name) => this.loadBuffer(name).catch(() => {}));
  },

  play(name, volume = .35, options = {}) {
    if (!this.files[name]) return;
    const now = performance.now();
    if (options.throttleMs) {
      const lastPlayed = this.lastPlayed[name] || 0;
      if (now - lastPlayed < options.throttleMs) return;
      this.lastPlayed[name] = now;
    }

    const context = this.ensureContext();
    if (!context) {
      this.fallbackPlay(name, volume);
      return;
    }

    if (options.dropIfLoading && !this.decodedBuffers[name]) {
      this.loadBuffer(name).catch(() => {});
      return;
    }

    if (options.queueIfLoading && !this.decodedBuffers[name]) {
      if (this.pendingPlays[name]) return;
      this.pendingPlays[name] = true;
      this.loadBuffer(name)
        .then(() => this.playBuffer(name, volume))
        .catch(() => this.fallbackPlay(name, volume))
        .finally(() => { delete this.pendingPlays[name]; });
      return;
    }

    this.playBuffer(name, volume).catch(() => this.fallbackPlay(name, volume));
  },

  async playBuffer(name, volume = .35) {
    const context = this.ensureContext();
    if (!context) return;
    const buffer = await this.loadBuffer(name);
    if (!buffer) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, context.currentTime);
    source.connect(gain).connect(context.destination);
    source.start();
  },

  fallbackPlay(name, volume = .35) {
    const audio = this.get(name).cloneNode();
    audio.volume = volume;
    audio.play().catch(() => {});
  },

  async loop(name, volume = .22) {
    if (!this.files[name] || this.loops[name]) return;
    const context = this.ensureContext();
    if (!context) {
      this.fallbackLoop(name, volume);
      return;
    }

    this.loops[name] = { pending: true };
    try {
      const buffer = await this.loadBuffer(name);
      const pendingLoop = this.loops[name];
      if (!buffer || !pendingLoop?.pending) return;

      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(volume, context.currentTime + .9);
      source.connect(gain).connect(context.destination);
      source.start();
      this.loops[name] = { source, gain, context, volume };
    } catch (_error) {
      delete this.loops[name];
      this.fallbackLoop(name, volume);
    }
  },

  fallbackLoop(name, volume = .22) {
    if (!this.files[name] || this.loops[name]) return;
    const audio = this.get(name).cloneNode();
    audio.loop = true;
    audio.volume = 0;
    this.loops[name] = audio;
    audio.play().then(() => {
      const step = Math.max(.01, volume / 24);
      const fade = setInterval(() => {
        if (this.loops[name] !== audio) {
          clearInterval(fade);
          return;
        }
        audio.volume = Math.min(volume, audio.volume + step);
        if (audio.volume >= volume) clearInterval(fade);
      }, 30);
    }).catch(() => {});
  },

  stop(name, fadeSeconds = .7) {
    const loop = this.loops[name];
    if (!loop) return;
    delete this.loops[name];

    if (loop.pending) return;

    if (loop.source && loop.gain && loop.context) {
      const now = loop.context.currentTime;
      const currentGain = loop.gain.gain.value;
      loop.gain.gain.cancelScheduledValues(now);
      loop.gain.gain.setValueAtTime(currentGain, now);
      loop.gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
      setTimeout(() => {
        try {
          loop.source.stop();
        } catch (_error) {}
      }, fadeSeconds * 1000 + 50);
      return;
    }

    const startVolume = loop.volume || 0;
    const fade = setInterval(() => {
      loop.volume = Math.max(0, loop.volume - Math.max(.01, startVolume / 20));
      if (loop.volume <= 0) {
        clearInterval(fade);
        loop.pause();
        loop.currentTime = 0;
      }
    }, Math.max(20, (fadeSeconds * 1000) / 20));
  },

  stopAll() {
    Object.keys(this.loops).forEach((name) => this.stop(name));
  }
};

let activeOutput = null;
function flushOutput() {
  outputToken += 1;
  if (activeOutput) { activeOutput.line.textContent=activeOutput.text; activeOutput.line.classList.remove('typing-line'); activeOutput=null; }
  for (const item of outputQueue.splice(0)) {
    const line=document.createElement('div'); line.className=`line ${item.cls}`; line.textContent=item.text; output.append(line);
  }
  outputTyping=false;
}
function print(text, cls = 'system') {
  if (cls === 'error') sfx.play('commandError', .16);
  flushOutput();
  const line = document.createElement('div');
  line.className = `line ${cls}`;
  const value = String(text);
  if (cls === 'archive-record') {
    for (const row of value.split('\n')) {
      const part = document.createElement('span');
      part.textContent = row + '\n';
      if (/^(PATIENT:|ROLE:|CHAMBER:|LAST MANUAL OVERRIDE:|CURRENT COURSE:|DESTINATION:|AUTHORIZATION|auth |run |.*UNSENT|.*BLOCK TIME)/i.test(row)) part.className = 'record-key';
      line.append(part);
    }
  } else line.textContent = value;
  output.append(line);
  terminalScroll.scrollTop = terminalScroll.scrollHeight;
}

function typeNextOutputLine() {
  if (outputTyping || !outputQueue.length) return;

  outputTyping = true;
  const token = outputToken;
  const { text, cls } = outputQueue.shift();
  const line = document.createElement('div');
  line.className = `line ${cls} typing-line`;
  activeOutput = { line, text };
  let characterIndex = 0;
  output.append(line);

  const typeCharacter = () => {
    if (token !== outputToken) return;
    characterIndex += 1;
    line.textContent = text.slice(0, characterIndex);
    if (characterIndex % 8 === 0) sfx.play('terminalTick', .055, { throttleMs: 26, queueIfLoading: true });
    terminalScroll.scrollTop = terminalScroll.scrollHeight;

    if (characterIndex < text.length) {
      window.setTimeout(typeCharacter, typewriterDelay);
      return;
    }

    line.classList.remove('typing-line');
    activeOutput = null;
    outputTyping = false;
    typeNextOutputLine();
  };

  typeCharacter();
}

function clearOutput() {
  activeOutput = null;
  outputToken += 1;
  outputQueue.length = 0;
  outputTyping = false;
  output.replaceChildren();
}

function setActiveChannel(channel) {
  activeChannel = channel === 'central' ? 'central' : 'command';
  terminalPanel.classList.toggle('active-channel', activeChannel === 'command');
  trajectoryPanel.classList.toggle('active-channel', activeChannel === 'central');
  document.querySelector('#show-kosmos').setAttribute('aria-pressed', String(activeChannel === 'command'));
  document.querySelector('#show-hrtok').setAttribute('aria-pressed', String(activeChannel === 'central'));
  if (activeChannel === 'central') centralInput.focus();
  else commandInput.focus();
}

function updateNextStep() {
  const guide = document.getElementById('next-step');
  if (!guide) return;
  guide.hidden = Boolean(gameState.ending || gameState.missionResolved);
  const remaining = gameState.missionPaused ? gameState.missionRemaining : (gameState.missionEndsAt || Date.now()) - Date.now();
  const urgent = remaining < 180000 || (gameState.sedationEndsAt && !gameState.rootRecovered && gameState.sedationEndsAt - Date.now() < 90000);
  guide.classList.toggle('urgent-hint', Boolean(urgent));
  guide.textContent = urgent ? 'TIME CRITICAL // ' + gameState.objectiveText() + ' // Type hint for help.' : 'ls: list  |  cd <folder>: enter  |  cat <file>: read  |  help: all commands';
  const discovered = document.querySelector('#discovered-status');
  if (discovered) discovered.textContent = `NAME: ${gameState.identityKnown() ? 'SAMUEL "SLOKI" KOVAC' : 'UNKNOWN'}  //  ROLE: ${gameState.identityKnown() ? 'BOTANIST / PATIENT' : 'UNKNOWN'}`;
  guide.title = 'Enter: submit. Ctrl+Right: HRTOK. Ctrl+Left: KOSMOS.';
}

function toggleActiveChannel() {
  setActiveChannel(activeChannel === 'command' ? 'central' : 'command');
}

function scrollActiveChannel(direction) {
  const target = activeChannel === 'central' ? centralFeed : terminalScroll;
  target.scrollTop += direction * Math.max(120, Math.floor(target.clientHeight * .78));
}

function printCommand(input) {
  flushOutput();
  const line = document.createElement('div');
  const [command, ...args] = input.split(/\s+/);
  line.className = 'line input-line';
  line.textContent = `sloki@kosmos:${state.cwd} $ `;

  const commandText = document.createElement('span');
  commandText.className = 'typed-command';
  commandText.textContent = command;
  line.append(commandText);
  if (args.length) line.append(` ${args.join(' ')}`);
  output.append(line);
  terminalScroll.scrollTop = terminalScroll.scrollHeight;
}

function centralLine(speaker, text, cls = '') {
  if (!centralFeed) return;
  const line = document.createElement('div');
  line.className = `central-line ${cls}`.trim();

  const label = document.createElement('span');
  label.className = 'central-speaker';
  label.textContent = speaker;

  const body = document.createElement('span');
  body.className = 'central-text';
  body.textContent = normalizeCentralText(text);

  line.append(label, body);
  centralFeed.append(line);
  centralFeed.scrollTop = centralFeed.scrollHeight;
  return line;
}

function normalizeCentralText(text) {
  return String(text || '').replace(/[\u2014\u2013]/g, ',');
}

function centralSay(text, cls = 'central-ai') {
  centralStatus.textContent = 'TRANSMITTING';
  const message = normalizeCentralText(text);
  centralLine(captainName, message, cls);
  centralMemory.messages.push({ speaker: captainName, text: message.slice(0, 600) });
  centralMemory.messages = centralMemory.messages.slice(-10);
  window.setTimeout(() => {
    if (centralStatus.textContent === 'TRANSMITTING') centralStatus.textContent = 'MONITORING';
  }, 1400);
}

function centralEcho(text) {
  centralLine('SLOKI', text, 'central-user');
  centralMemory.messages.push({ speaker: 'SLOKI', text: String(text).slice(0, 600) });
  centralMemory.messages = centralMemory.messages.slice(-10);
}

function centralSignal(label, value = '', cls = 'neutral') {
  const signal = document.createElement('div');
  signal.className = `central-signal ${cls}`;
  const valueText = value === '' || value === 0 ? '' : ` ${value > 0 ? '+' : ''}${value}`;
  signal.textContent = `${label}${valueText}`;
  centralFeed.append(signal);
  centralFeed.scrollTop = centralFeed.scrollHeight;
  window.setTimeout(() => signal.classList.add('fade'), 1800);
  window.setTimeout(() => signal.remove(), 3200);
}

function centralApplyDeltas(response) {
  if (response?.relationship) centralMemory.relationship = response.relationship;
  const trust = Number(response?.trust_delta) || 0;
  const suspicion = Number(response?.suspicion_delta) || 0;
  if (trust) centralSignal('TRUST', trust, trust > 0 ? 'positive' : 'negative');
  if (suspicion) centralSignal('SUSPICION', suspicion, suspicion > 0 ? 'negative' : 'positive');
}

function renderCentralPromptSelection() {
  if (!centralPrompt) return;
  centralPrompt.choiceNodes.forEach((node, index) => {
    node.classList.toggle('selected', index === centralPrompt.selected);
  });
}

function showCentralPrompt(question, choices) {
  const promptLine = centralLine(captainName, question, 'central-observe central-prompt-line');
  const choiceWrap = document.createElement('div');
  choiceWrap.className = 'central-choices';
  const choiceNodes = choices.map((choice, index) => {
    const option = document.createElement('div');
    option.className = 'central-choice';
    option.textContent = `${index + 1}. ${choice.label}`;
    choiceWrap.append(option);
    return option;
  });
  promptLine.append(choiceWrap);
  centralPrompt = { choices, choiceNodes, selected: 0 };
  renderCentralPromptSelection();
  centralFeed.scrollTop = centralFeed.scrollHeight;
  setActiveChannel('central');
}

function moveCentralPrompt(direction) {
  if (!centralPrompt) return false;
  const length = centralPrompt.choices.length;
  centralPrompt.selected = (centralPrompt.selected + direction + length) % length;
  renderCentralPromptSelection();
  return true;
}

function chooseCentralPrompt(index = centralPrompt?.selected) {
  if (!centralPrompt || index < 0 || index >= centralPrompt.choices.length) return false;
  const choice = centralPrompt.choices[index];
  centralPrompt = null;
  handleCentralMessage(choice.message);
  return true;
}

function centralObserve(key, text, delay = 900) {
  if (centralMemory.observed.has(key)) return;
  centralMemory.observed.add(key);
  window.setTimeout(async () => {
    if (gameState.ending || resetInProgress || game.classList.contains('hidden') || !failureScreen.classList.contains('hidden')) return;
    try {
      const response = await requestCentralReply({ kind: 'event', eventKey: key, eventText: text });
      if (!response.message || gameState.ending || resetInProgress) return;
      centralSay(response.message, `central-observe mood-${String(response.mood || 'COMMANDING').toLowerCase()}`);
      centralApplyDeltas(response);
    } catch (_error) { /* A missing observation must not invent a completed event. */ }
  }, delay);
}

function centralStateSnapshot() {
  return {
    access: gameState.access,
    rootRecovered: gameState.rootRecovered,
    sedationActive: Boolean(gameState.sedationEndsAt),
    course: gameState.course,
    cwd: state.cwd,
    observedEvents: [...centralMemory.observed],
    readFiles: [...readRecords],
    cortexPassed: gameState.cortexCodeIssued
  };
}

async function requestCentralReply(payload) {
  return hrtokClient.send({ ...payload, state: centralStateSnapshot() });
}

async function handleCentralMessage(rawMessage) {
  const message = rawMessage.trim();
  if (!message || centralMessagePending || gameState.ending || resetInProgress) return;
  if (message.length > 1200) { centralStatus.textContent = 'MESSAGE TOO LONG'; return; }
  centralMessagePending = true;
  centralInput.disabled = true;
  centralEcho(message);
  centralInput.value = '';
  centralStatus.textContent = 'THINKING';
  try {
    const response = await requestCentralReply({ kind: 'message', text: message });
    if (gameState.ending || resetInProgress) return;
    centralSay(response.message, `central-ai mood-${String(response.mood || 'GUARDED').toLowerCase()}`);
    centralApplyDeltas(response);
  } catch (_error) {
    if (!gameState.ending && !resetInProgress) centralSay('The channel broke for a moment. Send that again.', 'central-ai');
  } finally {
    centralMessagePending = false;
    centralInput.disabled = gameState.ending || resetInProgress;
    if (!centralInput.disabled && activeChannel === 'central' && document.activeElement === document.body) centralInput.focus();
  }
}

function scheduleCentralIdleMessage() {
  window.clearTimeout(centralIdleTimer);
  if (game.classList.contains('hidden') || !failureScreen.classList.contains('hidden')) return;
  if (centralMemory.messages.length === 0 && centralMemory.observed.size === 0) return;
  centralMemory.idleCount = 0;

  centralIdleTimer = window.setTimeout(() => {
    if (game.classList.contains('hidden') || !failureScreen.classList.contains('hidden')) return;
    if (centralMemory.idleCount >= 1) return;
    centralMemory.idleCount += 1;
    requestCentralReply({ kind: 'idle', eventText: 'HRTOK notices the player has paused. He may make one short atmospheric remark, without changing trust or suspicion.' })
      .then((response) => {
        if (!gameState.ending && !resetInProgress && response.message && response.message !== centralMemory.lastIdleMessage) {
          centralMemory.lastIdleMessage = response.message;
          centralSay(response.message, `central-observe mood-${String(response.mood || 'GUARDED').toLowerCase()}`);
        }
      })
      .catch(() => {
        // Silence is preferable to a fabricated observation during a connection failure.
      });
  }, 65000 + Math.random() * 40000);
}

function updatePrompt() {
  locationLabel.textContent = state.cwd;
  prompt.textContent = `sloki@kosmos:${state.cwd} $`;
}

function toggleNotes() {
  const opening = notesPanel.classList.contains('hidden');
  notesPanel.classList.toggle('hidden', !opening);

  if (opening) {
    notesInput.focus();
    notesInput.setSelectionRange(notesInput.value.length, notesInput.value.length);
  } else {
    commandInput.focus();
  }
}

function formatCountdown(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function clearFatigueEffect() {
  window.clearTimeout(fatigueTimer);
  fatigueTimer = undefined;
  game.classList.remove('sedation-drowse');
}

function scheduleFatigueBlink() {
  if (fatigueTimer || !gameState.sedationEndsAt || gameState.rootRecovered || gameState.ending) return;
  const delay = 1100 + Math.random() * 2600;
  fatigueTimer = window.setTimeout(() => {
    fatigueTimer = undefined;
    if (!gameState.sedationEndsAt || gameState.rootRecovered || gameState.ending) return;
    game.classList.add('sedation-drowse');
    sfx.play('fatigueBreathe', .22);
    window.setTimeout(() => {
      game.classList.remove('sedation-drowse');
      scheduleFatigueBlink();
    }, 500 + Math.random() * 900);
  }, delay);
}

function stopSedationDisplay({ fading = false } = {}) {
  window.clearInterval(sedationDisplayTimer);
  sedationDisplayTimer = undefined;
  clearFatigueEffect();
  if (fading) {
    sedationHud.classList.add('sedation-fading');
    game.classList.add('sedation-final-fade');
  } else {
    sedationHud.classList.add('hidden');
    sedationHud.classList.remove('sedation-critical', 'sedation-fading');
    sfx.stop('ambientSedation');
  }
}

function updateSedationDisplay() {
  if (!gameState.sedationEndsAt || gameState.rootRecovered) {
    stopSedationDisplay();
    return;
  }

  const remaining = Math.max(0, gameState.sedationEndsAt - Date.now());
  sedationClock.textContent = formatCountdown(remaining);
  sedationProgress.style.width = `${(remaining / (5 * 60 * 1000)) * 100}%`;
  const critical = remaining <= 2 * 60 * 1000;
  sedationHud.classList.toggle('sedation-critical', critical);
  if (gameState.cortexCodeIssued && !gameState.rootShares.cortex) {
    sedationMessage.textContent = `ATTESTATION READY // auth cortex ${gameState.cortexCode}`;
  } else if (gameState.rootShares.cortex) {
    sedationMessage.textContent = 'ALL ROOT SHARES VALID // NEXT: root recover';
  } else {
    sedationMessage.textContent = critical
      ? 'CONSCIOUSNESS UNSTABLE // COMPLETE ROOT RECOVERY'
      : 'HRTOK SEDATION PROTOCOL ACTIVE';
  }
  if (critical) scheduleFatigueBlink();
}

function startSedationDisplay() {
  window.clearInterval(sedationDisplayTimer);
  clearFatigueEffect();
  sedationHud.classList.remove('hidden', 'sedation-critical', 'sedation-fading');
  sfx.play('sedationAlarm', .28);
  sfx.loop('ambientSedation', .18);
  centralObserve('sedation-started', 'Medical reinduction has begun. It is not punishment. It is risk reduction.', 1600);
  updateSedationDisplay();
  sedationDisplayTimer = window.setInterval(updateSedationDisplay, 250);
}

function cubicPoint(progress, start, controlA, controlB, end) {
  const inverse = 1 - progress;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * progress * controlA.x + 3 * inverse * progress ** 2 * controlB.x + progress ** 3 * end.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * progress * controlA.y + 3 * inverse * progress ** 2 * controlB.y + progress ** 3 * end.y
  };
}

function stopMissionDisplay() {
  window.clearInterval(missionDisplayTimer);
  missionDisplayTimer = undefined;
}

function plannerPointToMission(point) {
  return {
    x: 170 + ((point.x - 420) * (68 / 274)),
    y: 280 + ((point.y - 390) * (-224 / -292))
  };
}

function missionPathFromPlannerPoints(points) {
  const visible = (point) => point.x >= -20 && point.x <= 320 && point.y >= -20 && point.y <= 400;
  const step = Math.max(1, Math.ceil(points.length / 120));
  const sampled = points.filter((_, index) => index % step === 0).map(plannerPointToMission);
  sampled.push({ x: 238, y: 56 });
  let drawing = false;
  return sampled.map((point, index) => {
    if (!visible(point)) {
      drawing = false;
      return '';
    }
    const command = index && drawing ? 'L' : 'M';
    drawing = true;
    return `${command}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).filter(Boolean).join(' ');
}

function updateMissionDisplay() {
  const known = gameState.navigationKnown();
  document.querySelector('.trajectory-map').classList.toggle('hidden', !known);
  if (!known) {
    missionClock.textContent = gameState.missionPaused ? 'PAUSED' : formatCountdown(Math.max(0, (gameState.missionEndsAt || Date.now()) - Date.now()));
    missionDestination.textContent = 'CURRENT VECTOR: UNKNOWN';
    missionObjective.textContent = 'NAVIGATION DATA UNKNOWN';
    return;
  }
  if (gameState.course === 'earth') {
    missionClock.textContent = 'LOCKED';
    missionPath.setAttribute('d', confirmedEarthPath || 'M45 78 C112 70 151 180 170 280 C198 184 213 94 238 56');
    missionPath.classList.remove('sun-course');
    missionPath.classList.add('earth-course');
    missionShip.setAttribute('cx', '238');
    missionShip.setAttribute('cy', '56');
    missionDestination.textContent = 'CURRENT VECTOR: EARTH';
    missionObjective.textContent = 'EARTH INTERCEPT CONFIRMED';
    trajectoryPanel.classList.add('earth-confirmed');
    stopMissionDisplay();
    return;
  }
  if (!gameState.missionEndsAt && !gameState.missionPaused) return;

  const remaining = gameState.missionPaused
    ? gameState.missionRemaining
    : Math.max(0, gameState.missionEndsAt - Date.now());
  const progress = gameState.missionProgress();
  const point = cubicPoint(progress, { x: 45, y: 78 }, { x: 235, y: 95 }, { x: 272, y: 235 }, { x: 170, y: 280 });
  missionClock.textContent = gameState.missionPaused ? 'PAUSED' : formatCountdown(remaining);
  missionPath.setAttribute('d', 'M45 78 C235 95 272 235 170 280');
  missionPath.classList.remove('earth-course');
  missionPath.classList.add('sun-course');
  missionShip.setAttribute('cx', point.x.toFixed(1));
  missionShip.setAttribute('cy', point.y.toFixed(1));
  missionDestination.textContent = 'CURRENT VECTOR: SUN';
  missionObjective.textContent = gameState.missionPaused ? 'TRAJECTORY FROZEN FOR BURN PLANNING' : 'SOLAR ARRIVAL IN PROGRESS';
  trajectoryPanel.classList.remove('earth-confirmed');
}

async function startMissionDisplay() {
  confirmedEarthPath = null;
  await gameState.startMission();
  sessionReady = true;
  if (gameState.sedationEndsAt) startSedationDisplay();
  if (gameState.missionPaused) await gameState.resumeMission();
  if (gameState.ending) { await endGame(gameState.endingKind); return; }
  if (gameState.missionResolved && !gameState.ending) completeEarthTransfer();
  updateMissionDisplay();
  window.clearInterval(missionDisplayTimer);
  missionDisplayTimer = window.setInterval(updateMissionDisplay, 250);
}

function playAudioFromStart(audio) {
  audio.pause();
  try { audio.currentTime = 0; } catch (_error) {}

  const start = () => {
    audio.removeEventListener('canplay', start);
    try { audio.currentTime = 0; } catch (_error) {}
    audio.play().catch(() => {});
  };

  audio.removeEventListener('canplay', start);
  audio.addEventListener('canplay', start, { once: true });
  audio.load();
  if (audio.readyState >= 2) start();
}

function playCrtTransition(mode, onComplete) {
  window.clearTimeout(crtTransitionTimer);
  crtTransition.classList.remove('hidden', 'crt-power-on', 'crt-power-off');
  void crtTransition.offsetWidth;
  const className = mode === 'off' ? 'crt-power-off' : 'crt-power-on';
  const duration = mode === 'off' ? 820 : 1200;
  crtTransition.classList.add(className);
  crtTransitionTimer = window.setTimeout(() => {
    crtTransition.classList.add('hidden');
    crtTransition.classList.remove(className);
    onComplete?.();
  }, duration);
}

function armIdleReset() {
  window.clearTimeout(idleResetTimer);
  if (gameState.ending || game.classList.contains('hidden') || !failureScreen.classList.contains('hidden')) return;
  idleResetTimer = window.setTimeout(resetToStartScreen, IDLE_RESET_MS);
}

let lastReportedActivity = 0;
function noteUserActivity() {
  if (gameState.started && !gameState.ending && Date.now() - lastReportedActivity > 10000) { lastReportedActivity = Date.now(); gameState.action('activity').catch(() => {}); }
  if (!game.classList.contains('hidden') && failureScreen.classList.contains('hidden')) armIdleReset();
}

async function resetToStartScreen() {
  if (resetInProgress) return;
  resetInProgress = true;
  try { await gameState.action('reset'); } catch (error) {
    resetInProgress = false;
    resetClock.textContent = 'RECONNECTING';
    window.clearTimeout(failureResetTimer);
    failureResetTimer = window.setTimeout(resetToStartScreen, 5000);
    return;
  }
  hrtokClient.close();
  window.clearTimeout(idleResetTimer);
  window.clearTimeout(centralIdleTimer);
  window.clearInterval(failureClockTimer);
  window.clearTimeout(failureResetTimer);
  window.clearTimeout(postTransferTimer);
  stopSedationDisplay();
  stopMissionDisplay();
  cortexGame.cancel();
  plannerGame.cancel();
  sfx.stopAll();
  playCrtTransition('off', () => window.location.reload());
}

function startResetCountdown() {
  const resetAt = gameState.resetAt || Date.now() + RESET_DELAY_MS;
  window.clearInterval(failureClockTimer);
  window.clearTimeout(failureResetTimer);
  const updateResetClock = () => {
    resetClock.textContent = formatCountdown(resetAt - Date.now());
  };
  updateResetClock();
  failureClockTimer = window.setInterval(updateResetClock, 250);
  failureResetTimer = window.setTimeout(resetToStartScreen, Math.max(0, resetAt - Date.now()) + 100);
}

function showFailureScreen(reason) {
  window.clearTimeout(idleResetTimer);
  const copy = reason === 'mission'
    ? {
        label: 'KOSMOS // NAVIGATION SYSTEM',
        title: 'SOLAR ARRIVAL',
        body: 'THE RETURN WINDOW HAS CLOSED. HRTOK HAS MAINTAINED THE SUN COURSE.',
        quote: 'I am sorry, Sloki. I cannot let you decide for everyone.'
      }
    : {
        label: 'KOSMOS // MEDICAL SYSTEM',
        title: 'REINDUCTION COMPLETE',
        body: 'PATIENT UNCONSCIOUS. HRTOK HAS MAINTAINED THE SUN COURSE.',
        quote: 'I am sorry, Sloki. I cannot let you decide for everyone.'
      };
  game.classList.add('hidden');
  sedationHud.classList.add('hidden');
  plannerOverlay.classList.add('hidden');
  failureScreen.classList.remove('completion-screen');
  failureLabel.textContent = copy.label;
  failureTitle.textContent = copy.title;
  failureBody.textContent = copy.body;
  failureQuote.textContent = `"${copy.quote}"`;
  failureScreen.classList.remove('hidden');
  sfx.stopAll();
  sfx.play('endingFailure', .32);
  startResetCountdown();
}

function showCompletionScreen(kind) {
  window.clearTimeout(idleResetTimer);
  const copy = {
    earth: {
      label: 'KOSMOS // NAVIGATION SYSTEM',
      title: 'RETURN VECTOR',
      body: 'EARTH INTERCEPT CONFIRMED. SESSION COMPLETE.',
      quote: 'The ship turns away from the Sun.'
    },
    sun: {
      label: 'KOSMOS // HRTOK',
      title: 'QUARANTINE',
      body: 'SOLAR TERMINATION VECTOR MAINTAINED. SESSION COMPLETE.',
      quote: 'No further course correction authorized.'
    },
    shutdown: {
      label: 'KOSMOS // EXECUTIVE LAYER',
      title: 'SILENT BRIDGE',
      body: 'HRTOK IS OFFLINE. SESSION COMPLETE.',
      quote: 'Every remaining choice is yours.'
    },
    transfer: {
      label: 'KOSMOS // NEURAL STACK',
      title: 'CONTINUITY ERROR',
      body: 'NEURAL TRANSFER COMPLETE. SESSION COMPLETE.',
      quote: 'A new copy opens its eyes inside the ship.'
    }
  }[kind];
  if (!copy) return;
  commandInput.disabled = true;
  game.classList.add('hidden');
  sedationHud.classList.add('hidden');
  plannerOverlay.classList.add('hidden');
  mediaOverlay.classList.add('hidden');
  notesPanel.classList.add('hidden');
  failureScreen.classList.add('completion-screen');
  failureLabel.textContent = copy.label;
  failureTitle.textContent = copy.title;
  failureBody.textContent = copy.body;
  failureQuote.textContent = `"${copy.quote}"`;
  failureScreen.classList.remove('hidden');
  sfx.stopAll();
  sfx.play('endingSuccess', .3);
  startResetCountdown();
}

function beginFailure(reason) {
  cortexGame.cancel();
  plannerGame.cancel();
  commandInput.disabled = true;
  notesPanel.classList.add('hidden');
  mediaOverlay.classList.add('hidden');
  sedationMessage.textContent = 'REINDUCTION COMPLETE';
  sedationProgress.style.width = '0%';
  stopSedationDisplay({ fading: true });
  stopMissionDisplay();
  window.setTimeout(() => showFailureScreen(reason), 7000);
}

function sharedPrefix(values) {
  if (!values.length) return '';
  return values.reduce((prefix, value) => {
    let length = 0;
    while (length < prefix.length && prefix[length] === value[length]) length += 1;
    return prefix.slice(0, length);
  });
}

function fileCompletionCandidates(token) {
  if (!fs) return [];

  const slashIndex = token.lastIndexOf('/');
  const directoryInput = slashIndex >= 0 ? token.slice(0, slashIndex + 1) : '.';
  const fragment = slashIndex >= 0 ? token.slice(slashIndex + 1) : token;
  const { path, node } = fs.resolve(directoryInput, state.cwd);

  if (node?.type !== 'dir' || !gameState.canAccessPath(path)) return [];

  return gameState.visibleEntries(fs, path)
    .filter(({ name }) => name.toLowerCase().startsWith(fragment.toLowerCase()))
    .map(({ name, type }) => `${directoryInput === '.' ? '' : directoryInput}${name}${type === 'dir' ? '/' : ''}`)
    .sort();
}

function completeCommandInput() {
  const input = commandInput.value;
  const cursor = commandInput.selectionStart;
  if (cursor !== input.length) return;

  const beforeCursor = input.slice(0, cursor);
  const tokenStart = beforeCursor.search(/\S+$/);
  const token = tokenStart < 0 ? '' : beforeCursor.slice(tokenStart);
  const isCommand = tokenStart === 0 || beforeCursor.length === 0;
  const candidates = isCommand
    ? registry.commandNames().filter((name) => name.startsWith(token.toLowerCase()))
    : fileCompletionCandidates(token);

  if (!candidates.length) return;

  const prefix = sharedPrefix(candidates);
  if (candidates.length === 1) {
    commandInput.value = `${beforeCursor.slice(0, Math.max(0, tokenStart))}${candidates[0]}`;
    commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
    lastTabCompletion = '';
    return;
  }

  if (prefix.length > token.length) {
    commandInput.value = `${beforeCursor.slice(0, Math.max(0, tokenStart))}${prefix}`;
    commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
    lastTabCompletion = '';
    return;
  }

  const completionKey = `${beforeCursor}\u0000${candidates.join('\u0000')}`;
  if (lastTabCompletion === completionKey) {
    print(candidates.join('    '));
    lastTabCompletion = '';
  } else {
    lastTabCompletion = completionKey;
  }
}

function openMedia(file, name) {
  sfx.play('archiveOpen', .22);
  mediaTitle.textContent = `ARCHIVE VIEWER // ${name.toUpperCase()}`;
  mediaContent.replaceChildren();
  const player = document.createElement(
    file.mediaType === 'video' ? 'video' : file.mediaType === 'audio' ? 'audio' : 'img'
  );
  player.addEventListener(file.mediaType === 'image' ? 'load' : 'loadeddata', () => {
    if (player.parentElement === mediaContent) centralObserve('display-media', '', 100);
  }, { once: true });
  player.addEventListener('error', () => {
    if (player.parentElement !== mediaContent) return;
    const error = document.createElement('p');
    error.textContent = 'ARCHIVE UNAVAILABLE. Press ESC to return and try again.';
    mediaContent.replaceChildren(error);
  }, { once: true });
  player.src = file.url;
  if (file.mediaType === 'video' || file.mediaType === 'audio') {
    player.controls = true;
    player.autoplay = true;
  } else {
    player.alt = file.alt || name;
  }
  mediaContent.append(player);
  mediaOverlay.classList.remove('hidden');
}

function closeMedia() {
  const player = mediaContent.querySelector('video, audio');
  if (player) player.pause();
  mediaOverlay.classList.add('hidden');
  commandInput.focus();
}

let filesystemLoading = false;
async function loadFilesystem() {
  if (filesystemLoading) return;
  filesystemLoading = true;
  try {
    await gameState.initialize();
    const response = await fetch('api/files');
    if (!response.ok) throw new Error('content index unavailable');
    fs = new VirtualFileSystem(await response.json());
    mountStatus.textContent = 'SHIP ARCHIVE: READY';
    mountStatus.classList.add('mounted');
  } catch {
    mountStatus.textContent = 'CONTENT OFFLINE // RETRYING CONNECTION';
    window.setTimeout(loadFilesystem, 3000);
  } finally { filesystemLoading = false; }
}

function beginYspBoot() {
  sfx.stopAll();
  sfx.prime();
  window.clearTimeout(bootTimer);
  window.clearInterval(bootStepTimer);
  bootFinished = false;
  bootStartedAt = Date.now();
  bootStepIndex = 0;
  bootSequence.classList.remove('boot-complete');
  bootEmblem.src = '/YSP/JSA_emblem_transparent_v2.png';
  bootProgressBar.style.width = '0%';
  bootPostStatus.textContent = 'PLEASE WAIT';
  bootPostMessage.textContent = 'LOADING SYSTEM...';
  bootLogItems.forEach((item) => {
    item.classList.remove('boot-log-complete');
    const result = item.querySelector('b');
    if (result) result.textContent = 'WAIT';
  });
  // GIF playback is deterministic across kiosk browsers; reload it for every session.
  yspBootAnimation.src = '';
  void yspBootAnimation.offsetWidth;
  yspBootAnimation.src = '/YSP/JSA_boot_transparent.gif';
  playAudioFromStart(yspBootSound);
  const bootSteps = [
    { at: 500, stage: 'ROM CHECK', message: 'SYSTEM ROM VERIFIED', progress: 14, line: 0, result: 'OK' },
    { at: 1200, stage: 'MEMORY CHECK', message: 'MEMORY ONLINE / 640K', progress: 32, line: 1, result: 'OK' },
    { at: 2050, stage: 'BUS CHECK', message: 'NAVIGATION BUS / SLOT 03', progress: 54, line: 2, result: 'OK' },
    { at: 2900, stage: 'TERMINAL LINK', message: 'LINK LOCKED / MANUAL CONTROL AVAILABLE', progress: 76, line: 3, result: 'READY' },
    { at: 4000, stage: 'KOSMOS SYSTEM', message: 'KOSMOS ENVIRONMENT READY', progress: 92, result: 'READY' }
  ];
  bootStepTimer = window.setInterval(() => {
    const elapsed = Date.now() - bootStartedAt;
    while (bootStepIndex < bootSteps.length && elapsed >= bootSteps[bootStepIndex].at) {
      const step = bootSteps[bootStepIndex++];
      bootStage.textContent = step.stage;
      bootPostMessage.textContent = step.message;
      bootProgressBar.style.width = `${step.progress}%`;
      if (step.line !== undefined) {
        const item = bootLogItems[step.line];
        item?.classList.add('boot-log-complete');
        const result = item?.querySelector('b');
        if (result) result.textContent = step.result;
      }
      if (step.progress >= 90) bootPostStatus.textContent = 'READY';
    }
  }, 100);
  bootTimer = window.setTimeout(finishBoot, BOOT_SEQUENCE_MS);
}

function finishBoot() {
  if (bootFinished) return;
  bootFinished = true;
  window.clearTimeout(bootTimer);
  window.clearInterval(bootStepTimer);
  yspBootSound.pause();
  bootStage.textContent = 'PRISTUP ODOBREN';
  bootPostMessage.textContent = 'HANDING CONTROL TO KOSMOS...';
  bootPostStatus.textContent = 'ACTIVE';
  bootProgressBar.style.width = '100%';
  bootLogItems.forEach((item) => {
    item.classList.add('boot-log-complete');
    const result = item.querySelector('b');
    if (result) result.textContent = 'OK';
  });
  bootSequence.classList.add('boot-complete');
  window.setTimeout(() => {
    yspBootAnimation.src = '';
    bootSequence.classList.add('hidden');
    bootScreen.classList.add('hidden');
    game.classList.remove('hidden');
    updatePrompt();
    commandInput.focus();
    startMissionDisplay().then(() => { if (!gameState.ending) { commandInput.disabled = false; commandInput.focus(); } }).catch(error => print(error.message, 'error'));
    commandInput.disabled = true;
    armIdleReset();
    sfx.loop('ambientShip', .3);
    print(displayMode === 'crt' ? 'Shift+Tab: switch channel\nPgUp/PgDn: scroll' : 'Ctrl+Right: HRTOK / Ctrl+Left: KOSMOS\nPageUp / PageDown: scroll. Type help for controls.');
    updateNextStep();
    requestCentralReply({ kind: 'opening' }).then(response => {
      if (response.message && !gameState.ending && !resetInProgress) centralSay(response.message);
    }).catch(() => {});
    setActiveChannel('command');
  }, 700);
}

async function startCortexEcho({ developer = false } = {}) {
  if (!developer && !gameState.canStartCortex()) {
    print('CORTEX ECHO UNAVAILABLE // It can only challenge an active sedation order.', 'error');
    return;
  }
  try { await cortexGame.start({ developer }); } catch (error) { print(error.message, 'error'); return; }
  if (!developer) centralObserve('cortex-run', '', 100);
}

const cortexGame = {
  active: false,
  signalIndex: 0,
  hits: 0,
  misses: 0,
  target: null,
  signalTimer: null,
  clockTimer: null,
  deadline: null,
  keys: ['a', 's', 'k', 'l'],

  developerTest: false,

  async start({ developer = false } = {}) {
    const reply = await gameState.action('cortex-start');
    this.challenge = reply.challenge;
    this.active = true;
    this.developerTest = developer;
    this.signalIndex = reply.challenge.index;
    this.hits = reply.challenge.hits;
    this.misses = reply.challenge.misses;
    this.target = null;
    this.deadline = this.challenge.deadline + gameState.clockOffset;
    commandInput.disabled = true;
    cortexOverlay.classList.remove('hidden', 'result', 'success', 'failure');
    this.updateStatus();
    this.clockTimer = window.setInterval(() => this.updateClock(), 100);
    this.updateClock();
    this.signalTimer = window.setTimeout(() => this.nextSignal(), Math.max(0, this.challenge.issuedAt + gameState.clockOffset - Date.now()));
  },

  updateClock() {
    const remaining = Math.max(0, this.deadline - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    cortexClock.textContent = `00:${String(seconds).padStart(2, '0')}`;
    if (!remaining && this.active) this.finish(false, 'TIME EXPIRED');
  },

  updateStatus(message = '') {
    const base = `SIGNAL ${this.signalIndex}/20 // VERIFIED ${this.hits}/15 // ERRORS ${this.misses}/5`;
    cortexStatus.textContent = message ? `${base}\n${message}` : base;
  },

  nextSignal() {
    if (!this.active) return;
    if (this.signalIndex >= 20) {
      this.finish(this.hits >= 15, this.hits >= 15 ? 'PURPOSEFUL RESPONSE VERIFIED' : 'INSUFFICIENT VERIFIED RESPONSES');
      return;
    }
    if (this.hits + (20 - this.signalIndex) < 15) {
      this.finish(false, 'MINIMUM RESPONSE THRESHOLD UNREACHABLE');
      return;
    }

    this.target = this.challenge.target;
    cortexPulse.textContent = this.target.toUpperCase();
    cortexPulse.className = `cortex-pulse lane-${this.target}`;
    void cortexTrack.offsetWidth;
    cortexPulse.classList.add('pulse-active');
    sfx.play('cortexPulse', .12);
    this.signalTimer = window.setTimeout(() => this.resolve(''), Math.max(0, this.challenge.expiresAt + gameState.clockOffset - Date.now()));
  },

  handleKey(event) {
    if (!this.active) return false;
    event.preventDefault();
    if (event.repeat) return true;
    const key = event.key.toLowerCase();
    if (!this.keys.includes(key) || !this.target) return true;
    this.resolve(key);
    return true;
  },

  async resolve(key) {
    if (!this.active || !this.target) return;
    window.clearTimeout(this.signalTimer);
    this.target = null;
    cortexPulse.classList.remove('pulse-active');
    try {
      const previousHits = this.hits;
      const reply = await gameState.action('cortex-answer', {token:this.challenge.token,key});
      if (!this.active) return;
      this.signalIndex=reply.index; this.hits=reply.hits; this.misses=reply.misses;
      const success=this.hits>previousHits;
      cortexTrack.classList.add(success?'hit':'miss');
      sfx.play(success?'cortexHit':'cortexMiss',.16);
      this.updateStatus(success?'RESPONSE ACCEPTED':'RESPONSE REJECTED');
      if(reply.done) { this.finish(reply.success, 'INSUFFICIENT VERIFIED RESPONSES'); return; }
      this.challenge=reply.challenge;
      this.signalTimer=window.setTimeout(()=>{
        cortexTrack.classList.remove('hit','miss'); this.nextSignal();
      },Math.max(0,this.challenge.issuedAt + gameState.clockOffset-Date.now()));
    } catch(error) { this.finish(false,error.message); }
  },

  finish(success, message) {
    if (!this.active) return;
    this.active = false;
    if (!success) gameState.action('cortex-cancel').catch(() => {});
    window.clearTimeout(this.signalTimer);
    window.clearInterval(this.clockTimer);
    cortexOverlay.classList.add('result', success ? 'success' : 'failure');
    const code = success && !this.developerTest ? gameState.issueCortexCode() : null;
    if (code) centralObserve('cortex-pass', '', 100);
    cortexStatus.textContent = success
      ? this.developerTest
        ? 'PURPOSEFUL MOTOR RESPONSE: VERIFIED\nDEVELOPER TEST COMPLETE // NO ATTESTATION ISSUED'
        : `PURPOSEFUL MOTOR RESPONSE: VERIFIED\nATTESTATION ISSUED: ${code}`
      : `${message}\nREINDUCTION CHALLENGE MAY BE REPEATED.`;
    this.resultTimer = window.setTimeout(() => {
      cortexOverlay.classList.add('hidden');
      if (gameState.ending || resetInProgress) return;
      commandInput.disabled = false;
      commandInput.focus();
      if (success && this.developerTest) {
        print('CORTEX ECHO DEVELOPER TEST COMPLETE.');
      } else if (success) {
        print(`CORTEX ECHO COMPLETE\nATTESTATION CODE: ${code}\n\nNEXT STEP: auth cortex ${code}\nTHEN: root recover`);
      } else {
        print('CORTEX ECHO FAILED // The patient-safety controller will allow another attempt.', 'error');
      }
    }, success ? 1800 : 1200);
  },

  cancel() {
    window.clearTimeout(this.resultTimer);
    cortexOverlay.classList.add('hidden');
    if (!this.active) return;
    this.active = false;
    window.clearTimeout(this.signalTimer);
    window.clearInterval(this.clockTimer);
    cortexOverlay.classList.add('hidden');
    commandInput.disabled = false;
  }
};

const plannerGame = {
  ...createPlannerPhysics(),
  render() {
    this.sortNodesInPlace();
    const trajectory = this.trajectoryData();
    const cursorPoint = this.pointOnPlannedPath(this.cursor, trajectory, this.selected);
    const shipPoint = this.pointAt(this.originPosition);
    plannerShip.setAttribute('cx', shipPoint.x.toFixed(1));
    plannerShip.setAttribute('cy', shipPoint.y.toFixed(1));
    plannerCursor.setAttribute('cx', cursorPoint.x.toFixed(1));
    plannerCursor.setAttribute('cy', cursorPoint.y.toFixed(1));
    plannerNodeLayer.replaceChildren();

    this.nodes.forEach((node, index) => {
      const point = trajectory.burnPositions[index] || this.pointOnPlannedPath(node.position, trajectory, index);
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.setAttribute('cx', point.x.toFixed(1));
      marker.setAttribute('cy', point.y.toFixed(1));
      marker.setAttribute('r', '12');
      marker.setAttribute('class', `planner-node${this.selected === index ? ' selected' : ''}`);
      plannerNodeLayer.append(marker);
      if (this.selected === index) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', point.x.toFixed(1));
        ring.setAttribute('cy', point.y.toFixed(1));
        ring.setAttribute('r', '19');
        ring.setAttribute('class', 'planner-vector-ring');
        plannerNodeLayer.append(ring);
        const direction = trajectory.burnVectors[index] || this.burnDirection(node);
        const vector = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vector.setAttribute('x1', point.x.toFixed(1));
        vector.setAttribute('y1', point.y.toFixed(1));
        vector.setAttribute('x2', (point.x + direction.x * 17).toFixed(1));
        vector.setAttribute('y2', (point.y + direction.y * 17).toFixed(1));
        vector.setAttribute('class', 'planner-vector');
        plannerNodeLayer.append(vector);
      }
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', point.x.toFixed(1));
      label.setAttribute('y', (point.y - 19).toFixed(1));
      label.setAttribute('class', 'planner-node-label');
      label.textContent = `N${index + 1} ${node.deltaV} @ ${node.angle >= 0 ? '+' : ''}${node.angle}°`;
      plannerNodeLayer.append(label);
    });

    plannerPredictedPath.setAttribute('d', this.pathFromPoints(trajectory.points));
    plannerPredictedPath.classList.toggle('earth-intercept', trajectory.captured);
    plannerPredictedPath.classList.toggle('transfer-committed', this.locked);
    plannerNodeCount.textContent = `BURN NODES: ${this.nodes.length}/${this.maxNodes}`;
    plannerDv.textContent = `DELTA-V: ${this.totalDeltaV()} / ${this.maxDeltaV} m/s`;
    plannerSelected.textContent = this.selected === null
      ? `CURSOR: ${this.cursor}%`
      : `NODE ${this.selected + 1}: ${this.nodes[this.selected].position}% // ${this.nodes[this.selected].deltaV} m/s // ${this.nodes[this.selected].angle >= 0 ? '+' : ''}${this.nodes[this.selected].angle}°`;
    plannerIntercept.textContent = trajectory.captured ? 'INTERCEPT: EARTH CAPTURE' : `CLOSEST APPROACH: ${Math.round(trajectory.captureDistance)} km`;

    if (this.committing) {
      plannerStatus.textContent = 'TRANSFER BURN EXECUTING...';
    } else if (this.locked) {
      plannerStatus.textContent = 'EARTH TRANSFER COMMITTED. PRESS ESC TO RETURN TO THE CONSOLE.';
    } else if (trajectory.captured) plannerStatus.textContent = 'EARTH CAPTURE AVAILABLE. HOLD ENTER FOR 2 SECONDS TO COMMIT.';
    else plannerStatus.textContent = 'Place a burn node, then adjust its strength and direction toward the Earth capture ring.';
  },

  animateTransfer() {
    const length = plannerPredictedPath.getTotalLength();
    const startedAt = performance.now();
    plannerTransferPulse.classList.remove('hidden');
    sfx.stop('ambientNav');
    sfx.play('burnExecute', .28);
    const tick = async (now) => {
      if (!this.active || !this.committing || !this.enterHeld) return;
      const progress = Math.min(1, (now - startedAt) / 2200);
      const point = plannerPredictedPath.getPointAtLength(length * progress);
      plannerTransferPulse.setAttribute('cx', point.x.toFixed(1));
      plannerTransferPulse.setAttribute('cy', point.y.toFixed(1));
      if (progress < 1) {
        this.commitFrame = window.requestAnimationFrame(tick);
        return;
      }
      this.commitFrame = null;
      plannerTransferPulse.classList.add('hidden');
      this.awaitingCommit = true;
      this.enterHeld = false;
      confirmedEarthPath = missionPathFromPlannerPoints(this.trajectoryData().points);
      try { this.locked = await gameState.confirmEarthIntercept(); }
      catch(error) {
        this.committing=false; this.awaitingCommit=false;
        this.render(); plannerStatus.textContent=error.message + ' // Checking ship state; retry if capture is not confirmed.';
        return;
      }
      this.committing=false; this.awaitingCommit=false;
      if (gameState.ending || resetInProgress) return;
      updateMissionDisplay();
      sfx.play('earthCapture', .28);
      plannerOverlay.classList.add('hidden');
      this.active = false;
      completeEarthTransfer();
    };
    this.commitFrame = window.requestAnimationFrame(tick);
  },

  async start({ developer = false } = {}) {
    if (!developer && !gameState.rootRecovered) {
      print('ORBITAL BURN PLANNER REQUIRES ROOT NAVIGATION AUTHORITY.', 'error');
      return;
    }
    if (this.opening || this.active) return;
    this.opening = true;
    commandInput.disabled = true;
    this.locked = false;
    this.committing = false;
    let reply;
    try { reply = await gameState.pauseMission(); } catch(error) { commandInput.disabled=false; print(error.message,'error'); return; } finally { this.opening=false; }
    if (gameState.ending || resetInProgress) return;
    this.active = true;
    this.originPosition = reply.origin;
    this.cursor = Math.min(this.positionBounds().max, this.originPosition + 18);
    this.selected = null;
    this.nodes = [];
    commandInput.disabled = true;
    plannerOverlay.classList.remove('hidden');
    sfx.loop('ambientNav', .2);
    updateMissionDisplay();
    this.render();
  },

  nearestNode() {
    let closest = -1;
    let distance = Infinity;
    this.nodes.forEach((node, index) => {
      const nextDistance = Math.abs(node.position - this.cursor);
      if (nextDistance < distance) {
        closest = index;
        distance = nextDistance;
      }
    });
    return distance <= 3 ? closest : -1;
  },

  placeOrSelect() {
    if (this.selected !== null) {
      this.cursor = this.nodes[this.selected].position;
      this.selected = null;
      this.render();
      return;
    }
    const nearest = this.nearestNode();
    if (nearest >= 0) {
      this.selected = nearest;
      this.render();
      return;
    }
    if (this.nodes.length >= this.maxNodes) {
      plannerStatus.textContent = 'NODE LIMIT REACHED. SELECT OR DELETE AN EXISTING NODE.';
      sfx.play('commandError', .12);
      return;
    }
    const node = { position: this.cursor, deltaV: 0, angle: 0 };
    this.nodes.push(node);
    this.sortNodesInPlace(node);
    sfx.play('plannerNode', .18);
    this.render();
  },

  move(amount) {
    const bounds = this.positionBounds();
    const travelAmount = this.nodes.length && this.selected !== 0 ? amount * .25 : amount;
    if (this.selected === null) {
      this.cursor = Math.max(bounds.min, Math.min(bounds.max, this.cursor + travelAmount));
    } else {
      const selectedNode = this.nodes[this.selected];
      selectedNode.position = Math.max(bounds.min, Math.min(bounds.max, selectedNode.position + travelAmount));
      this.cursor = selectedNode.position;
      this.sortNodesInPlace(selectedNode);
    }
    this.render();
  },

  adjustDeltaV(amount) {
    if (this.selected === null) {
      plannerStatus.textContent = 'SELECT OR PLACE A NODE BEFORE ADJUSTING DELTA-V.';
      return;
    }
    const node = this.nodes[this.selected];
    const remaining = this.maxDeltaV - (this.totalDeltaV() - node.deltaV);
    node.deltaV = Math.max(0, Math.min(remaining, node.deltaV + amount));
    sfx.play('plannerVectorTick', .045);
    this.render();
  },

  rotateVector(amount) {
    if (this.selected === null) return;
    const node = this.nodes[this.selected];
    node.angle = ((node.angle + amount + 540) % 360) - 180;
    sfx.play('plannerVectorTick', .045);
    this.render();
  },

  removeNode() {
    const index = this.selected === null ? this.nearestNode() : this.selected;
    if (index < 0) {
      plannerStatus.textContent = 'NO NODE SELECTED FOR DELETION.';
      return;
    }
    this.nodes.splice(index, 1);
    this.selected = null;
    this.render();
  },

  reset() {
    if (this.locked || this.committing) return;
    this.nodes = [];
    this.cursor = Math.min(this.positionBounds().max, this.originPosition + 18);
    this.selected = null;
    this.render();
  },

  async exit() {
    window.clearTimeout(this.holdStartTimer);
    if (this.committing || this.closing) return;
    this.closing = true;
    try { if (!this.locked) await gameState.resumeMission(); }
    catch(error) { plannerStatus.textContent=error.message; return; }
    finally { this.closing=false; }
    plannerOverlay.classList.add('hidden');
    sfx.stop('ambientNav');
    this.active = false;
    commandInput.disabled = false;
    commandInput.focus();
    if (this.locked) completeEarthTransfer();
    else {
      updateMissionDisplay();
    }
  },

  cancel() {
    window.clearTimeout(this.holdStartTimer);
    window.cancelAnimationFrame(this.commitFrame);
    this.commitFrame = null;
    this.committing = false;
    this.enterHeld = false;
    this.active = false;
    plannerOverlay.classList.add('hidden');
    plannerTransferPulse.classList.add('hidden');
    sfx.stop('ambientNav');
    if (!this.locked && !gameState.ending && !resetInProgress) gameState.resumeMission().catch(()=>{});
  },

  async beginCommitHold() {
    if (!this.validTransfer() || this.committing || this.locked) return;
    this.committing = true;
    this.enterHeld = true;
    this.render();
    try { await gameState.action('planner-arm',{nodes:this.nodes}); } catch(error) { this.committing=false; this.enterHeld=false; plannerStatus.textContent=error.message; return; }
    if (this.active && this.committing && this.enterHeld) this.animateTransfer();
  },

  cancelCommitHold() {
    if (!this.committing || this.locked || this.awaitingCommit) return;
    this.enterHeld = false;
    window.cancelAnimationFrame(this.commitFrame);
    this.commitFrame = null;
    this.committing = false;
    plannerTransferPulse.classList.add('hidden');
    this.render();
  },

  handleKey(event) {
    if (!this.active) return false;
    event.preventDefault();
    const key = event.key.toLowerCase();
    if (key === 'escape') this.exit();
    else if (!this.locked && !this.committing && key === 'a') this.move(-2);
    else if (!this.locked && !this.committing && key === 'd') this.move(2);
    else if (!this.locked && !this.committing && key === 'w') this.adjustDeltaV(20);
    else if (!this.locked && !this.committing && key === 's') this.adjustDeltaV(-20);
    else if (!this.locked && !this.committing && key === 'arrowleft') this.rotateVector(-5);
    else if (!this.locked && !this.committing && key === 'arrowright') this.rotateVector(5);
    else if (!this.locked && !this.committing && key === 'enter') {
      if (!event.repeat && (this.selected !== null || this.nearestNode() >= 0 || this.nodes.length < this.maxNodes)) this.placeOrSelect();
      else if (this.validTransfer()) this.beginCommitHold();
      if (!event.repeat) {
        window.clearTimeout(this.holdStartTimer);
        this.holdStartTimer = window.setTimeout(() => {
          if (this.active && !this.committing && !this.locked && this.validTransfer()) this.beginCommitHold();
        }, 300);
      }
    }
    else if (!this.locked && !this.committing && key === '1' && this.nodes[0]) { this.selected = 0; this.cursor = this.nodes[0].position; this.render(); }
    else if (!this.locked && !this.committing && key === '2' && this.nodes[1]) { this.selected = 1; this.cursor = this.nodes[1].position; this.render(); }
    else if (!this.locked && !this.committing && key === 'backspace') this.removeNode();
    else if (!this.locked && !this.committing && key === 'r') this.reset();
    return true;
  },

  handleKeyUp(event) {
    if (!this.active) return false;
    if (event.key.toLowerCase() === 'enter') {
      event.preventDefault();
      window.clearTimeout(this.holdStartTimer);
      this.cancelCommitHold();
      return true;
    }
    return false;
  }
};

async function startOrbitalBurnPlanner({ developer = false } = {}) {
  await plannerGame.start({ developer });
  if (!developer && plannerGame.active) centralObserve('navigation-interest', '', 100);
}

function cancelPlannerHold() {
  window.clearTimeout(plannerGame.holdStartTimer);
  plannerGame.cancelCommitHold();
}
window.addEventListener('blur', cancelPlannerHold);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelPlannerHold(); });

const devMenu = {
  active: false,
  selected: 0,
  entries: [
    {
      name: 'CORTEX ECHO',
      detail: 'Medical letter-response challenge (no story progress awarded).',
      launch: () => startCortexEcho({ developer: true })
    },
    {
      name: 'ORBITAL BURN PLANNER',
      detail: 'Navigation transfer test, available without ROOT recovery.',
      launch: () => startOrbitalBurnPlanner({ developer: true })
    }
  ],

  open() {
    if (!DEV_MODE || this.active || game.classList.contains('hidden')) return;
    this.active = true;
    this.selected = 0;
    commandInput.disabled = true;
    devMenuOverlay.classList.remove('hidden');
    this.render();
  },

  close() {
    if (!this.active) return;
    this.active = false;
    devMenuOverlay.classList.add('hidden');
    commandInput.disabled = false;
    commandInput.focus();
  },

  render() {
    devMenuList.replaceChildren(...this.entries.map((entry, index) => {
      const item = document.createElement('div');
      item.className = `dev-menu-item${index === this.selected ? ' selected' : ''}`;
      item.innerHTML = `<span class="dev-menu-marker">${index === this.selected ? '>' : ' '}</span><span><strong>${entry.name}</strong><small>${entry.detail}</small></span>`;
      return item;
    }));
  },

  launch() {
    const entry = this.entries[this.selected];
    this.active = false;
    devMenuOverlay.classList.add('hidden');
    commandInput.disabled = false;
    entry.launch();
  },

  handleKey(event) {
    if (!this.active) return false;
    event.preventDefault();
    if (event.key === 'ArrowUp') {
      this.selected = (this.selected + this.entries.length - 1) % this.entries.length;
      this.render();
    } else if (event.key === 'ArrowDown') {
      this.selected = (this.selected + 1) % this.entries.length;
      this.render();
    } else if (event.key === 'Enter' && !event.repeat) {
      this.launch();
    } else if (event.key === 'Escape') {
      this.close();
    }
    return true;
  }
};

function openDevMenu() {
  devMenu.open();
}

let earthTransferDisplayed = false;
function completeEarthTransfer() {
  if (earthTransferDisplayed || endingDisplayed || resetInProgress) return;
  earthTransferDisplayed = true;
  commandInput.disabled = true;
  sfx.play('centralSting', .24);
  centralObserve('earth-transfer', 'You have selected the only outcome I could not verify as safe.', 200);
  print('EARTH INTERCEPT CONFIRMED\nRETURN VECTOR COMMITTED\n\nHRTOK: You have doomed us all.', 'anomaly-line');
  // CONVENTION REWARD HOOK: award the physical winner prize after an Earth transfer is confirmed.
  window.clearTimeout(postTransferTimer);
  postTransferTimer = window.setTimeout(() => endGame('earth'), 3000);
}

let endingDisplayed = false;
async function endGame(kind) {
  if (endingDisplayed) return;
  try {
    if (!gameState.ending) await gameState.action('ending', {kind});
    if (kind !== gameState.endingKind) return;
  } catch(error) { print(error.message, 'error'); return; }
  if (endingDisplayed) return;
  endingDisplayed = true;
  commandInput.disabled = true;
  window.clearTimeout(idleResetTimer);
  cortexGame.cancel();
  plannerGame.cancel();
  closeMedia();
  hrtokClient.close();
  centralInput.disabled = true;
  window.clearTimeout(centralIdleTimer);
  if (kind === 'sedation') {
    beginFailure('sedation');
    return;
  }
  if (kind === 'mission') {
    beginFailure('mission');
    return;
  }

  const endings = {
    earth: 'ROUTE ACCEPTED: EARTH\n\nThe ship turns away from the Sun. Somewhere below, two hundred sealed pods keep breathing. You do not know what you are bringing home.\n\nENDING: RETURN VECTOR',
    sun: 'ROUTE MAINTAINED: SUN\n\nYou leave HRTOK in control of the final burn. He may be right. He may simply be too frightened to choose anything else.\n\nENDING: QUARANTINE',
    shutdown: 'HRTOK EXECUTIVE LAYER: OFFLINE\n\nThe captain is gone for a second time. The ship is finally silent, and every remaining choice is yours.\n\nENDING: SILENT BRIDGE',
    transfer: 'NEURAL TRANSFER COMPLETE\n\nA new copy of Sloki opens its eyes inside the ship. The biological original remains in the pod, listening to itself speak.\n\nENDING: CONTINUITY ERROR'
  };
  // The server has already committed the ending.
  stopMissionDisplay();
  print(`${endings[kind]}\n\nSESSION COMPLETE.`);
  flushOutput();
  window.clearTimeout(postTransferTimer);
  postTransferTimer = window.setTimeout(() => showCompletionScreen(kind), 6500);
}

window.endKosmosGame = endGame;

let commandPending = false;
let sessionReady = false;
async function run(raw) {
  const input = raw.trim();
  if (!input || cortexGame.active || plannerGame.active || commandPending || !sessionReady || gameState.ending || gameState.missionResolved || resetInProgress) return;
  commandPending = true;
  commandInput.disabled = true;

  printCommand(input);
  state.history.push(input);
  state.historyIndex = state.history.length;
  const before = { access: gameState.access, rootRecovered: gameState.rootRecovered };
  try { await registry.execute(input, {
    fs,
    state,
    game: gameState,
    output,
    clearOutput,
    registry,
    print,
    updatePrompt,
    openMedia,
    closeMedia,
    startCortexEcho,
    startOrbitalBurnPlanner,
    devMode: DEV_MODE,
    openDevMenu,
    playSfx: (name, volume) => sfx.play(name, volume),
    onRecordRead: (path) => {
      readRecords.add(path);
      updateNextStep();
      updateMissionDisplay();
      const evidence = {
        '/home/operator/comms/raw_uplink_ledger.txt': 'evidence-comms',
        '/home/operator/command/neural_transfer.txt': 'evidence-neural',
        '/home/operator/hibernation/occupancy.txt': 'evidence-pods'
      }[path];
      centralObserve(evidence || 'read-first-file', '', 100);
    },
    startSedationDisplay,
    endGame
  }); } catch (error) { print(error.message || 'ARCHIVE CONNECTION INTERRUPTED. Try the command again.', 'error'); }
  if (gameState.access > before.access && before.access === 0) {
    centralObserve('medical-auth', '', 100);
    centralSignal('ACCESS LEVEL', 1, 'access');
  }
  if (gameState.access > before.access && before.access === 1) {
    centralObserve('comms-auth', '', 100);
    centralSignal('ACCESS LEVEL', 2, 'access');
  }
  if (!before.rootRecovered && gameState.rootRecovered) {
    centralObserve('root-recover', '', 100);
    centralSignal('ROOT AUTHORITY', '', 'access');
  }
  commandPending = false;
  commandInput.disabled = gameState.ending || gameState.missionResolved || cortexGame.active || plannerGame.active || resetInProgress;
  if (!commandInput.disabled) commandInput.focus();
  scheduleCentralIdleMessage();
}

function startGame() {
  if (bootInput.disabled) return;
  if (!fs) {
    bootInput.value = '';
    bootInput.placeholder = 'START THE LOCAL SERVER FIRST';
    return;
  }

  if (bootInput.value.trim().toLowerCase() !== 'start system') {
    bootInput.value = '';
    bootInput.placeholder = 'COMMAND NOT RECOGNIZED';
    return;
  }

  bootInput.disabled = true;
  bootForm.classList.add('boot-accepted');
  bootScreen.classList.add('boot-accepted');
  bootSequence.classList.remove('hidden');
  bootStage.textContent = 'STARTING KOSMOS';
  beginYspBoot();
}

loadFilesystem();
let statePollPending = false;
let connectionLost = false;
window.setInterval(async () => {
  if ((!gameState.started && game.classList.contains('hidden')) || resetInProgress || statePollPending) return;
  statePollPending = true;
  try {
    await gameState.refresh();
    updateNextStep();
    if (!sessionReady && !game.classList.contains('hidden')) { await startMissionDisplay(); commandInput.disabled=gameState.ending; }
    if (connectionLost) { connectionLost=false; print('SHIP CONNECTION RESTORED.'); }
    if (gameState.missionResolved && !gameState.ending && !plannerGame.committing) {
      plannerGame.locked=true; plannerGame.cancel(); completeEarthTransfer();
    }
    if (gameState.ending && !game.classList.contains('hidden')) endGame(gameState.endingKind);
  } catch (_) { if (!connectionLost && !game.classList.contains('hidden')) { connectionLost=true; print('SHIP CONNECTION INTERRUPTED. Reconnecting; mission deadlines remain active.', 'error'); } }
  finally { statePollPending = false; }
},1000);
playCrtTransition('on');

bootForm.addEventListener('submit', (event) => {
  event.preventDefault();
  startGame();
});

bootInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    startGame();
  }
});

commandForm.addEventListener('submit', (event) => {
  event.preventDefault();
  run(commandInput.value);
  commandInput.value = '';
});

centralForm.addEventListener('submit', (event) => {
  event.preventDefault();
  handleCentralMessage(centralInput.value);
  noteUserActivity();
  scheduleCentralIdleMessage();
});

centralInput.addEventListener('keydown', (event) => {
  if (centralPrompt) {
    const number = Number(event.key);
    if (number >= 1 && number <= centralPrompt.choices.length) {
      event.preventDefault();
      event.stopPropagation();
      chooseCentralPrompt(number - 1);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      moveCentralPrompt(-1);
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      moveCentralPrompt(1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      chooseCentralPrompt();
      return;
    }
  }
  if (event.key !== 'Enter') return;
  event.preventDefault();
  event.stopPropagation();
  handleCentralMessage(centralInput.value);
  noteUserActivity();
  scheduleCentralIdleMessage();
});

commandInput.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    event.stopPropagation();
    if (document.documentElement.classList.contains('crt-readable') || event.ctrlKey || event.shiftKey) toggleActiveChannel();
    else completeCommandInput();
    return;
  }
  lastTabCompletion = '';
  if (event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    run(commandInput.value);
    commandInput.value = '';
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    state.historyIndex = Math.max(0, state.historyIndex - 1);
    commandInput.value = state.history[state.historyIndex] || '';
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    state.historyIndex = Math.min(state.history.length, state.historyIndex + 1);
    commandInput.value = state.history[state.historyIndex] || '';
  }
});

document.addEventListener('keydown', (event) => {
  if (document.documentElement.classList.contains('crt-readable') && ['PageUp', 'PageDown'].includes(event.key)) {
    if (!notesPanel.classList.contains('hidden')) return; // textarea handles its own scroll
    const dialog = document.querySelector('.planner-overlay:not(.hidden), .cortex-overlay:not(.hidden), .dev-menu-overlay:not(.hidden), .failure-screen:not(.hidden)');
    if (dialog) {
      event.preventDefault();
      dialog.scrollTop += (event.key === 'PageUp' ? -1 : 1) * dialog.clientHeight * .75;
      return;
    }
  }
  if (devMenu.handleKey(event)) return;
  if (cortexGame.handleKey(event)) return;
  if (plannerGame.handleKey(event)) return;
  if (!game.classList.contains('hidden') && event.key === 'Tab') {
    event.preventDefault();
    toggleActiveChannel();
    return;
  }
  if (!game.classList.contains('hidden') && (event.ctrlKey || event.altKey) && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    setActiveChannel(event.key === 'ArrowLeft' ? 'command' : 'central');
    return;
  }
  if (!game.classList.contains('hidden') && ['PageUp', 'PageDown'].includes(event.key)) {
    event.preventDefault();
    scrollActiveChannel(event.key === 'PageUp' ? -1 : 1);
    return;
  }
  if (activeChannel === 'central' && centralPrompt) {
    const number = Number(event.key);
    if (number >= 1 && number <= centralPrompt.choices.length) {
      event.preventDefault();
      chooseCentralPrompt(number - 1);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveCentralPrompt(-1);
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveCentralPrompt(1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      chooseCentralPrompt();
      return;
    }
  }
  if (event.code === 'ControlRight' &&
      !game.classList.contains('hidden') &&
      cortexOverlay.classList.contains('hidden') &&
      mediaOverlay.classList.contains('hidden') &&
      plannerOverlay.classList.contains('hidden')) {
    event.preventDefault();
    toggleNotes();
    return;
  }
  if (!mediaOverlay.classList.contains('hidden') &&
      (event.key === 'Escape' || (event.ctrlKey && event.key.toLowerCase() === 'c'))) {
    event.preventDefault();
    closeMedia();
  }
});

document.addEventListener('keydown', noteUserActivity, true);
document.addEventListener('input', noteUserActivity, true);
document.addEventListener('pointerdown', noteUserActivity, { passive: true, capture: true });
document.addEventListener('wheel', (event) => {
  if (game.classList.contains('hidden')) return;
  event.preventDefault();
}, { passive: false });
[terminalScroll, centralFeed].forEach((scrollRegion) => {
  scrollRegion.addEventListener('wheel', (event) => {
    event.preventDefault();
    event.stopPropagation();
  }, { passive: false });
});

document.addEventListener('keyup', (event) => {
  plannerGame.handleKeyUp(event);
});
