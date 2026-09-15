const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const results = [];
function check(name, ok, detail = '') { results.push({name, ok: Boolean(ok), detail}); }
const timers = new Map(); let id = 0;
const context = vm.createContext({window: {setTimeout(fn, ms) {timers.set(++id,{fn,ms}); return id;}, clearTimeout(i) {timers.delete(i);}}, Date, console});
for (const name of ['game-engine.js','commands.js','command-registry.js','virtual-fs.js']) vm.runInContext(fs.readFileSync(path.join(root,'terminal-sketch',name),'utf8'),context);
const Game = context.window.KosmosGame;
const g = new Game();
check('Navigation locked initially', !g.canAccessPath('/home/operator/command/navigation'));
check('Early comms authorization rejected', !g.authorize('comms','F-184-2317').ok);
check('Wrong medical code rejected', !g.authorize('medical','wrong').ok);
check('Early root recovery rejected', !g.recoverRoot().ok);
check('Medical code grants access 1', g.authorize('medical','MR-07-0412').ok && g.access===1);
check('Repeated medical code rejected', !g.authorize('medical','MR-07-0412').ok);
check('Comms code grants access 2', g.authorize('comms','F-184-2317').ok && g.access===2);
g.startSedation(()=>{});
check('Sedation enables Cortex',g.canStartCortex());
check('Cortex code requires issuance', !g.authorize('cortex',g.cortexCode).ok);
const code=g.issueCortexCode();
check('Issued Cortex code accepted',g.authorize('cortex',code).ok);
check('ROOT stops sedation and opens navigation',g.recoverRoot().ok && !g.sedationEndsAt && g.canAccessPath('/home/operator/command/navigation'));
g.startMission(()=>{}); g.pauseMission();
check('Planner pauses mission',g.missionPaused && !g.missionEndsAt);
g.resumeMission(); check('Mission resumes',!g.missionPaused && !!g.missionEndsAt);
check('Earth intercept resolves mission',g.confirmEarthIntercept() && g.course==='earth' && !g.missionEndsAt);
g.reset(); check('Reset clears progress',g.access===0 && !g.rootRecovered && !g.ending && !g.cortexCodeIssued);
let lost=false; g.startSedation(()=>lost=true); timers.get(g.sedationTimeout).fn(); check('Sedation expiry ends game',lost && g.ending);
const cmds=context.window.createCommands();
const sunGame=new Game(); sunGame.rootRecovered=true; sunGame.access=3; let ending=null; let printed='';
cmds.find(c=>c.name==='course').run({game:sunGame,print:t=>printed=t,args:['maintain','sun'],endGame:k=>ending=k});
check('Known gap: course maintain sun cannot select ending',ending===null && printed.includes('RETIRED'));
async function main(){
  for(const route of ['/','/api/files','/game-engine.js','/central-ai.js','/ai/captain_lore.txt','/content/home/operator/comms/recovery_service.txt','/content/home/operator/command/neural_transfer.txt']) {
    const response=await fetch('http://localhost:5173'+route);
    check('HTTP '+route,response.status===200,'status='+response.status+(route==='/'?'':' (unauthenticated)'));
  }
  const r=await fetch('http://localhost:5173/api/central',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'message',text:'help',state:{}})});
  const data=await r.json(); check('Central response available',typeof data.message==='string', 'source='+data.source);
  fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify({date:'2026-09-09',commit:'cfbca5d',results},null,2));
  console.log(JSON.stringify(results,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
