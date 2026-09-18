const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), os=require('node:os'), path=require('node:path');
const {createGameService}=require('../terminal-sketch/game-service');
const {createPlannerPhysics}=require('../terminal-sketch/planner-physics');
function fixture(storage) { let time=1000000; const service=createGameService({now:()=>time,storage}); const id=service.create(); const act=(action,data={})=>service.action(id,{action,...data}); act('start'); return {service,id,act,advance:n=>time+=n,now:()=>time}; }
function credential(f,domain) {
 const read=name=>{const file=`/home/operator/${domain}/${name}.txt`;return f.service.renderArchive(f.id,file,fs.readFileSync(path.join(__dirname,'../terminal-sketch/content',file),'utf8'));};
 if(domain==='medical') {
  const chamber=read('patient_intake').match(/REGENERATION CHAMBER: (\d{2})/)[1];
  const date=read('medbay_audit').match(/02  (\d{2})\/(\d{2})  MANUAL OVERRIDE/);
  return `MR-${chamber}-${date[1]}${date[2]}`;
 }
 const packet=read('raw_uplink_ledger').match(/REQUEST (R-\d+) \/\/ PACKET (\d+) \/\/ DISTRESS PRIORITY/);
 const block=read('lock_audit').split('\n').find(row=>row.startsWith(`REQUEST ${packet[1]} // BLOCKED`)).match(/(\d{2}):(\d{2})/);
 return `F-${packet[2]}-${block[1]}${block[2]}`;
}
function medical(f) { const r=f.act('authorize',{domain:'medical',code:credential(f,'medical')});assert.equal(r.neuralRequired,true);assert.equal(r.state.access,0);const c=f.act('medical-start').challenge;assert.equal(f.act('medical-submit',{token:c.token,values:c.target}).state.access,1); }
function findSignal(f,c) {
 const sample=(frequency,polarization)=>f.act('comms-submit',{token:c.token,frequency,polarization});
 let frequency=0,best=-1,polarization=0;
 for(let n=0;n<=100;n++){const r=sample(n,0);if(r.strength>best){best=r.strength;frequency=n;}}
 const coarse=frequency;best=-1;
 for(let n=Math.max(0,coarse-1);n<=Math.min(100,coarse+1)+.001;n+=.05){const v=Math.round(n*100)/100,r=sample(v,0);if(r.carrier>best){best=r.carrier;frequency=v;}}
 best=-1;for(let n=0;n<180;n+=5){const r=sample(frequency,n);if(r.alignment>best){best=r.alignment;polarization=n;}}
 const coarseAngle=polarization;best=-1;for(let n=coarseAngle-5;n<=coarseAngle+5;n+=.25){const v=(n+180)%180,r=sample(frequency,v);if(r.alignment>best){best=r.alignment;polarization=v;}}
 return {frequency,polarization};
}
function link(f) {
 const c=f.act('comms-start').challenge,settings=findSignal(f,c);let result;
 for(let i=0;i<18;i++){f.advance(500);result=f.act('comms-submit',{token:c.token,...settings});if(result.complete)break;}
 return result;
}

function comms(f) {medical(f);f.act('authorize',{domain:'comms',code:credential(f,'comms')});link(f);}
function cortex(f) {let r=f.act('cortex-start'); for(let i=0;i<20;i++) {f.advance(Math.max(0,r.challenge.issuedAt-f.now())); r=f.act('cortex-answer',{token:r.challenge.token,key:r.challenge.target});} assert.equal(r.success,true);return r.state.cortexCode;}
function root(f) {comms(f);f.act('authorize',{domain:'cortex',code:cortex(f)});assert.equal(f.act('root').ok,true);}
test('server rejects skipped steps and hides attestation; ignores forged state',()=>{ const f=fixture();assert.equal(f.service.snapshot(f.id).cortexCode,null); assert.equal(f.act('root',{access:3}).ok,false);assert.throws(()=>f.act('ending',{kind:'shutdown'}),/ROOT/);assert.throws(()=>f.act('cortex-start'),/SEDATION/);assert.throws(()=>f.act('planner-start'),/ROOT/);assert.equal(f.service.canRead(f.id,'/home/operator/comms/raw_uplink_ledger.txt'),false); medical(f);assert.equal(f.service.canRead(f.id,'/home/operator/comms/raw_uplink_ledger.txt'),true);assert.equal(f.service.canRead(f.id,'/home/operator/command/navigation/miras_flight_notebook.txt'),false);});
test('Cortex checks signal freshness, real score and grants random attestation',()=>{const f=fixture();comms(f);let r=f.act('cortex-start');const token=r.challenge.token;r=f.act('cortex-answer',{token,key:r.challenge.target});assert.throws(()=>f.act('cortex-answer',{token,key:'a'}),/STALE/);assert.throws(()=>f.act('cortex-answer',{token:r.challenge.token,key:r.challenge.target}),/NOT YET/);f.act('cortex-cancel');const code=cortex(f);assert.match(code,/^CORTEX-[0-9A-F]{6}$/);f.act('authorize',{domain:'cortex',code});assert.equal(f.act('root').ok,true);assert.equal(f.service.snapshot(f.id).sedationEndsAt,null);});
test('Cortex fails on missed threshold and can retry',()=>{const f=fixture();comms(f);let r=f.act('cortex-start');for(let i=0;i<6;i++){f.advance(1800);r=f.act('cortex-answer',{token:r.challenge.token,key:''});}assert.equal(r.done,true);assert.equal(r.success,false);assert.equal(r.state.cortexCode,null);assert.ok(f.act('cortex-start').challenge);});
test('deadlines survive restart, expired session cannot authorize, reset is gated',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eye-test-'));try{const storage=path.join(dir,'sessions.json'),f=fixture(storage);comms(f);f.advance(300001);const restored=createGameService({now:f.now,storage});assert.equal(restored.snapshot(f.id).endingKind,'sedation');assert.throws(()=>restored.action(f.id,{action:'authorize',domain:'cortex',code:'CORTEX-9D3'}),/ACTIVE/);assert.throws(()=>restored.action(f.id,{action:'reset'}),/NOT YET/);f.advance(60001);assert.equal(restored.action(f.id,{action:'reset'}).state.access,0);}finally{fs.rmSync(dir,{recursive:true});}});
test('mission restart does not reset deadline; voluntary endings require evidence',()=>{const f=fixture();const original=f.service.snapshot(f.id).missionEndsAt;f.advance(10000);f.act('start');assert.equal(f.service.snapshot(f.id).missionEndsAt,original);root(f);assert.throws(()=>f.act('ending',{kind:'earth'}),/NOT VERIFIED/);assert.throws(()=>f.act('ending',{kind:'transfer'}),/NOT DISCOVERED/);f.service.recordRead(f.id,'/home/operator/command/neural_transfer.txt');f.act('ending',{kind:'transfer'});assert.equal(f.service.snapshot(f.id).endingKind,'transfer');});
test('planner validates actual physics, hold time, budget, and pause/resume',()=>{const f=fixture();root(f);let r=f.act('planner-start');const origin=r.origin;f.advance(20000);assert.equal(f.service.snapshot(f.id).missionPaused,true);assert.throws(()=>f.act('planner-commit',{confirmed:true}),/INCOMPLETE/);assert.throws(()=>f.act('planner-arm',{nodes:[{position:origin+10,deltaV:601,angle:0}]}),/INVALID/);const physics=createPlannerPhysics();physics.originPosition=origin;let solution;for(let p=origin+2;p<90&&!solution;p+=4)for(let v=40;v<=600&&!solution;v+=40)for(let angle=-180;angle<180;angle+=10){const nodes=[{position:p,deltaV:v,angle}];physics.nodes=nodes;if(physics.validTransfer()){solution=nodes;break;}}assert.ok(solution,'a real capture exists');f.act('planner-arm',{nodes:solution});assert.throws(()=>f.act('planner-commit',{confirmed:true}),/INCOMPLETE/);f.advance(2200);assert.equal(f.act('planner-commit',{confirmed:true}).state.course,'earth');f.act('ending',{kind:'earth'});assert.equal(f.service.snapshot(f.id).endingKind,'earth');});
test('CTF time, evidence and retry are checked independently of root',()=>{const f=fixture();assert.throws(()=>f.act('ctf-start'),/LEVEL 2/);comms(f);f.act('ctf-start');assert.throws(()=>f.act('flag',{flag:'EYE{SIGNAL_WITNESS_CONTINUITY}'}),/REJECTED/);for(const folder of ['comms','engineering','command'])f.service.recordRead(f.id,`/home/operator/${folder}/forensic_fragment.txt`);f.advance(120000);assert.throws(()=>f.act('flag',{flag:'EYE{SIGNAL_WITNESS_CONTINUITY}'}),/CLOSED/);f.act('ctf-start');assert.equal(f.act('flag',{flag:'EYE{SIGNAL_WITNESS_CONTINUITY}'}).state.ctf.completed,true);assert.equal(f.service.snapshot(f.id).rootRecovered,false);});
test('hint endpoint is removed and authorization attempts are limited',()=>{const f=fixture();assert.throws(()=>f.act('hint'),/UNKNOWN ACTION/);for(let i=0;i<8;i++)f.act('authorize',{domain:'medical',code:'bad'});assert.throws(()=>f.act('authorize',{domain:'medical',code:'bad'}),/RATE LIMITED/);});
for(const kind of ['sun','transfer']) test(`${kind} ending is final, idempotent and resets to a clean session`,()=>{
 const f=fixture();root(f);if(kind==='transfer') f.service.recordRead(f.id,'/home/operator/command/neural_transfer.txt');
 const end=f.act('ending',{kind}).state;assert.equal(end.endingKind,kind);assert.equal(f.act('ending',{kind}).state.resetAt,end.resetAt);
 assert.throws(()=>f.act('hint'),/ACTIVE/);f.advance(60001);const reset=f.act('reset');assert.equal(reset.state.started,false);assert.equal(reset.state.access,0);assert.equal(reset.state.cortexCode,null);assert.deepEqual(reset.state.readFiles,[]);assert.notEqual(reset.state.sessionTag,end.sessionTag);
});
test('mission failure, idle reset and planner pause use server deadlines',()=>{
 const f=fixture();f.advance(1200001);assert.equal(f.service.snapshot(f.id).endingKind,'mission');
 const idle=fixture();idle.advance(300001);assert.equal(idle.act('reset').state.started,false);
 const p=fixture();root(p);const remaining=p.act('planner-start').state.missionRemaining;p.advance(950000);assert.equal(p.service.snapshot(p.id).ending,false);const resumed=p.act('planner-exit').state;assert.equal(resumed.missionEndsAt,p.now()+remaining);p.advance(remaining+1);assert.equal(p.service.snapshot(p.id).endingKind,'mission');
});
test('objective follows the attestation and ROOT transitions',()=>{
 const f=fixture();assert.equal(f.service.snapshot(f.id).objective.phase,1);medical(f);assert.equal(f.service.snapshot(f.id).objective.phase,2);f.act('authorize',{domain:'comms',code:credential(f,'comms')});link(f);assert.equal(f.service.snapshot(f.id).objective.phase,3);const code=cortex(f);assert.ok(f.service.snapshot(f.id).objective.text.includes(code));f.act('authorize',{domain:'cortex',code});assert.match(f.service.snapshot(f.id).objective.text,/root recover/);f.act('root');assert.match(f.service.snapshot(f.id).objective.text,/Navigation archive/);
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
 assert.ok(nodes);f.act('planner-arm',{nodes});f.advance(2100);f.act('planner-commit',{confirmed:true});assert.equal(f.act('planner-commit',{confirmed:true}).state.missionResolved,true);assert.throws(()=>f.act('ending',{kind:'sun'}),/IRREVERSIBLE/);f.advance(3001);assert.equal(f.service.snapshot(f.id).endingKind,'earth');
});
test('expired mission keeps its actual deadline across an offline interval',()=>{
 const f=fixture();const deadline=f.service.snapshot(f.id).missionEndsAt;f.advance(1300000);const ended=f.service.snapshot(f.id);assert.equal(ended.endingKind,'mission');assert.equal(ended.resetAt,deadline+60000);assert.equal(f.act('reset').state.access,0);
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
 const f=fixture();assert.throws(()=>f.act('medical-start'),/MEDICAL CREDENTIAL REQUIRED/);
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

function shutDown(f) {
 let c=f.act('shutdown-start').challenge;
 for(let i=0;i<8;i++){assert.equal(c.key,i%2?'ArrowUp':'ArrowDown');f.act('shutdown-arm',{token:c.token,key:c.key});f.advance(2000);const r=f.act('shutdown-step',{token:c.token});assert.equal(Boolean(r.complete),i===7);if(r.complete)return r;assert.equal(r.state.aiOffline,false);c=r.challenge;}
}
test('shutdown requires ROOT, two-second holds and eight links; abort leaves HRTOK online',()=>{
 const f=fixture();assert.throws(()=>f.act('shutdown-start'),/ROOT/);root(f);
 assert.throws(()=>f.act('ending',{kind:'shutdown'}),/UNKNOWN ENDING/);
 let c=f.act('shutdown-start').challenge;assert.throws(()=>f.act('shutdown-step',{token:c.token}),/INCOMPLETE/);
 f.act('shutdown-arm',{token:c.token,key:c.key});f.advance(1999);assert.throws(()=>f.act('shutdown-step',{token:c.token}),/INCOMPLETE/);
 f.act('shutdown-release');f.advance(5000);assert.throws(()=>f.act('shutdown-step',{token:c.token}),/INCOMPLETE/);
 f.act('shutdown-cancel');assert.equal(f.service.snapshot(f.id).aiOffline,false);
 assert.throws(()=>f.act('shutdown-step',{token:c.token}),/INCOMPLETE/);
 const result=shutDown(f);assert.equal(result.state.aiOffline,true);assert.equal(result.state.ending,false);
 assert.equal(f.service.narrative(f.id).aiOffline,true);
 assert.throws(()=>f.act('shutdown-start'),/OFFLINE/);
 assert.equal(f.act('ending',{kind:'sun'}).state.endingKind,'sun_no_ai');
});
test('shutdown preserves navigation and the separate Earth ending, and reset restores HRTOK',()=>{
 const f=fixture();root(f);shutDown(f);const origin=f.act('planner-start').origin;
 const physics=createPlannerPhysics();physics.originPosition=origin;let nodes;
 for(let p=origin+2;p<90&&!nodes;p+=4)for(let v=40;v<=600&&!nodes;v+=40)for(let a=-180;a<180;a+=10){physics.nodes=[{position:p,deltaV:v,angle:a}];if(physics.validTransfer()){nodes=physics.nodes;break;}}
 assert.ok(nodes);f.act('planner-arm',{nodes});f.advance(2200);
 assert.throws(()=>f.act('planner-commit'),/CONFIRMATION/);
 f.act('planner-commit',{confirmed:true});f.advance(3001);assert.equal(f.service.snapshot(f.id).endingKind,'earth_no_ai');
 const reset=f.service.operatorReset(f.id);assert.equal(reset.state.aiOffline,false);
});

test('timeout after disconnect is still failure rather than voluntary solar quarantine',()=>{
 const f=fixture();root(f);shutDown(f);f.advance(1200001);
 assert.equal(f.service.snapshot(f.id).endingKind,'mission');
 assert.equal(f.service.snapshot(f.id).aiOffline,true);
});

test('receiver needs precise frequency and polarization, and losing lock resets packet decoding',()=>{
 const f=fixture();medical(f);f.act('authorize',{domain:'comms',code:credential(f,'comms')});const c=f.act('comms-start').challenge;
 assert.deepEqual(Object.keys(c),['token']);assert.throws(()=>f.act('comms-submit',{token:c.token,frequency:50}),/POLARIZATION/);
 const settings=findSignal(f,c);let r=f.act('comms-submit',{token:c.token,...settings});assert.ok(r.quality>99);
 f.advance(500);r=f.act('comms-submit',{token:c.token,...settings});assert.ok(r.held>0);
 r=f.act('comms-submit',{token:c.token,...settings,frequency:settings.frequency+.3});assert.ok(r.quality<92);assert.equal(r.held,0);assert.equal(r.complete,false);
 r=f.act('comms-submit',{token:c.token,...settings,polarization:(settings.polarization+8)%180});assert.ok(r.quality<92);assert.equal(r.held,0);
 assert.equal(f.service.snapshot(f.id).access,1);
});

test('Cortex response windows smoothly shrink and stay inside the trial budget',()=>{
 const f=fixture();comms(f);let r=f.act('cortex-start'),previous=Infinity,total=0;
 assert.equal(r.challenge.deadline-f.now(),60000);
 for(let i=0;i<20;i++){
 const c=r.challenge,duration=c.expiresAt-c.issuedAt;assert.ok(duration<previous);assert.ok(duration>=850);if(i===0)assert.equal(duration,2100);previous=duration;total+=duration+250;
 f.advance(Math.max(0,c.expiresAt-f.now())-100);r=f.act('cortex-answer',{token:c.token,key:c.target});
 }
 assert.equal(r.success,true);assert.ok(total<60000);
});
test('transient Cortex telemetry avoids disk writes and restarts safely after server restart',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eye-cortex-'));
 try { const storage=path.join(dir,'state.json'),f=fixture(storage);comms(f);const c=f.act('cortex-start').challenge;
 const saved=fs.readFileSync(storage,'utf8');f.act('cortex-answer',{token:c.token,key:c.target});assert.equal(fs.readFileSync(storage,'utf8'),saved);
 const restored=createGameService({now:f.now,storage});const next=restored.action(f.id,{action:'cortex-start'}).challenge;assert.equal(next.index,0);assert.notEqual(next.token,c.token);assert.equal(restored.snapshot(f.id).cortexCode,null);
 }finally{fs.rmSync(dir,{recursive:true});}
});

test('Medical and Comms use independent server RNG targets and retain an unfinished Medical challenge',t=>{
 const crypto=require('node:crypto'),randomInt=crypto.randomInt;let high=false;
 t.mock.method(crypto,'randomInt',(min,max)=>{
  if([[3,6],[2,7],[500,1501],[0,720]].some(([a,b])=>a===min&&b===max))return high?max-1:min;
  return max===undefined?randomInt(min):randomInt(min,max);
 });
 for(const upper of [false,true]){
  high=upper;const f=fixture();f.act('authorize',{domain:'medical',code:credential(f,'medical')});
  const c=f.act('medical-start').challenge;assert.deepEqual(c.target,upper?[5,6,5]:[3,2,3]);
  assert.deepEqual(f.act('medical-start').challenge,c);
  f.act('medical-submit',{token:c.token,values:c.target});
  f.act('authorize',{domain:'comms',code:credential(f,'comms')});
  const radio=f.act('comms-start').challenge;assert.deepEqual(Object.keys(radio),['token']);
  const sample=f.act('comms-submit',{token:radio.token,frequency:upper?75:25,polarization:upper?179.75:0});
  assert.equal(sample.carrier,100);assert.equal(sample.alignment,100);
 }
});

test('refresh preserves the session and inactivity deadline; reset unlocks at three minutes',()=>{
 const f=fixture();const initial=f.service.snapshot(f.id);f.advance(179999);
 const refreshed=f.service.snapshot(f.id);assert.equal(refreshed.sessionTag,initial.sessionTag);assert.equal(refreshed.idleResetAt,initial.idleResetAt);
 assert.throws(()=>f.act('reset'),/NOT YET/);f.advance(1);
 const reset=f.act('reset');assert.notEqual(reset.state.sessionTag,initial.sessionTag);assert.equal(reset.state.started,false);assert.equal(reset.state.access,0);
});


test('explicit new-player reset bypasses waiting and replaces progress with a fresh timer',()=>{
 const f=fixture();medical(f);f.advance(45000);
 const old=f.service.snapshot(f.id);
 assert.throws(()=>f.act('reset'),/NOT YET/);
 const fresh=f.act('reset',{newSession:true});
 assert.notEqual(fresh.state.sessionTag,old.sessionTag);
 assert.equal(f.service.has(f.id),false);
 assert.equal(fresh.state.started,false);
 assert.equal(fresh.state.access,0);
 assert.deepEqual(fresh.state.readFiles,[]);
 f.advance(10000);
 const started=f.service.action(fresh.newId,{action:'start'}).state;
 assert.equal(started.missionEndsAt,f.now()+started.missionDuration);
});

test('new player can immediately replace a completed session without its cooldown',()=>{
 const f=fixture();f.advance(f.service.snapshot(f.id).missionDuration+1);
 assert.equal(f.service.snapshot(f.id).ending,true);
 assert.throws(()=>f.act('reset'),/NOT YET/);
 const next=f.act('reset',{newSession:true});
 assert.equal(next.state.ending,false);
 assert.equal(next.state.started,false);
});
