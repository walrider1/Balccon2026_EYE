const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { parseRange } = require('./http-range');

function loadLocalEnv() {
  const candidates = [
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '.env')
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadLocalEnv();

const { centralReply, centralStatus } = require('./central-ai');
const eyeReplies = new Map();
let displaySessionId = null;
let displayEpoch = 0;
const { createGameService } = require('./game-service');
const stateDirectory = path.resolve(process.env.EYE_STATE_DIR || path.resolve(__dirname, '../.runtime'));
const games = createGameService({ storage: path.join(stateDirectory, 'game-sessions.json') });
const { createAdminService } = require('./admin-service');
const admin = createAdminService({ credentialFile: path.join(stateDirectory, 'admin.json') });
function adminCookie(response, value, seconds = 600) {
  response.setHeader('Set-Cookie', `eye_admin=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${seconds}`);
}
function sessionId(request) {
  return (request.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('eye_session='))?.slice(12);
}
function setSession(response, id) {
  response.setHeader('Set-Cookie', `eye_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
}

const port = Number(process.env.PORT) || 5173;
const root = path.resolve(__dirname);
const contentRoot = path.join(root, 'content');
const mediaTypes = {
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.mp3': 'audio',
  '.mp4': 'video'
};
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.app': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4'
};

function urlFor(relativePath) {
  return `content/${relativePath.split(path.sep).map(encodeURIComponent).join('/')}`;
}

async function buildContentIndex(directory = contentRoot, relativePath = '') {
  const children = {};
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    // Legacy URLs stay readable for saved sessions; the new introduction has two records.
    if (relativePath.replace(/\\/g, '/') === 'home/operator/medical' && ['patient_intake.txt','medbay_audit.txt','identity_limits.txt','patient_safety.txt'].includes(entry.name)) continue;
    if (relativePath.replace(/\\/g, '/') === 'home/operator/comms' && ['crew_announcement.txt','lock_audit.txt','raw_uplink_ledger.txt'].includes(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    const nextRelativePath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      children[entry.name] = {
        type: 'dir',
        children: (await buildContentIndex(absolutePath, nextRelativePath)).children
      };
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (extension === '.txt') {
      children[entry.name] = { type: 'file', url: urlFor(nextRelativePath) };
    } else if (extension === '.app') {
      children[entry.name] = { type: 'app', url: urlFor(nextRelativePath) };
    } else if (mediaTypes[extension]) {
      children[entry.name] = {
        type: 'media',
        mediaType: mediaTypes[extension],
        url: urlFor(nextRelativePath)
      };
    }
  }

  return { type: 'dir', children };
}

function send(response, status, body, type) {
  response.writeHead(status, { 'Content-Type': type });
  response.end(body);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 12000) {
        request.destroy();
        reject(new Error('Request body too large'));
      }
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://localhost:${port}`);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(request.headers.host) ||
        (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`)) {
      send(response, 403, 'Origin rejected', 'text/plain'); return;
    }
    let id = sessionId(request);
    if (requestUrl.pathname === '/api/eye') {
      if (request.method !== 'GET') { send(response, 405, '{}', 'application/json'); return; }
      // The installation display follows the terminal, even in another browser profile.
      if (requestUrl.searchParams.get('display') === '1' && games.has(displaySessionId)) id = displaySessionId;
      const s = games.has(id) ? games.snapshot(id) : null;
      send(response, 200, JSON.stringify(s ? { sessionTag: s.sessionTag + ':' + displayEpoch, started: s.started,
        endingKind: s.endingKind, rootRecovered: s.rootRecovered, sedationEndsAt: s.sedationEndsAt,
        readCount: s.readFiles.length, ai: eyeReplies.get(id) || null } : { started: false }), 'application/json');
      return;
    }
    if (requestUrl.pathname === '/api/admin') {
      if (request.method !== 'POST') { send(response, 405, '{}', 'application/json'); return; }
      const payload = await readJsonBody(request);
      const token = (request.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('eye_admin='))?.slice(10);
      if (payload?.action === 'login') {
        adminCookie(response, admin.login(payload.password));
        send(response, 200, '{}', 'application/json'); return;
      }
      admin.requireSession(token);
      if (payload?.action === 'status') {
        send(response, 200, JSON.stringify({game: games.has(id) ? games.snapshot(id) : null, ai: centralStatus(), history: games.history()}), 'application/json'); return;
      }
      if (payload?.action === 'logout') {
        admin.logout(token); adminCookie(response, '', 0); send(response, 200, '{}', 'application/json'); return;
      }
      if (payload?.action === 'reset') {
        const result = games.operatorReset(id); setSession(response, result.newId);
        if (displaySessionId === id) displaySessionId = result.newId;
        send(response, 200, '{}', 'application/json'); return;
      }
      if (payload?.action === 'stop') {
        send(response, 200, '{}', 'application/json');
        server.close(); setTimeout(() => process.exit(0), 300); return;
      }
      send(response, 400, JSON.stringify({error:'Unknown administrator action.'}), 'application/json'); return;
    }
    if (requestUrl.pathname === '/api/game' && request.method === 'GET') {
      if (!games.has(id)) { id = games.create(); setSession(response, id); }
      displaySessionId = id;
      send(response, 200, JSON.stringify(games.snapshot(id)), 'application/json'); return;
    }
    if (requestUrl.pathname === '/api/game/action' && request.method === 'POST') {
      const action = await readJsonBody(request);
      const result = games.action(id, action);
      if (action.action === 'start' || action.action === 'reset') displayEpoch++;
      displaySessionId = result.newId || id;
      if (result.newId) { setSession(response, result.newId); delete result.newId; }
      send(response, 200, JSON.stringify(result), 'application/json'); return;
    }

    if (requestUrl.pathname === '/api/files') {
      const index = await buildContentIndex();
      send(response, 200, JSON.stringify(index), 'application/json; charset=utf-8');
      return;
    }

    if (requestUrl.pathname === '/api/central/status') {
      send(response, 200, JSON.stringify(centralStatus()), 'application/json; charset=utf-8');
      return;
    }

    if (requestUrl.pathname === '/api/central') {
      if (request.method !== 'POST') {
        send(response, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
        return;
      }
      try {
        if (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`) {
          send(response, 403, JSON.stringify({ error: 'origin_rejected' }), 'application/json; charset=utf-8');
          return;
        }
        const payload = await readJsonBody(request);
        if (!payload || typeof payload !== 'object') throw new Error('invalid_request');
        const state = games.narrative(id);
        if (payload.kind === 'event' && !games.authorizeEvent(id, payload.eventKey)) {
          send(response, 200, JSON.stringify({ message: '', skipped: true }), 'application/json'); return;
        }
        if (eyeReplies.size >= 64 && !eyeReplies.has(id)) eyeReplies.delete(eyeReplies.keys().next().value);
        eyeReplies.set(id, { ...eyeReplies.get(id), pendingUntil: Date.now() + 16000 });
        let reply;
        try { reply = await centralReply({ ...payload, sessionId: id, state, eventText: '' }); }
        finally { const visual = eyeReplies.get(id); if (visual) visual.pendingUntil = 0; }
        if (!reply.skipped) eyeReplies.set(id, { at: Date.now(), mood: reply.mood, intent: reply.intent, pendingUntil: 0 });
        send(response, 200, JSON.stringify(reply), 'application/json; charset=utf-8');
      } catch (error) {
        if (!response.destroyed) send(response, error.status || 400, JSON.stringify({ error: error.code || 'invalid_request' }), 'application/json; charset=utf-8');
      }
      return;
    }

    if (!['GET', 'HEAD'].includes(request.method)) { send(response, 405, 'Method not allowed', 'text/plain'); return; }
    const isYspAsset = requestUrl.pathname === '/YSP' || requestUrl.pathname.startsWith('/YSP/');
    const staticRoot = isYspAsset ? path.resolve(root, '..', 'YSP') : root;
    const relativePath = isYspAsset
      ? requestUrl.pathname.slice('/YSP'.length) || '/'
      : requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
    const requestedPath = decodeURIComponent(relativePath);
    const filePath = path.resolve(staticRoot, `.${requestedPath}`);
    if (filePath !== staticRoot && !filePath.startsWith(`${staticRoot}${path.sep}`)) {
      send(response, 403, 'Forbidden', 'text/plain; charset=utf-8');
      return;
    }

    // AI internals and environment files must never be served to the terminal.
    const relativeFile = path.relative(staticRoot, filePath).replace(/\\/g, '/').toLowerCase();
    const publicFiles = ['relay-patch.js', 'eye.html', 'eye.css', 'eye-client.js', 'eye-director.js', 'index.html', 'styles.css', 'app.js', 'game-client.js', 'planner-physics.js', 'commands.js', 'command-registry.js', 'virtual-fs.js', 'central-client.js', 'admin.html', 'admin-client.js'];
    const isEyeMedia = /^eye-media\/[a-z0-9_]+\.mp4$/.test(relativeFile) || relativeFile === 'eye-media/manifest.json';
    if (!isYspAsset && !publicFiles.includes(relativeFile) && !isEyeMedia && !relativeFile.startsWith('content/') && !relativeFile.startsWith('audio/')) {
      send(response, 404, 'Not found', 'text/plain'); return;
    }
    if (relativeFile.includes(':') || relativeFile.split('/').some(part => part.startsWith('.') && !(part === '.bonus' && relativeFile.startsWith('content/home/operator/.bonus/'))) ||
        (!isYspAsset && (relativeFile.startsWith('ai/') || ['server.js', 'central-ai.js', 'central-character.js'].includes(relativeFile)))) {
      send(response, 404, 'Not found', 'text/plain; charset=utf-8');
      return;
    }

    const virtualPath = relativeFile.startsWith('content/') ? `/${relativeFile.slice(8)}` : null;
    if (virtualPath && !games.canRead(id, virtualPath)) { send(response, 403, 'Archive access denied', 'text/plain'); return; }
    if (virtualPath === '/home/operator/command/recovered_review.txt') {
      const memo = games.replayMemo(id);
      if (request.method === 'GET') games.recordRead(id, virtualPath);
      response.setHeader('Content-Length', Buffer.byteLength(memo));
      send(response, 200, request.method === 'HEAD' ? '' : memo, 'text/plain; charset=utf-8'); return;
    }
    const realPath = await fs.promises.realpath(filePath);
    if (!realPath.toLowerCase().startsWith(`${staticRoot}${path.sep}`.toLowerCase())) throw new Error('outside_root');
    const stat = await fs.promises.stat(realPath);
    if (!stat.isFile()) { send(response, 404, 'Not found', 'text/plain'); return; }
    if(virtualPath && virtualPath.endsWith('.txt')) {
      const text=games.renderArchive(id,virtualPath,await fs.promises.readFile(realPath,'utf8'));
      if(request.method==='GET')games.recordRead(id,virtualPath);
      response.setHeader('Cache-Control','no-store');
      response.setHeader('Content-Length',Buffer.byteLength(text));
      send(response,200,request.method==='HEAD'?'':text,'text/plain; charset=utf-8');return;
    }
    const range = request.method === 'HEAD' ? null : parseRange(request.headers.range, stat.size);
    if (range === false) {
      response.setHeader('Content-Range', `bytes */${stat.size}`);
      send(response, 416, 'Range not satisfiable', 'text/plain'); return;
    }
    if (virtualPath && request.method === 'GET') games.recordRead(id, virtualPath);
    const normalizedFilePath = filePath.toLowerCase();
    const type = normalizedFilePath.endsWith('.wav')
      ? 'audio/wav'
      : normalizedFilePath.endsWith('.ogg')
      ? 'audio/ogg'
      : mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Content-Type', type);
    response.setHeader('Content-Length', range ? range.end - range.start + 1 : stat.size);
    if (range) response.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${stat.size}`);
    if (request.method === 'HEAD') { response.writeHead(200); response.end(); return; }
    const stream = fs.createReadStream(realPath, range || {});
    stream.once('open', () => { response.writeHead(range ? 206 : 200); stream.pipe(response); });
    stream.once('error', () => {
      if (response.headersSent) response.destroy();
      else { response.removeHeader('Content-Length'); send(response, 503, 'Archive unavailable', 'text/plain'); }
    });
    response.once('close', () => stream.destroy());
  } catch (error) {
    const api = request.url.startsWith('/api/');
    if (api && !error.status) console.error(`API request failed: ${error.code || error.name}`);
    if (!response.destroyed) send(response, error.status || (error instanceof SyntaxError ? 400 : api ? 500 : 404), JSON.stringify({ error: error.status ? error.message : 'Request unavailable' }), 'application/json');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`KOSMOS terminal running at http://localhost:${port}`);
});
