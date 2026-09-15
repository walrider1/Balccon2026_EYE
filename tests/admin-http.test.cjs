const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const {spawn} = require('node:child_process');
const {hashPassword} = require('../terminal-sketch/admin-service');

test('administrator HTTP login, isolated reset, logout and server stop require authority', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eye-http-test-'));
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const password = 'temporary-test-password';
  fs.writeFileSync(path.join(directory, 'admin.json'), JSON.stringify(hashPassword(password)));
  const child = spawn(process.execPath, [path.join(__dirname, '../terminal-sketch/server.js')], {
    env: {...process.env, PORT:String(port), EYE_STATE_DIR:directory, OPENAI_API_KEY:''}, windowsHide:true, stdio:['ignore','pipe','pipe']
  });
  try {
    await new Promise((resolve,reject) => {
      const timeout=setTimeout(()=>reject(new Error('Test server startup timed out')),10000);
      child.once('error',reject); child.stdout.on('data',data=>{if(String(data).includes('running at')){clearTimeout(timeout);resolve();}});
    });
    const base=`http://localhost:${port}`;
    const standby = await fetch(base+'/api/eye');
    assert.deepEqual(await standby.json(), {started:false});
    assert.equal(standby.headers.get('set-cookie'), null);
    assert.equal((await fetch(base+'/api/eye',{method:'POST'})).status,405);
    assert.equal((await fetch(base+'/eye.html')).status,200);
    assert.equal((await fetch(base+'/ai-budget.js')).status,404);
    const media='/audio/sfx/cortex_hit.wav';
    const expected=fs.readFileSync(path.join(__dirname,'../terminal-sketch',media));
    const head=await fetch(base+media,{method:'HEAD'});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),expected.length);assert.equal((await head.arrayBuffer()).byteLength,0);
    const partial=await fetch(base+media,{headers:{Range:'bytes=0-9'}});assert.equal(partial.status,206);assert.equal(partial.headers.get('content-range'),`bytes 0-9/${expected.length}`);assert.deepEqual(Buffer.from(await partial.arrayBuffer()),expected.subarray(0,10));
    const suffix=await fetch(base+media,{headers:{Range:'bytes=-5'}});assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),expected.subarray(-5));
    assert.equal((await fetch(base+media,{headers:{Range:'bytes=999999999-'}})).status,416);
    assert.equal((await fetch(base+'/styles.css',{method:'POST'})).status,405);
    let cookie='';
    const post=async(action,fields={},headers={})=>fetch(base+'/api/admin',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,...headers},body:JSON.stringify({action,...fields})});
    for(const action of ['status','reset','stop','logout']) assert.equal((await post(action)).status,401);
    assert.equal((await post('login',{password:'bad'})).status,401);
    assert.equal((await post('login',{password},{Origin:'http://untrusted.example'})).status,403);
    const login=await post('login',{password});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
    const admin=login.headers.get('set-cookie').split(';')[0];
    const session=await fetch(base+'/api/game');const oldState=await session.json();
    cookie=admin+'; '+session.headers.get('set-cookie').split(';')[0];
    const eye = await (await fetch(base+'/api/eye',{headers:{Cookie:cookie}})).json();
    assert.equal(eye.sessionTag,oldState.sessionTag);
    assert.equal('rootShares' in eye,false); assert.equal('readFiles' in eye,false);
    await fetch(base+'/api/game/action',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({action:'start'})});
    const display = await (await fetch(base+'/api/eye?display=1')).json();
    assert.equal(display.started,true);
    assert.equal(display.sessionTag,oldState.sessionTag);
    assert.deepEqual(await (await fetch(base+'/api/eye')).json(),{started:false});
    const status=await (await post('status')).json();assert.equal(status.game.access,0);assert.equal(JSON.stringify(status).includes(password),false);
    assert.equal(status.history.total,0);
    const reset=await post('reset');assert.equal(reset.status,200);cookie=admin+'; '+reset.headers.get('set-cookie').split(';')[0];
    assert.notEqual((await (await post('status')).json()).game.sessionTag,oldState.sessionTag);
    assert.equal((await (await fetch(base+'/api/eye?display=1')).json()).started,false);
    assert.equal((await (await post('status')).json()).history.runs[0].outcome,'abandoned');
    for(const name of ['admin-service.js','../.runtime/admin.json']) assert.notEqual((await fetch(base+'/'+name)).status,200);
    assert.equal((await post('logout')).status,200);assert.equal((await post('reset')).status,401);
    const again=await post('login',{password});cookie=again.headers.get('set-cookie').split(';')[0];
    assert.equal((await post('stop')).status,200);
    const exit=await new Promise(resolve=>child.once('exit',resolve));assert.equal(exit,0);
    assert.ok(fs.existsSync(path.join(directory,'game-sessions.json')));
  } finally {
    if(child.exitCode===null) {child.kill();await new Promise(resolve=>child.once('exit',resolve));}
    fs.rmSync(directory,{recursive:true});
  }
});
