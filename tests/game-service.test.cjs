const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), os=require('node:os'), path=require('node:path');
const {createGameService}=require('../terminal-sketch/game-service');
const {createPlannerPhysics}=require('../terminal-sketch/planner-physics');
function fixture(storage) { let time=1000000; const service=createGameService({now:()=>time,storage}); const id=service.create(); const act=(action,data={})=>service.action(id,{action,...data}); act('start'); return {service,id,act,advance:n=>time+=n,now:()=>time}; }
function credential(f,domain) { return f.service.renderArchive(f.id,domain==='medical'?'/home/operator/medical/doctor_note.txt':'/home/operator/comms/evidence.txt',domain==='medical'?'MR-07-0412':'F-184-2317'); }
function medical(f) { const r=f.act('authorize',{domain:'medical',code:credential(f,'medical')});assert.equal(r.neuralRequired,true);assert.equal(r.state.access,0);const c=f.act('medical-start').challenge;assert.equal(f.act('medical-submit',{token:c.token,values:c.target}).state.access,1); }
function link(f) {
 const c=f.act('comms-start').challenge;let frequency=0;
 for(;frequency<=100;frequency++){if(f.act('comms-submit',{token:c.token,frequency}).quality===100)break;}
 let result;for(let i=0;i<13;i++){f.advance(500);result=f.act('comms-submit',{token:c.token,frequency});if(result.complete)break;}
 return result;
}
function comms(f) {medical(f);f.act('authorize',{domain:'comms',code:credential(f,'comms')});link(f);}
function cortex(f) {let r=f.act('cortex-start'); for(let i=0;i<20;i++) {f.advance(Math.max(0,r.challenge.issuedAt-f.now())); r=f.act('cortex-answer',{token:r.challenge.token,key:r.challenge.target});} assert.equal(r.success,true);return r.state.cortexCode;}
function root(f) {comms(f);f.act('authorize',{domain:'cortex',code:cortex(f)});assert.equal(f.act('root').ok,true);}
test('server rejects skipped steps and hides attestation; ignores forged state',()=>{ const f=fixture();assert.equal(f.service.snapshot(f.id).cortexCode,null); assert.equal(f.act('root',{access:3}).ok,false);assert.throws(()=>f.act('ending',{kind:'shutdown'}),/ROOT/);assert.throws(()=>f.act('cortex-start'),/SEDATION/);assert.throws(()=>f.act('planner-start'),/ROOT/);assert.equal(f.service.canRead(f.id,'/home/operator/comms/raw_uplink_ledger.txt'),false); medical(f);assert.equal(f.service.canRead(f.id,'/home/operator/comms/raw_uplink_ledger.txt'),true);assert.equal(f.service.canRead(f.id,'/home/operator/command/navigation/legacy_flight_manual.txt'),false);});
test('Cortex checks signal freshness, real score and grants random attestation',()=>{const f=fixture();comms(f);let r=f.act('cortex-start');const token=r.challenge.token;r=f.act('cortex-answer',{token,key:r.challenge.target});assert.throws(()=>f.act('cortex-answer',{token,key:'a'}),/STALE/);assert.throws(()=>f.act('cortex-answer',{token:r.challenge.token,key:r.challenge.target}),/NOT YET/);f.act('cortex-cancel');const code=cortex(f);assert.match(code,/^CORTEX-[0-9A-F]{6}$/);f.act('authorize',{domain:'cortex',code});assert.equal(f.act('root').ok,true);assert.equal(f.service.snapshot(f.id).sedationEndsAt,null);});
test('Cortex fails on missed threshold and can retry',()=>{const f=fixture();comms(f);let r=f.act('cortex-start');for(let i=0;i<6;i++){f.advance(1800);r=f.act('cortex-answer',{token:r.challenge.token,key:''});}assert.equal(r.done,true);assert.equal(r.success,false);assert.equal(r.state.cortexCode,null);assert.ok(f.act('cortex-start').challenge);});
test('deadlines survive restart, expired session cannot authorize, reset is gated',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eye-test-'));try{const storage=path.join(dir,'sessions.json'),f=fixture(storage);comms(f);f.advance(300001);const restored=createGameService({now:f.now,storage});assert.equal(restored.snapshot(f.id).endingKind,'sedation');assert.throws(()=>restored.action(f.id,{action:'authorize',domain:'cortex',code:'CORTEX-9D3'}),/ACTIVE/);assert.throws(()=>restored.action(f.id,{action:'reset'}),/NOT YET/);f.advance(60001);assert.equal(restored.action(f.id,{action:'reset'}).state.access,0);}finally{fs.rmSync(dir,{recursive:true});}});
test('mission restart does not reset deadline; voluntary endings require evidence',()=>{const f=fixture();const original=f.service.snapshot(f.id).missionEndsAt;f.advance(10000);f.act('start');assert.equal(f.service.snapshot(f.id).missionEndsAt,original);root(f);assert.throws(()=>f.act('ending',{kind:'earth'}),/NOT VERIFIED/);assert.throws(()=>f.act('ending',{kind:'transfer'}),/NOT DISCOVERED/);f.service.recordRead(f.id,'/home/operator/command/neural_transfer.txt');f.act('ending',{kind:'transfer'});assert.equal(f.service.snapshot(f.id).endingKind,'transfer');});
test('planner validates actual physics, hold time, budget, and pause/resume',()=>{const f=fixture();root(f);let r=f.act('planner-start');const origin=r.origin;f.advance(20000);assert.equal(f.service.snapshot(f.id).missionPaused,true);assert.throws(()=>f.act('planner-commit'),/INCOMPLETE/);assert.throws(()=>f.act('planner-arm',{nodes:[{position:origin+10,deltaV:601,angle:0}]}),/INVALID/);const physics=createPlannerPhysics();physics.originPosition=origin;let solution;for(let p=origin+2;p<90&&!solution;p+=4)for(let v=40;v<=600&&!solution;v+=40)for(let angle=-180;angle<180;angle+=10){const nodes=[{position:p,deltaV:v,angle}];physics.nodes=nodes;if(physics.validTransfer()){solution=nodes;break;}}assert.ok(solution,'a real capture exists');f.act('planner-arm',{nodes:solution});assert.throws(()=>f.act('planner-commit'),/INCOMPLETE/);f.advance(2200);assert.equal(f.act('planner-commit').state.course,'earth');f.act('ending',{kind:'earth'});assert.equal(f.service.snapshot(f.id).endingKind,'earth');});
test('CTF time, evidence and retry are checked independently of root',()=>{const f=fixture();assert.throws(()=>f.act('ctf-start'),/LEVEL 2/);comms(f);f.act('ctf-start');assert.throws(()=>f.act('flag',{flag:'EYE{SIGNAL_WITNESS_CONTINUITY}'}),/REJECTED/);for(const folder of ['comms','engineering','command'])f.service.recordRead(f.id,`/home/operator/${folder}/forensic_fragment.txt`);f.advance(120000);assert.throws(()=>f.act('flag',{flag:'EYE{SIGNAL_WITNESS_CONTINUITY}'}),/CLOSED/);f.act('ctf-start');assert.equal(f.act('flag',{flag:'EYE{SIGNAL_WITNESS_CONTINUITY}'}).state.ctf.completed,true);assert.equal(f.service.snapshot(f.id).rootRecovered,false);});
test('hints progress and authorization attempts are limited',()=>{const f=fixture();assert.match(f.act('hint').message,/HINT/);assert.match(f.act('hint').message,/2\/3/);assert.match(f.act('hint').message,/3\/3/);assert.match(f.act('hint').message,/3\/3/);for(let i=0;i<8;i++)f.act('authorize',{domain:'medical',code:'bad'});assert.throws(()=>f.act('authorize',{domain:'medical',code:'bad'}),/RATE LIMITED/);});
for(const kind of ['sun','shutdown','transfer']) test(`${kind} ending is final, idempotent and resets to a clean session`,()=>{
 const f=fixture();root(f);if(kind==='transfer') f.service.recordRead(f.id,'/home/operator/command/neural_transfer.txt');
 const end=f.act('ending',{kind}).state;assert.equal(end.endingKind,kind);assert.equal(f.act('ending',{kind}).state.resetAt,end.resetAt);
 assert.throws(()=>f.act('hint'),/ACTIVE/);f.advance(60001);const reset=f.act('reset');assert.equal(reset.state.started,false);assert.equal(reset.state.access,0);assert.equal(reset.state.cortexCode,null);assert.deepEqual(reset.state.readFiles,[]);assert.notEqual(reset.state.sessionTag,end.sessionTag);
});
test('mission failure, idle reset and planner pause use server deadlines',()=>{
 const f=fixture();f.advance(900001);assert.equal(f.service.snapshot(f.id).endingKind,'mission');
 const idle=fixture();idle.advance(300001);assert.equal(idle.act('reset').state.started,false);
 const p=fixture();root(p);const remaining=p.act('planner-start').state.missionRemaining;p.advance(950000);assert.equal(p.service.snapshot(p.id).ending,false);const resumed=p.act('planner-exit').state;assert.equal(resumed.missionEndsAt,p.now()+remaining);p.advance(remaining+1);assert.equal(p.service.snapshot(p.id).endingKind,'mission');
});
test('hint and objective follow the attestation and ROOT transitions',()=>{
 const f=fixture();assert.equal(f.service.snapshot(f.id).objective.phase,1);medical(f);assert.equal(f.service.snapshot(f.id).objective.phase,2);f.act('authorize',{domain:'comms',code:credential(f,'comms')});link(f);assert.equal(f.service.snapshot(f.id).objective.phase,3);const code=cortex(f);assert.ok(f.act('hint').message.includes(code));f.act('authorize',{domain:'cortex',code});assert.match(f.act('hint').message,/root recover/);f.act('root');assert.match(f.service.snapshot(f.id).objective.text,/decision_brief/);
});
test('Cortex can resume the current signal without erasing score',()=>{
 const f=fixture();comms(f);const first=f.act('cortex-start').challenge;f.act('cortex-answer',{token:first.token,key:first.target});const restored=f.act('cortex-start').challenge;assert.equal(restored.index,1);assert.equal(restored.hits,1);assert.notEqual(restored.token,first.token);
});
test('CTF reports remaining time and completed status without restarting',()=>{
 const f=fixture();root(f);assert.throws(()=>f.act('flag',{flag:'x'}),/CLOSED/);f.act('ctf-start');f.advance(30000);assert.match(f.act('ctf-start').message,/01:30/);for(const folder of ['comms','engineering','command'])f.service.recordRead(f.id,`/home/operator/${folder}/forensic_fragment.txt`);f.act('flag',{flag:'EYE{SIGNAL_WITNESS_CONTINUITY}'});f.advance(130000);assert.match(f.act('ctf-start').message,/ALREADY VERIFIED/);assert.throws(()=>f.act('flag',{flag:'x'}),/ALREADY VERIFIED/);
});
test('a full session pool still allows replacement for the next player',()=>{
 const f=fixture();for(let i=1;i<64;i++)f.service.create();assert.throws(()=>f.service.create(),/CAPACITY/);f.advance(300001);const next=f.act('reset');assert.equal(next.state.access,0);assert.equal(f.service.has(f.id),false);
});
test('Earth commit finishes after a lost reply and cannot switch outcome',()=>{
 const f=fixture();root(f);const origin=f.act('planner-start').origin;const p=createPlannerPhysics();p.originPosition=origin;let nodes;
 for(let v=40;v<=600&&!nodes;v+=40)for(let angle=-180;angle<180;angle+=10){p.nodes=[{position:origin+2,deltaV:v,angle}];if(p.validTransfer()){nodes=p.nodes;break;}}
 assert.ok(nodes);f.act('planner-arm',{nodes});f.advance(2100);f.act('planner-commit');assert.equal(f.act('planner-commit').state.missionResolved,true);assert.throws(()=>f.act('ending',{kind:'sun'}),/IRREVERSIBLE/);f.advance(3001);assert.equal(f.service.snapshot(f.id).endingKind,'earth');
});
test('expired mission keeps its actual deadline across an offline interval',()=>{
 const f=fixture();const deadline=f.service.snapshot(f.id).missionEndsAt;f.advance(1000000);const ended=f.service.snapshot(f.id);assert.equal(ended.endingKind,'mission');assert.equal(ended.resetAt,deadline+60000);assert.equal(f.act('reset').state.access,0);
});
test('failed durable authorization is rolled back before the next read',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'eye-durable-'));const storage=path.join(directory,'sessions.json');const f=fixture(storage);const rename=fs.renameSync;
 try {
  fs.renameSync=()=>{throw Object.assign(new Error('disk failure'),{code:'EIO'});};
  assert.throws(()=>f.act('authorize',{domain:'medical',code:'MR-07-0412'}),/STORAGE UNAVAILABLE/);
  assert.equal(f.service.snapshot(f.id).access,0);
  fs.renameSync=rename;medical(f);
  const restored=createGameService({storage,now:f.now});assert.equal(restored.snapshot(f.id).access,1);
 }finally{fs.renameSync=rename;fs.rmSync(directory,{recursive:true});}
});
test('failed durable reset preserves the old session and permits a later retry',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'eye-reset-'));const storage=path.join(directory,'sessions.json');const f=fixture(storage);f.advance(300001);const rename=fs.renameSync;
 try {
  fs.renameSync=()=>{throw Object.assign(new Error('disk failure'),{code:'EIO'});};
  assert.throws(()=>f.act('reset'),/STORAGE UNAVAILABLE/);assert.equal(f.service.has(f.id),true);
  fs.renameSync=rename;const next=f.act('reset');assert.equal(next.state.started,false);assert.equal(f.service.has(f.id),false);
 }finally{fs.renameSync=rename;fs.rmSync(directory,{recursive:true});}
});
test('too-late planner does not freeze the mission in an unusable state',()=>{
 const f=fixture();root(f);const deadline=f.service.snapshot(f.id).missionEndsAt;f.advance(deadline-f.now()-1000);assert.throws(()=>f.act('planner-start'),/WINDOW CLOSED/);assert.equal(f.service.snapshot(f.id).missionPaused,false);f.advance(1001);assert.equal(f.service.snapshot(f.id).endingKind,'mission');
});

test('bonus gallery requires verified optional cipher and relocks on reset',()=>{
 const f=fixture();f.act('start');
 const image='/home/operator/.bonus/pcele.png';
 assert.equal(f.service.canRead(f.id,image),false);
 comms(f);f.act('ctf-start');
 for(const folder of ['comms','engineering','command']) f.service.recordRead(f.id,`/home/operator/${folder}/forensic_fragment.txt`);
 f.act('flag',{flag:'EYE{SIGNAL_WITNESS_CONTINUITY}'});
 assert.equal(f.service.canRead(f.id,image),true);
 const reset=f.service.operatorReset(f.id);f.service.action(reset.newId,{action:'start'});
 assert.equal(f.service.canRead(reset.newId,image),false);
});

test('signal challenge requires credentials, rejects stale samples and grants access only after stability',()=>{
 const f=fixture();assert.throws(()=>f.act('comms-start'),/AUTH COMMS/);medical(f);
 assert.throws(()=>f.act('comms-start'),/AUTH COMMS/);
 const auth=f.act('authorize',{domain:'comms',code:credential(f,'comms')});assert.equal(auth.state.access,1);assert.equal(auth.state.sedationEndsAt,null);
 const old=f.act('comms-start').challenge;f.act('comms-start');
 assert.throws(()=>f.act('comms-submit',{token:old.token,frequency:50}),/STALE/);
 const win=link(f);assert.equal(win.state.access,2);assert.equal(win.state.sedationEndsAt,f.now()+300000);
 assert.throws(()=>f.act('comms-start'),/AUTH COMMS/);
});

test('Cortex accelerates and a failed attempt can restart at initial speed',()=>{
 const f=fixture();comms(f);let r=f.act('cortex-start');const initial=r.challenge.expiresAt-r.challenge.issuedAt;
 f.act('cortex-answer',{token:r.challenge.token,key:r.challenge.target});
 r=f.act('cortex-start');assert.ok(r.challenge.expiresAt-r.challenge.issuedAt<initial);
 f.act('cortex-cancel');r=f.act('cortex-start');assert.equal(r.challenge.expiresAt-r.challenge.issuedAt,initial);
});

test('medical needs both session credential and waveform, and cannot replay a solved challenge',()=>{
 const f=fixture();assert.throws(()=>f.act('medical-start'),/AUTHORIZE MEDICAL/);
 assert.equal(f.act('authorize',{domain:'medical',code:'MR-07-0412'}).ok,false);
 const code=credential(f,'medical');f.act('authorize',{domain:'medical',code});
 const c=f.act('medical-start').challenge;assert.deepEqual(f.act('medical-start').challenge,c);
 assert.throws(()=>f.act('medical-submit',{token:c.token,values:[1,0,1]}),/LOCK REJECTED/);
 assert.equal(f.service.snapshot(f.id).access,0);
 assert.equal(f.act('medical-submit',{token:c.token,values:c.target}).state.access,1);
 assert.throws(()=>f.act('medical-submit',{token:c.token,values:c.target}),/STALE/);
});

test('session clues survive reload, differ after reset and old credentials fail',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eye-clues-'));
 try { const storage=path.join(dir,'state.json'),f=fixture(storage);const code=credential(f,'medical');
 const template='CHAMBER: 07 / 04/12 / MR-07-0412';const file='/home/operator/medical/doctor_note.txt';
 const text=f.service.renderArchive(f.id,file,template);assert.ok(text.includes(code));
 const restored=createGameService({now:f.now,storage});assert.equal(restored.renderArchive(f.id,file,template),text);
 const next=restored.operatorReset(f.id).newId;restored.action(next,{action:'start'});
 assert.notEqual(restored.renderArchive(next,file,template),text);
 assert.equal(restored.action(next,{action:'authorize',domain:'medical',code}).ok,false);
 assert.ok(!JSON.stringify(restored.snapshot(next)).includes('credentials'));
 } finally { fs.rmSync(dir,{recursive:true}); }
});
