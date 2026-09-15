const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {hashPassword,createAdminService}=require('../terminal-sketch/admin-service');
const {RemoteKosmosGame}=require('../terminal-sketch/game-client');
test('sector and home shortcuts resolve to the actual archive from any directory',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../terminal-sketch/virtual-fs.js'),'utf8'),context);const v=new context.window.VirtualFileSystem({});
 for(const input of ['/medical/doctor_note.txt','~/medical/doctor_note.txt'])assert.equal(v.normalize(input,'/home/operator/comms'),'/home/operator/medical/doctor_note.txt');
 assert.equal(v.normalize('../comms','/home/operator/medical'),'/home/operator/comms');
});
test('browser state accepts a new low-revision session and notifies the old page',async()=>{
 const original=global.fetch;let changes=0;const g=new RemoteKosmosGame();g.onSessionChange=()=>changes++;
 g.apply({revision:12,sessionTag:'old',serverNow:Date.now(),access:3});
 global.fetch=async()=>({ok:true,json:async()=>({revision:0,sessionTag:'new',serverNow:Date.now(),access:0})});
 try{await g.refresh();assert.equal(g.access,0);assert.equal(changes,1);}finally{global.fetch=original;}
});
test('administrator credentials are salted, rate limited, expiring and revocable',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eye-admin-test-'));try{
 const credentialFile=path.join(dir,'admin.json');let time=1000;const admin=createAdminService({credentialFile,now:()=>time});assert.throws(()=>admin.login('x'),/local terminal/);
 const password='test-only-password-123';const record=hashPassword(password);assert.notEqual(record.hash,hashPassword(password).hash);fs.writeFileSync(credentialFile,JSON.stringify(record));
 for(let i=0;i<5;i++)assert.throws(()=>admin.login('wrong'),/Invalid/);assert.throws(()=>admin.login(password),/Too many/);time+=60001;const token=admin.login(password);admin.requireSession(token);admin.logout(token);assert.throws(()=>admin.requireSession(token),/sign-in/);
 const next=admin.login(password);time+=600001;assert.throws(()=>admin.requireSession(next),/sign-in/);assert.throws(()=>admin.requireSession('forged'),/sign-in/);
 }finally{fs.rmSync(dir,{recursive:true});}
});
test('browser request queue recovers after a failed connection',async()=>{
 const original=global.fetch;let calls=0;const g=new RemoteKosmosGame();
 global.fetch=async()=>{calls++;if(calls===1)throw new Error('offline');return {ok:true,json:async()=>({state:{revision:1,sessionTag:'same',serverNow:Date.now(),access:1}})};};
 try{await assert.rejects(g.action('start'),/offline/);await g.refresh();assert.equal(g.access,1);assert.equal(calls,2);}finally{global.fetch=original;}
});
test('planner hold starts without keyboard repeat and releases cancel it',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../terminal-sketch/app.js'),'utf8');
 const start=source.indexOf('const plannerGame = {');const end=source.indexOf('async function startOrbitalBurnPlanner',start);
 const timers=new Map();let sequence=0,commits=0;
 const context={createPlannerPhysics:require('../terminal-sketch/planner-physics').createPlannerPhysics,window:{setTimeout:fn=>{timers.set(++sequence,fn);return sequence;},clearTimeout:id=>timers.delete(id)}};
 vm.runInNewContext(source.slice(start,end)+';globalThis.subject=plannerGame;',context);
 const p=context.subject;p.active=true;p.validTransfer=()=>true;p.placeOrSelect=()=>{};p.beginCommitHold=()=>{commits++;};p.cancelCommitHold=()=>{};
 const event={key:'Enter',repeat:false,preventDefault(){}};
 p.handleKey(event);assert.equal(commits,0);assert.equal(timers.size,1);[...timers.values()][0]();assert.equal(commits,1);
 timers.clear();p.handleKey(event);p.handleKeyUp(event);assert.equal(timers.size,0);
});
