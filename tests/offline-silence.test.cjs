const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('terminal-sketch/app.js','utf8');
test('Earth transfer after shutdown has only system telemetry, no AI speech or sting',()=>{
 for(const aiOffline of [true,false]){
  const rows=[],sounds=[],events=[];
  const ctx=vm.createContext({gameState:{aiOffline},endingDisplayed:false,resetInProgress:false,commandInput:{},sfx:{play:(...a)=>sounds.push(a)},centralObserve:(...a)=>events.push(a),print:t=>rows.push(t),window:{clearTimeout(){},setTimeout(){}},postTransferTimer:null});
  vm.runInContext(source.slice(source.indexOf('let earthTransferDisplayed ='),source.indexOf('let endingDisplayed =')),ctx);
  vm.runInContext('completeEarthTransfer()',ctx);
  assert.match(rows[0],/EARTH INTERCEPT CONFIRMED/);
  assert.equal(rows[0].includes('HRTOK:'),!aiOffline);assert.equal(events.length,aiOffline?0:1);assert.equal(sounds.length,aiOffline?0:1);
 }
});
test('offline AI does not send requests and drops replies in flight at shutdown',async()=>{
 let calls=0,deliver;const gameState={aiOffline:true};
 const ctx=vm.createContext({gameState,centralStateSnapshot:()=>({}),hrtokClient:{send:()=>{calls++;return new Promise(r=>deliver=r);}}});
 vm.runInContext(source.slice(source.indexOf('async function requestCentralReply('),source.indexOf('async function handleCentralMessage(')),ctx);
 assert.equal((await ctx.requestCentralReply({})).skipped,true);assert.equal(calls,0);
 gameState.aiOffline=false;const pending=ctx.requestCentralReply({});gameState.aiOffline=true;deliver({message:'Late reply'});assert.equal((await pending).message,'');
});
test('hidden anomaly command cannot speak through KOSMOS after shutdown',()=>{
 const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync('terminal-sketch/commands.js','utf8'),ctx);
 const command=ctx.createCommands().find(c=>c.name==='anomaly'),rows=[];
 command.run({game:{aiOffline:true},arg:'earth',print:t=>rows.push(t)});assert.equal(rows.length,0);
});
