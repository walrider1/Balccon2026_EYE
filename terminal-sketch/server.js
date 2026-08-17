const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { centralReply } = require('./central-ai');

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

    if (requestUrl.pathname === '/api/files') {
      const index = await buildContentIndex();
      send(response, 200, JSON.stringify(index), 'application/json; charset=utf-8');
      return;
    }

    if (requestUrl.pathname === '/api/central') {
      if (request.method !== 'POST') {
        send(response, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
        return;
      }
      const payload = await readJsonBody(request);
      const reply = await centralReply(payload);
      send(response, 200, JSON.stringify(reply), 'application/json; charset=utf-8');
      return;
    }

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

    const body = await fs.promises.readFile(filePath);
    const normalizedFilePath = filePath.toLowerCase();
    const type = normalizedFilePath.endsWith('.wav')
      ? 'audio/wav'
      : normalizedFilePath.endsWith('.ogg')
      ? 'audio/ogg'
      : mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    send(response, 200, body, type);
  } catch (error) {
    send(response, 404, 'Not found', 'text/plain; charset=utf-8');
  }
});

server.listen(port, () => {
  console.log(`KOSMOS terminal running at http://localhost:${port}`);
});
