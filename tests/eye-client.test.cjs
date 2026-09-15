const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { EyeDirector } = require('../terminal-sketch/eye-director');
test('video failure stays visible across successful state polls and retries loading', async () => {
  let now = 1000, loads = 0;
  const handlers = {}, status = {textContent:''};
  const video = {loop:false,readyState:0,ended:false,play:()=>Promise.resolve(),addEventListener:(name,fn)=>{handlers[name]=fn;},set src(value){loads++;}};
  const context = vm.createContext({ EyeDirector, Date:{now:()=>now}, AbortSignal:{timeout:()=>null},
    setTimeout:()=>{}, fetch:async()=>({ok:true,json:async()=>({started:false})}),
    document:{querySelector:s=>s==='#eye'?video:s==='#signal'?status:{addEventListener:()=>{}}} });
  vm.runInContext(fs.readFileSync(require.resolve('../terminal-sketch/eye-client.js'),'utf8'),context);
  await new Promise(setImmediate);
  handlers.error();
  await vm.runInContext('poll()',context);
  assert.match(status.textContent,/UNAVAILABLE/);
  const before = loads; now+=6000;
  await vm.runInContext('poll()',context);
  assert.equal(loads,before+1);
  handlers.playing();
  assert.equal(status.textContent,'HRTOK // STANDBY');
});
