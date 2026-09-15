const crypto = require('node:crypto');
const fs = require('node:fs');

function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) throw new Error('Use a password with 12–200 characters.');
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(password, salt, 32).toString('hex') };
}

function createAdminService({ credentialFile, now = Date.now }) {
  const sessions = new Map();
  let attempts = [];
  function configured() { return fs.existsSync(credentialFile); }
  function login(password) {
    if (!configured()) throw Object.assign(new Error('Run node scripts/setup-admin.cjs in the local terminal first.'), { status: 503 });
    attempts = attempts.filter(t => now() - t < 60000);
    if (attempts.length >= 5) throw Object.assign(new Error('Too many attempts. Wait one minute.'), { status: 429 });
    attempts.push(now());
    const record = JSON.parse(fs.readFileSync(credentialFile, 'utf8'));
    if (typeof password !== 'string' || password.length > 200 || !crypto.timingSafeEqual(Buffer.from(record.hash, 'hex'), crypto.scryptSync(password, record.salt, 32))) {
      throw Object.assign(new Error('Invalid password.'), { status: 401 });
    }
    for (const [id, end] of sessions) if (end <= now()) sessions.delete(id);
    if (sessions.size >= 16) sessions.delete(sessions.keys().next().value);
    const token = crypto.randomBytes(32).toString('base64url');
    sessions.set(token, now() + 10 * 60000);
    return token;
  }
  function requireSession(token) {
    if (!token || !sessions.has(token) || sessions.get(token) <= now()) {
      sessions.delete(token);
      throw Object.assign(new Error('Administrator sign-in required.'), { status: 401 });
    }
  }
  function logout(token) { sessions.delete(token); }
  return { configured, login, requireSession, logout };
}
module.exports = { createAdminService, hashPassword };
