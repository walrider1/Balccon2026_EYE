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
const failureLabel = document.querySelector('#failure-label');
const failureTitle = document.querySelector('#failure-title');
const failureBody = document.querySelector('#failure-body');
const failureQuote = document.querySelector('.failure-quote');
const trajectoryPanel = document.querySelector('.trajectory-panel');
const missionClock = document.querySelector('#mission-clock');
const missionPath = document.querySelector('#mission-path');
const missionShip = document.querySelector('#mission-ship');
const missionDestination = document.querySelector('#mission-destination');
const missionObjective = document.querySelector('#mission-objective');
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
const DEV_MODE = true;
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
let missionDisplayTimer;
let postTransferTimer;
let bootTimer;
let bootFinished = false;
let confirmedEarthPath = null;
const BOOT_SEQUENCE_MS = 3600;
const RESET_DELAY_MS = 60000;
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

function print(text, cls = 'system') {
  if (cls === 'error') sfx.play('commandError', .16);
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
    if (characterIndex % 8 === 0) sfx.play('terminalTick', .055, { throttleMs: 26, dropIfLoading: true });
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
      : 'CENTRAL SEDATION PROTOCOL ACTIVE';
  }
  if (critical) scheduleFatigueBlink();
}

function startSedationDisplay() {
  window.clearInterval(sedationDisplayTimer);
  clearFatigueEffect();
  sedationHud.classList.remove('hidden', 'sedation-critical', 'sedation-fading');
  sfx.play('sedationAlarm', .28);
  sfx.loop('ambientSedation', .18);
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

function startMissionDisplay() {
  confirmedEarthPath = null;
  gameState.startMission(() => window.endNereidGame('mission'));
  updateMissionDisplay();
  missionDisplayTimer = window.setInterval(updateMissionDisplay, 250);
}

function startResetCountdown() {
  const resetAt = Date.now() + RESET_DELAY_MS;
  window.clearInterval(failureClockTimer);
  window.clearTimeout(failureResetTimer);
  const updateResetClock = () => {
    resetClock.textContent = formatCountdown(resetAt - Date.now());
  };
  updateResetClock();
  failureClockTimer = window.setInterval(updateResetClock, 250);
  failureResetTimer = window.setTimeout(() => window.location.reload(), RESET_DELAY_MS);
}

function showFailureScreen(reason) {
  const copy = reason === 'mission'
    ? {
        label: 'NEREID // NAVIGATION SYSTEM',
        title: 'SOLAR ARRIVAL',
        body: 'THE RETURN WINDOW HAS CLOSED. CENTRAL HAS MAINTAINED THE SUN COURSE.',
        quote: 'I am sorry, Sloki. I cannot let you decide for everyone.'
      }
    : {
        label: 'NEREID // MEDICAL SYSTEM',
        title: 'REINDUCTION COMPLETE',
        body: 'PATIENT UNCONSCIOUS. CENTRAL HAS MAINTAINED THE SUN COURSE.',
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
  const copy = {
    earth: {
      label: 'NEREID // NAVIGATION SYSTEM',
      title: 'RETURN VECTOR',
      body: 'EARTH INTERCEPT CONFIRMED. SESSION COMPLETE.',
      quote: 'The ship turns away from the Sun.'
    },
    sun: {
      label: 'NEREID // CENTRAL',
      title: 'QUARANTINE',
      body: 'SOLAR TERMINATION VECTOR MAINTAINED. SESSION COMPLETE.',
      quote: 'No further course correction authorized.'
    },
    shutdown: {
      label: 'NEREID // EXECUTIVE LAYER',
      title: 'SILENT BRIDGE',
      body: 'CENTRAL IS OFFLINE. SESSION COMPLETE.',
      quote: 'Every remaining choice is yours.'
    },
    transfer: {
      label: 'NEREID // NEURAL STACK',
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
  sfx.stopAll();
  sfx.prime();
  window.clearTimeout(bootTimer);
  bootFinished = false;
  bootSequence.classList.remove('boot-complete');
  // GIF playback is deterministic across kiosk browsers; reload it for every session.
  yspBootAnimation.src = '';
  void yspBootAnimation.offsetWidth;
  yspBootAnimation.src = '/YSP/JSP_Boot_Up.gif';
  yspBootSound.currentTime = 0;
  yspBootSound.play().catch(() => {});
  bootTimer = window.setTimeout(finishBoot, BOOT_SEQUENCE_MS);
}

function finishBoot() {
  if (bootFinished) return;
  bootFinished = true;
  window.clearTimeout(bootTimer);
  yspBootSound.pause();
  bootStage.textContent = 'ACCESS GRANTED';
  bootSequence.classList.add('boot-complete');
  window.setTimeout(() => {
    yspBootAnimation.src = '';
    bootSequence.classList.add('hidden');
    bootScreen.classList.add('hidden');
    game.classList.remove('hidden');
    updatePrompt();
    commandInput.focus();
    startMissionDisplay();
    sfx.loop('ambientShip', .3);
    print('NEREID EMERGENCY CONSOLE // SESSION RESTORED');
    print('PATIENT: SAMUEL "SLOKI" KOVAC // ACCESS LEVEL 0');
    print('COURSE: SOLAR TERMINATION. ROOT RECOVERY REQUIRED FOR NAVIGATION.');
    registry.commands.get('help').run({ print, registry });
  }, 700);
}

function startCortexEcho({ developer = false } = {}) {
  if (!developer && !gameState.canStartCortex()) {
    print('CORTEX ECHO UNAVAILABLE // It can only challenge an active sedation order.', 'error');
    return;
  }
  cortexGame.start({ developer });
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

  start({ developer = false } = {}) {
    this.active = true;
    this.developerTest = developer;
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
    sfx.play('cortexPulse', .12);
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
      sfx.play('cortexHit', .16);
      this.updateStatus('RESPONSE ACCEPTED');
    } else {
      this.misses += 1;
      cortexTrack.classList.add('miss');
      sfx.play('cortexMiss', .16);
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
    const code = success && !this.developerTest ? gameState.issueCortexCode() : null;
    cortexStatus.textContent = success
      ? this.developerTest
        ? 'PURPOSEFUL MOTOR RESPONSE: VERIFIED\nDEVELOPER TEST COMPLETE // NO ATTESTATION ISSUED'
        : `PURPOSEFUL MOTOR RESPONSE: VERIFIED\nATTESTATION ISSUED: ${code}`
      : `${message}\nREINDUCTION CHALLENGE MAY BE REPEATED.`;
    window.setTimeout(() => {
      cortexOverlay.classList.add('hidden');
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
    if (!this.active) return;
    this.active = false;
    window.clearTimeout(this.signalTimer);
    window.clearInterval(this.clockTimer);
    cortexOverlay.classList.add('hidden');
    commandInput.disabled = false;
  }
};

const plannerGame = {
  active: false,
  locked: false,
  committing: false,
  cursor: 30,
  originPosition: 0,
  selected: null,
  nodes: [],
  maxNodes: 2,
  maxDeltaV: 600,
  sun: { x: 420, y: 390 },
  earth: { x: 694, y: 98 },
  integrationSteps: 2200,
  integrationDt: .064,
  baseVelocity: 35,
  burnVelocityScale: .18,
  solarMu: 22000,
  gravitySoftening: 2200,
  commitFrame: null,
  enterHeld: false,

  pointAt(position) {
    return cubicPoint(position / 100, { x: 76, y: 126 }, { x: 285, y: 136 }, { x: 555, y: 350 }, { x: 420, y: 390 });
  },

  totalDeltaV() {
    return this.nodes.reduce((total, node) => total + node.deltaV, 0);
  },

  sortedNodes() {
    return [...this.nodes].sort((left, right) => left.position - right.position);
  },

  sortNodesInPlace(selectedNode = this.selected === null ? null : this.nodes[this.selected]) {
    this.nodes.sort((left, right) => left.position - right.position);
    this.selected = selectedNode ? this.nodes.indexOf(selectedNode) : null;
  },

  localProgress(position) {
    return (position - this.originPosition) / Math.max(1, 100 - this.originPosition);
  },

  positionBounds() {
    const max = 99.8;
    const baseMin = Math.min(max, this.originPosition + 1);
    if (this.nodes.length && this.selected !== 0) {
      const firstNode = this.nodes[0];
      return { min: Math.min(max, firstNode.position + 1), max };
    }
    const secondNode = this.selected === 0 ? this.nodes[1] : null;
    const cappedMax = secondNode ? Math.max(baseMin, secondNode.position - 1) : max;
    const min = Math.min(cappedMax, baseMin);
    return { min, max: cappedMax };
  },

  orbitStepFor(position, firstNode = this.nodes[0]) {
    if (!firstNode) return 0;
    const span = Math.max(1, 99.8 - firstNode.position);
    const progress = Math.max(0, Math.min(1, (position - firstNode.position) / span));
    return Math.max(1, Math.min(this.integrationSteps - 1, Math.round(progress * (this.integrationSteps - 1))));
  },

  pointOnPlannedPath(position, trajectory, nodeIndex = null) {
    if (!this.nodes.length || nodeIndex === 0 || position <= this.nodes[0].position) return this.pointAt(position);
    const step = this.orbitStepFor(position, this.nodes[0]);
    const pointIndex = Math.min(trajectory.points.length - 1, trajectory.orbitStartIndex + step);
    return trajectory.points[pointIndex] || this.pointAt(position);
  },

  progradeAt(position) {
    const before = this.pointAt(Math.max(this.originPosition, position - .15));
    const after = this.pointAt(Math.min(100, position + .15));
    const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    return { x: (after.x - before.x) / length, y: (after.y - before.y) / length };
  },

  burnDirection(node) {
    const prograde = this.progradeAt(node.position);
    const heading = Math.atan2(prograde.y, prograde.x) + (node.angle * Math.PI / 180);
    return { x: Math.cos(heading), y: Math.sin(heading) };
  },

  directionFromVelocity(state, node) {
    const velocityLength = Math.hypot(state.vx, state.vy) || 1;
    const heading = Math.atan2(state.vy / velocityLength, state.vx / velocityLength) + (node.angle * Math.PI / 180);
    return { x: Math.cos(heading), y: Math.sin(heading) };
  },

  gravityAt(point) {
    const dx = this.sun.x - point.x;
    const dy = this.sun.y - point.y;
    const distanceSquared = Math.max(this.gravitySoftening, dx * dx + dy * dy);
    const distance = Math.sqrt(distanceSquared);
    return { x: this.solarMu * dx / (distanceSquared * distance), y: this.solarMu * dy / (distanceSquared * distance) };
  },

  trajectory() {
    const nodes = this.sortedNodes();
    const points = [];
    const burnPositions = [];
    const burnVectors = [];
    let orbitStartIndex = 0;

    if (!nodes.length) {
      for (let step = 0; step <= 160; step += 1) {
        const position = this.originPosition + ((100 - this.originPosition) * step / 160);
        points.push(this.pointAt(position));
      }
      return { points, burnPositions, burnVectors, orbitStartIndex };
    }

    const firstNode = nodes[0];
    const coastSteps = Math.max(8, Math.round((firstNode.position - this.originPosition) * 2.5));
    for (let step = 0; step <= coastSteps; step += 1) {
      const position = this.originPosition + ((firstNode.position - this.originPosition) * step / coastSteps);
      points.push(this.pointAt(position));
    }
    orbitStartIndex = points.length - 1;

    const burnPoint = this.pointAt(firstNode.position);
    const prograde = this.progradeAt(firstNode.position);
    const direction = this.burnDirection(firstNode);
    const state = {
      x: burnPoint.x,
      y: burnPoint.y,
      vx: prograde.x * this.baseVelocity + direction.x * firstNode.deltaV * this.burnVelocityScale,
      vy: prograde.y * this.baseVelocity + direction.y * firstNode.deltaV * this.burnVelocityScale
    };
    burnPositions[0] = { x: state.x, y: state.y };
    burnVectors[0] = direction;

    let nextNodeIndex = 1;
    for (let step = 0; step < this.integrationSteps; step += 1) {
      while (nextNodeIndex < nodes.length && step >= this.orbitStepFor(nodes[nextNodeIndex].position, firstNode)) {
        const nextNode = nodes[nextNodeIndex];
        const nextDirection = this.directionFromVelocity(state, nextNode);
        state.vx += nextDirection.x * nextNode.deltaV * this.burnVelocityScale;
        state.vy += nextDirection.y * nextNode.deltaV * this.burnVelocityScale;
        burnPositions[nextNodeIndex] = { x: state.x, y: state.y };
        burnVectors[nextNodeIndex] = nextDirection;
        nextNodeIndex += 1;
      }
      const acceleration = this.gravityAt(state);
      state.vx += acceleration.x * this.integrationDt;
      state.vy += acceleration.y * this.integrationDt;
      state.x += state.vx * this.integrationDt;
      state.y += state.vy * this.integrationDt;
      points.push({ x: state.x, y: state.y });
    }

    return { points, burnPositions, burnVectors, orbitStartIndex };
  },

  captureDistance(points) {
    let nearest = Infinity;
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const denominator = dx * dx + dy * dy || 1;
      const projection = Math.max(0, Math.min(1, ((this.earth.x - start.x) * dx + (this.earth.y - start.y) * dy) / denominator));
      const closestX = start.x + dx * projection;
      const closestY = start.y + dy * projection;
      nearest = Math.min(nearest, Math.hypot(this.earth.x - closestX, this.earth.y - closestY));
    }
    return nearest;
  },

  trajectoryData() {
    const { points, burnPositions, burnVectors, orbitStartIndex } = this.trajectory();
    const captureDistance = this.captureDistance(points);
    return { points, burnPositions, burnVectors, orbitStartIndex, captureDistance, captured: captureDistance <= 33 };
  },

  validTransfer() {
    return this.trajectoryData().captured;
  },

  pathFromPoints(points) {
    const isVisible = (point) => point.x >= -80 && point.x <= 900 && point.y >= -60 && point.y <= 560;
    let drawing = false;
    return points.map((point, index) => {
      if (!isVisible(point)) {
        drawing = false;
        return '';
      }
      const command = index && drawing ? 'L' : 'M';
      drawing = true;
      return `${command}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }).filter(Boolean).join(' ');
  },

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
  },

  animateTransfer() {
    const length = plannerPredictedPath.getTotalLength();
    const startedAt = performance.now();
    plannerTransferPulse.classList.remove('hidden');
    sfx.stop('ambientNav');
    sfx.play('burnExecute', .28);
    const tick = (now) => {
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
      this.committing = false;
      this.enterHeld = false;
      confirmedEarthPath = missionPathFromPlannerPoints(this.trajectoryData().points);
      this.locked = gameState.confirmEarthIntercept();
      updateMissionDisplay();
      sfx.play('earthCapture', .28);
      plannerOverlay.classList.add('hidden');
      this.active = false;
      completeEarthTransfer();
    };
    this.commitFrame = window.requestAnimationFrame(tick);
  },

  start({ developer = false } = {}) {
    if (!developer && !gameState.rootRecovered) {
      print('ORBITAL BURN PLANNER REQUIRES ROOT NAVIGATION AUTHORITY.', 'error');
      return;
    }
    this.active = true;
    this.locked = false;
    this.committing = false;
    gameState.pauseMission();
    this.originPosition = gameState.missionProgress() * 100;
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

  exit() {
    if (this.committing) return;
    plannerOverlay.classList.add('hidden');
    sfx.stop('ambientNav');
    this.active = false;
    commandInput.disabled = false;
    commandInput.focus();
    if (this.locked) completeEarthTransfer();
    else {
      gameState.resumeMission();
      updateMissionDisplay();
    }
  },

  cancel() {
    window.cancelAnimationFrame(this.commitFrame);
    this.commitFrame = null;
    this.committing = false;
    this.enterHeld = false;
    this.active = false;
    plannerOverlay.classList.add('hidden');
    plannerTransferPulse.classList.add('hidden');
    sfx.stop('ambientNav');
    if (!this.locked && !gameState.ending) gameState.resumeMission();
  },

  beginCommitHold() {
    if (!this.validTransfer() || this.committing || this.locked) return;
    this.committing = true;
    this.enterHeld = true;
    this.render();
    this.animateTransfer();
  },

  cancelCommitHold() {
    if (!this.committing || this.locked) return;
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
      this.cancelCommitHold();
      return true;
    }
    return false;
  }
};

function startOrbitalBurnPlanner({ developer = false } = {}) {
  plannerGame.start({ developer });
}

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

function completeEarthTransfer() {
  sfx.play('centralSting', .24);
  print('EARTH INTERCEPT CONFIRMED\nRETURN VECTOR COMMITTED\n\nCENTRAL: You have doomed us all.', 'anomaly-line');
  // CONVENTION REWARD HOOK: award the physical winner prize after an Earth transfer is confirmed.
  window.clearTimeout(postTransferTimer);
  postTransferTimer = window.setTimeout(() => endGame('earth'), 3000);
}

function endGame(kind) {
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
    sun: 'ROUTE MAINTAINED: SUN\n\nYou leave CENTRAL in control of the final burn. It may be right. It may simply be too frightened to choose anything else.\n\nENDING: QUARANTINE',
    shutdown: 'CENTRAL EXECUTIVE LAYER: OFFLINE\n\nThe captain is gone for a second time. The ship is finally silent, and every remaining choice is yours.\n\nENDING: SILENT BRIDGE',
    transfer: 'NEURAL TRANSFER COMPLETE\n\nA new copy of Sloki opens its eyes inside the ship. The biological original remains in the pod, listening to itself speak.\n\nENDING: CONTINUITY ERROR'
  };
  gameState.finish();
  stopMissionDisplay();
  print(`${endings[kind]}\n\nSESSION COMPLETE.`);
  window.clearTimeout(postTransferTimer);
  postTransferTimer = window.setTimeout(() => showCompletionScreen(kind), 6500);
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
    startOrbitalBurnPlanner,
    devMode: DEV_MODE,
    openDevMenu,
    playSfx: (name, volume) => sfx.play(name, volume),
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
  if (devMenu.handleKey(event)) return;
  if (cortexGame.handleKey(event)) return;
  if (plannerGame.handleKey(event)) return;
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

document.addEventListener('keyup', (event) => {
  plannerGame.handleKeyUp(event);
});
