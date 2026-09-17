const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createGameService}=require('../terminal-sketch/game-service');
const {createCharacter,prepareTurn,allowedFacts}=require('../terminal-sketch/central-character');
const {createCentralService}=require('../terminal-sketch/central-ai');
test('unread Botany evidence cannot trigger speculative model content',async()=>{
 const ai=createCentralService({env:{OPENAI_API_KEY:'test'},fetch:()=>assert.fail('Unseen evidence must stay local')});
 const reply=await ai.reply({sessionId:'unread_lore_session',requestId:'one',kind:'message',text:'What happened in Botany?',state:{access:2,readFiles:[]}});
 assert.equal(reply.source,'local');assert.equal(reply.fallbackReason,'unread_evidence');
});
test('completed run survives reset/restart, is counted once, and excludes credentials',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eye-history-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const storage=path.join(dir,'state.json');let now=1000;
 let api=createGameService({storage,now:()=>now});const id=api.create();api.action(id,{action:'start'});
 now+=21*60000;api.snapshot(id);api.snapshot(id);
 assert.equal(api.history().total,1);assert.equal(api.history().runs[0].outcome,'mission');
 assert.equal(api.history().runs[0].durationMs,20*60000);
 api.operatorReset(id);api=createGameService({storage,now:()=>now});
 assert.equal(api.history().total,1);assert.equal(JSON.stringify(api.history()).includes(id),false);
 assert.equal(JSON.stringify(api.history()).includes('cortexCode'),false);
 const copy=api.history();copy.runs[0].outcome='altered';assert.equal(api.history().runs[0].outcome,'mission');
});
test('operator reset records abandoned runs but ignores unused boot sessions',()=>{
 let now=1000;const api=createGameService({now:()=>now});let id=api.create();id=api.operatorReset(id).newId;
 assert.equal(api.history().total,0);api.action(id,{action:'start'});now+=3000;api.operatorReset(id);
 assert.equal(api.history().runs[0].outcome,'abandoned');assert.equal(api.history().runs[0].durationMs,3000);
});
test('legacy session file migrates without losing the active session',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eye-migrate-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const storage=path.join(dir,'state.json');const first=createGameService({storage});const id=first.create();
 fs.writeFileSync(storage,JSON.stringify(JSON.parse(fs.readFileSync(storage)).sessions));
 const next=createGameService({storage});assert.equal(next.has(id),true);next.action(id,{action:'start'});
 assert.equal(JSON.parse(fs.readFileSync(storage)).version,2);
});
test('new lore is access gated and only read evidence enters AI knowledge',()=>{
 const api=createGameService();const id=api.create();api.action(id,{action:'start'});
 assert.equal(api.canRead(id,'/home/operator/botany/sector_log.txt'),false);
 assert.equal(api.canRead(id,'/home/operator/food/quarantine_report.txt'),false);
 const c=createCharacter();const readFiles=['/home/operator/botany/sector_log.txt','/home/operator/food/quarantine_report.txt'];
 prepareTurn(c,{kind:'message',text:'Botany?',state:{access:0,readFiles}});
 assert.equal(allowedFacts(c).some(f=>f.id==='botany'),false);
 prepareTurn(c,{kind:'message',text:'Botany?',state:{access:2,readFiles}});
 assert.ok(allowedFacts(c).some(f=>f.id==='botany'));assert.ok(allowedFacts(c).some(f=>f.id==='food'));
});
test('history is bounded to 500 runs',()=>{
 const api=createGameService();let id=api.create();
 for(let i=0;i<505;i++){api.action(id,{action:'start'});id=api.operatorReset(id).newId;}
 assert.equal(api.history().total,500);assert.equal(api.history().outcomes.abandoned,500);
});
test('failed save rolls back both ending and its history entry',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eye-history-fail-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let now=1000;const storage=path.join(dir,'state.json');const api=createGameService({storage,now:()=>now});
 const id=api.create();api.action(id,{action:'start'});now+=21*60000;
 const rename=fs.renameSync;fs.renameSync=()=>{const e=new Error('disk');e.code='EIO';throw e;};
 try{assert.throws(()=>api.snapshot(id));assert.equal(api.history().total,0);}finally{fs.renameSync=rename;}
 api.snapshot(id);assert.equal(api.history().total,1);
});

test('general crew questions withhold facts before evidence and defend documented facts afterwards',async()=>{
 const ai=createCentralService({env:{}});
 const base={sessionId:'crew_disclosure_test',kind:'message',text:'What happened to the people?'};
 const before=await ai.reply({...base,requestId:'before',state:{access:0,readFiles:[]}});
 assert.equal(before.fallbackReason,'unread_evidence');
 assert.doesNotMatch(before.message,/203|dead|killed/i);
 const after=await ai.reply({...base,requestId:'after',state:{access:2,readFiles:['/home/operator/hibernation/occupancy.txt']}});
 assert.match(after.message,/203 sealed pods/);
 assert.match(after.message,/I kept that running/);
});
