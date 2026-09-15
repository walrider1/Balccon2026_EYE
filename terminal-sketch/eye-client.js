const video = document.querySelector('#eye');
const signal = document.querySelector('#signal');
const director = new EyeDirector();
// Chromium kiosk mode is controlled by the launcher, not the DOM fullscreen API.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('kiosk') === '1') {
  document.querySelector('#fullscreen').hidden = true;
}
let current = null, hold = false, lastState = null, idleIndex = 0;
let transientUntil = 0;
let mediaError = '', connectionLost = false, loadStarted = 0, retryAt = 0, generation = 0;
function showStatus() {
  signal.textContent = connectionLost ? 'SIGNAL LOST' : mediaError || (lastState?.started ? '' : 'HRTOK // STANDBY');
}
function play(scene) {
  if (!scene) return;
  if (current === scene.clip && !(retryAt && Date.now() >= retryAt)) {
    video.loop = Boolean(scene.loop); hold = Boolean(scene.hold); return;
  }
  const ticket = ++generation;
  current = scene.clip; hold = Boolean(scene.hold);
  loadStarted = Date.now(); retryAt = 0;
  video.loop = Boolean(scene.loop); video.muted = true;
  video.src = '/eye-media/' + scene.clip + '.mp4';
  transientUntil = scene.loop || scene.hold ? 0 : Date.now() + 30000;
  video.play().catch(error => {
    if (ticket !== generation || error.name === 'AbortError') return;
    mediaError = error.name === 'NotAllowedError' ? 'CLICK FULL SCREEN TO START DISPLAY' : 'EYE VIDEO UNAVAILABLE — RETRYING';
    if (error.name !== 'NotAllowedError') retryAt = Date.now() + 5000;
    showStatus();
  });
}
function idle() { play({clip: ['Idle','Idle2','Idle3','Idle4','Idle5'][idleIndex++ % 5], loop:false}); }
video.addEventListener('ended', () => {
  transientUntil = 0;
  if (hold) return;
  if (!lastState?.started) play({clip:'Sleep_standby',loop:true});
  else idle();
});
video.addEventListener('error', () => { mediaError = 'EYE VIDEO UNAVAILABLE — RETRYING'; retryAt = Date.now() + 5000; showStatus(); });
video.addEventListener('playing', () => { mediaError = ''; retryAt = 0; loadStarted = 0; showStatus(); });
document.querySelector('#fullscreen').addEventListener('click', async () => {
  try { await document.documentElement.requestFullscreen(); await video.play(); }
  catch { mediaError = 'FULL SCREEN UNAVAILABLE'; showStatus(); }
});
async function poll() {
  try {
    const response = await fetch('/api/eye?display=1', {cache:'no-store', signal:AbortSignal.timeout(3000)});
    if (!response.ok) throw new Error('signal');
    const state = await response.json();
    const scene = director.update(state);
    const changedSession = lastState?.sessionTag !== state.sessionTag;
    lastState = state;
    connectionLost = false;
    if (loadStarted && Date.now() - loadStarted > 10000 && video.readyState < 2 && !retryAt) {
      mediaError = 'EYE VIDEO LOADING — RETRYING'; retryAt = Date.now();
    }
    if (scene) play(scene);
    else if (retryAt && Date.now() >= retryAt) play({clip:current,loop:video.loop,hold});
    else if ((video.loop && current !== 'Sleep_standby') || changedSession || (Date.now() > transientUntil && video.ended && !hold)) idle();
    showStatus();
  } catch {
    connectionLost = true;
    lastState = null;
    director.previous = null;
    play({clip:'Sleep_standby',loop:true});
    showStatus();
  } finally { setTimeout(poll, 500); }
}
poll();
