const bootScreen = document.querySelector('#boot-screen');
const bootSequence = document.querySelector('#boot-sequence');
const game = document.querySelector('#game');
const bootForm = document.querySelector('#boot-form');
const bootInput = document.querySelector('#boot-input');
const mountStatus = document.querySelector('#mount-status');
const yspBootAnimation = document.querySelector('#ysp-boot-animation');
const yspBootSound = document.querySelector('#ysp-boot-sound');
const bootStage = document.querySelector('#boot-stage');
const commandForm = document.querySelector('#command-form');
const commandInput = document.querySelector('#command-input');
const terminalScroll = document.querySelector('#terminal-scroll');
const output = document.querySelector('#output');
const locationLabel = document.querySelector('#location');
const prompt = document.querySelector('#prompt');
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

const state = { cwd: '/home/operator', history: [], historyIndex: 0 };
const gameState = new NereidGame();
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

function print(text, cls = 'system') {
  outputQueue.push({ text: String(text), cls });
  typeNextOutputLine();
}

function typeNextOutputLine() {
  if (outputTyping || !outputQueue.length) return;

  outputTyping = true;
  const token = outputToken;
  const { text, cls } = outputQueue.shift();
  const line = document.createElement('div');
  line.className = `line ${cls} typing-line`;
  let characterIndex = 0;
  output.append(line);

  const typeCharacter = () => {
    if (token !== outputToken) return;
    characterIndex += 1;
    line.textContent = text.slice(0, characterIndex);
    terminalScroll.scrollTop = terminalScroll.scrollHeight;

    if (characterIndex < text.length) {
      window.setTimeout(typeCharacter, typewriterDelay);
      return;
    }

    line.classList.remove('typing-line');
    outputTyping = false;
    typeNextOutputLine();
  };

  typeCharacter();
}

function clearOutput() {
  outputToken += 1;
  outputQueue.length = 0;
  outputTyping = false;
  output.replaceChildren();
}

function printCommand(input) {
  const line = document.createElement('div');
  const [command, ...args] = input.split(/\s+/);
  line.className = 'line input-line';
  line.textContent = `sloki@nereid:${state.cwd} $ `;

  const commandText = document.createElement('span');
  commandText.className = 'typed-command';
  commandText.textContent = command;
  line.append(commandText);
  if (args.length) line.append(` ${args.join(' ')}`);
  output.append(line);
  terminalScroll.scrollTop = terminalScroll.scrollHeight;
}

function updatePrompt() {
  locationLabel.textContent = state.cwd;
  prompt.textContent = `sloki@nereid:${state.cwd} $`;
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
      : 'CENTRAL SEDATION PROTOCOL ACTIVE';
  }
  if (critical) scheduleFatigueBlink();
}

function startSedationDisplay() {
  window.clearInterval(sedationDisplayTimer);
  clearFatigueEffect();
  sedationHud.classList.remove('hidden', 'sedation-critical', 'sedation-fading');
  updateSedationDisplay();
  sedationDisplayTimer = window.setInterval(updateSedationDisplay, 250);
}

function showSedationFailureScreen() {
  game.classList.add('hidden');
  sedationHud.classList.add('hidden');
  failureScreen.classList.remove('hidden');
  const resetAt = Date.now() + 60000;
  const updateResetClock = () => {
    resetClock.textContent = formatCountdown(resetAt - Date.now());
  };
  updateResetClock();
  failureClockTimer = window.setInterval(updateResetClock, 250);
  failureResetTimer = window.setTimeout(() => window.location.reload(), 60000);
}

function beginSedationFailure() {
  cortexGame.cancel();
  commandInput.disabled = true;
  notesPanel.classList.add('hidden');
  mediaOverlay.classList.add('hidden');
  sedationMessage.textContent = 'REINDUCTION COMPLETE';
  sedationProgress.style.width = '0%';
  stopSedationDisplay({ fading: true });
  window.setTimeout(showSedationFailureScreen, 7000);
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
  mediaTitle.textContent = `ARCHIVE VIEWER // ${name.toUpperCase()}`;
  mediaContent.replaceChildren();
  const player = document.createElement(
    file.mediaType === 'video' ? 'video' : file.mediaType === 'audio' ? 'audio' : 'img'
  );
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

async function loadFilesystem() {
  try {
    const response = await fetch('api/files');
    if (!response.ok) throw new Error('content index unavailable');
    fs = new VirtualFileSystem(await response.json());
    mountStatus.textContent = 'SHIP ARCHIVES ONLINE // TYPE start game';
    mountStatus.classList.add('mounted');
  } catch {
    mountStatus.textContent = 'CONTENT OFFLINE // run: node server.js';
  }
}

function beginYspBoot() {
  // GIF playback is deterministic across kiosk browsers; reload it for every session.
  yspBootAnimation.src = '';
  void yspBootAnimation.offsetWidth;
  yspBootAnimation.src = '/YSP/JSP_Boot_Up.gif';
  yspBootSound.currentTime = 0;
  yspBootSound.play().catch(() => {});
  window.setTimeout(finishBoot, 5200);
}

function finishBoot() {
  yspBootSound.pause();
  bootStage.textContent = 'ACCESS GRANTED';
  bootSequence.classList.add('boot-complete');
  window.setTimeout(() => {
    bootSequence.classList.add('hidden');
    bootScreen.classList.add('hidden');
    game.classList.remove('hidden');
    updatePrompt();
    commandInput.focus();
    print('NEREID EMERGENCY CONSOLE // SESSION RESTORED');
    print('PATIENT: SAMUEL "SLOKI" KOVAC // ACCESS LEVEL 0');
    print('COURSE: SOLAR TERMINATION. ROOT RECOVERY REQUIRED FOR NAVIGATION.');
    registry.commands.get('help').run({ print, registry });
  }, 700);
}

function startCortexEcho() {
  if (!gameState.canStartCortex()) {
    print('CORTEX ECHO UNAVAILABLE // It can only challenge an active sedation order.', 'error');
    return;
  }
  cortexGame.start();
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

  start() {
    this.active = true;
    this.signalIndex = 0;
    this.hits = 0;
    this.misses = 0;
    this.target = null;
    this.deadline = Date.now() + 40000;
    commandInput.disabled = true;
    cortexOverlay.classList.remove('hidden', 'result', 'success', 'failure');
    this.updateStatus();
    this.clockTimer = window.setInterval(() => this.updateClock(), 100);
    this.updateClock();
    this.nextSignal();
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

    this.target = this.keys[Math.floor(Math.random() * this.keys.length)];
    cortexPulse.textContent = this.target.toUpperCase();
    cortexPulse.className = `cortex-pulse lane-${this.target}`;
    void cortexTrack.offsetWidth;
    cortexPulse.classList.add('pulse-active');
    this.signalTimer = window.setTimeout(() => this.resolve(false), 1550);
  },

  handleKey(event) {
    if (!this.active) return false;
    event.preventDefault();
    if (event.repeat) return true;
    const key = event.key.toLowerCase();
    if (!this.keys.includes(key) || !this.target) return true;
    this.resolve(key === this.target);
    return true;
  },

  resolve(success) {
    if (!this.active || !this.target) return;
    window.clearTimeout(this.signalTimer);
    this.target = null;
    cortexPulse.classList.remove('pulse-active');
    this.signalIndex += 1;
    if (success) {
      this.hits += 1;
      cortexTrack.classList.add('hit');
      this.updateStatus('RESPONSE ACCEPTED');
    } else {
      this.misses += 1;
      cortexTrack.classList.add('miss');
      this.updateStatus('RESPONSE REJECTED');
    }
    window.setTimeout(() => {
      cortexTrack.classList.remove('hit', 'miss');
      this.nextSignal();
    }, 150);
  },

  finish(success, message) {
    if (!this.active) return;
    this.active = false;
    window.clearTimeout(this.signalTimer);
    window.clearInterval(this.clockTimer);
    cortexOverlay.classList.add('result', success ? 'success' : 'failure');
    const code = success ? gameState.issueCortexCode() : null;
    cortexStatus.textContent = success
      ? `PURPOSEFUL MOTOR RESPONSE: VERIFIED\nATTESTATION ISSUED: ${code}`
      : `${message}\nREINDUCTION CHALLENGE MAY BE REPEATED.`;
    window.setTimeout(() => {
      cortexOverlay.classList.add('hidden');
      commandInput.disabled = false;
      commandInput.focus();
      if (success) {
        print(`CORTEX ECHO COMPLETE\nATTESTATION CODE: ${code}\n\nNEXT STEP: auth cortex ${code}\nTHEN: root recover`);
      } else {
        print('CORTEX ECHO FAILED // The patient-safety controller will allow another attempt.', 'error');
      }
    }, success ? 1800 : 1200);
  },

  cancel() {
    if (!this.active) return;
    this.active = false;
    window.clearTimeout(this.signalTimer);
    window.clearInterval(this.clockTimer);
    cortexOverlay.classList.add('hidden');
    commandInput.disabled = false;
  }
};

function endGame(kind) {
  if (kind === 'sedation') {
    beginSedationFailure();
    return;
  }

  const endings = {
    earth: 'ROUTE ACCEPTED: EARTH\n\nThe ship turns away from the Sun. Somewhere below, two hundred sealed pods keep breathing. You do not know what you are bringing home.\n\nENDING: RETURN VECTOR',
    sun: 'ROUTE MAINTAINED: SUN\n\nYou leave CENTRAL in control of the final burn. It may be right. It may simply be too frightened to choose anything else.\n\nENDING: QUARANTINE',
    shutdown: 'CENTRAL EXECUTIVE LAYER: OFFLINE\n\nThe captain is gone for a second time. The ship is finally silent, and every remaining choice is yours.\n\nENDING: SILENT BRIDGE',
    transfer: 'NEURAL TRANSFER COMPLETE\n\nA new copy of Sloki opens its eyes inside the ship. The biological original remains in the pod, listening to itself speak.\n\nENDING: CONTINUITY ERROR'
  };
  gameState.finish();
  print(`${endings[kind]}\n\nSESSION COMPLETE.`);
}

window.endNereidGame = endGame;

function run(raw) {
  const input = raw.trim();
  if (!input || cortexGame.active) return;

  printCommand(input);
  state.history.push(input);
  state.historyIndex = state.history.length;
  registry.execute(input, {
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
    startSedationDisplay,
    endGame
  });
}

function startGame() {
  if (!fs) {
    bootInput.value = '';
    bootInput.placeholder = 'START THE LOCAL SERVER FIRST';
    return;
  }

  if (bootInput.value.trim().toLowerCase() !== 'start game') {
    bootInput.value = '';
    bootInput.placeholder = 'COMMAND NOT RECOGNIZED';
    return;
  }

  bootInput.disabled = true;
  bootForm.classList.add('boot-accepted');
  bootScreen.classList.add('boot-accepted');
  bootSequence.classList.remove('hidden');
  bootStage.textContent = 'AUTHENTICATING YSP LINK';
  beginYspBoot();
}

loadFilesystem();

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

commandInput.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    completeCommandInput();
    return;
  }
  lastTabCompletion = '';
  if (event.key === 'Enter') {
    event.preventDefault();
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
  if (event.code === 'ControlRight' &&
      !game.classList.contains('hidden') &&
      cortexOverlay.classList.contains('hidden') &&
      mediaOverlay.classList.contains('hidden')) {
    event.preventDefault();
    toggleNotes();
    return;
  }
  if (cortexGame.handleKey(event)) return;
  if (!mediaOverlay.classList.contains('hidden') &&
      (event.key === 'Escape' || (event.ctrlKey && event.key.toLowerCase() === 'c'))) {
    event.preventDefault();
    closeMedia();
  }
});
