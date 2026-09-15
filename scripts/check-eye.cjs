const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.EYE_URL || 'http://localhost:5173';
(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname,'../terminal-sketch/eye-media/manifest.json'),'utf8'));
  assert.equal(manifest.length,27);
  for (const clip of manifest) {
    const response = await fetch(base+'/eye-media/'+clip.file,{headers:{Range:'bytes=0-31'}});
    assert.equal(response.status,206,clip.file);
    assert.equal(response.headers.get('content-type'),'video/mp4',clip.file);
    assert.equal((await response.arrayBuffer()).byteLength,32,clip.file);
    assert.ok(response.headers.get('content-range').endsWith('/'+clip.bytes),clip.file);
  }
  const anonymous = await fetch(base+'/api/eye');
  assert.deepEqual(await anonymous.json(),{started:false});
  assert.equal(anonymous.headers.get('set-cookie'),null);
  console.log('27/27 eye videos served with correct MIME and byte ranges; observer does not create a game.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
