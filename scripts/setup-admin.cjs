// Run from a local interactive terminal. Passwords never enter arguments or logs.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { hashPassword } = require('../terminal-sketch/admin-service');
const file = path.resolve(process.env.EYE_STATE_DIR || path.join(__dirname, '../.runtime'), 'admin.json');
function secret(label) {
  return new Promise(resolve => {
    process.stdout.write(label);
    let value = '';
    process.stdin.setRawMode(true); process.stdin.resume();
    function key(text, key = {}) {
      if (key.ctrl && key.name === 'c') { process.stdin.setRawMode(false); process.exit(1); }
      if (key.name === 'return') {
        process.stdin.removeListener('keypress', keypress); process.stdin.setRawMode(false); process.stdin.pause();
        process.stdout.write('\n'); resolve(value); return;
      }
      if (key.name === 'backspace') value = value.slice(0, -1);
      else if (!key.ctrl && !key.meta && text && !/[\r\n\x00-\x1f]/.test(text)) value += text;
    }
    const keypress = key;
    process.stdin.on('keypress', keypress);
  });
}
(async () => {
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal.');
  if (fs.existsSync(file)) throw new Error('An administrator password already exists. Stop the server and move .runtime/admin.json to a secure backup to replace it.');
  readline.emitKeypressEvents(process.stdin);
  const password = await secret('New administrator password (12–200 characters, hidden): ');
  const record = hashPassword(password);
  if (password !== await secret('Repeat password: ')) throw new Error('Passwords did not match. Nothing saved.');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(record), { flag: 'wx', mode: 0o600 });
  console.log('Administrator password saved as a salted hash. Open http://localhost:5173/admin.html');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
