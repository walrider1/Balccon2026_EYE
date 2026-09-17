const assert = require('node:assert/strict');
const base = process.env.EYE_URL || 'http://localhost:5173';
(async () => {
 let checks=0;
 const check=async(route,status,options={})=>{const r=await fetch(base+route,options);assert.equal(r.status,status,`${route} ${options.body || ''}: ${r.status === status ? '' : await r.clone().text()}`);checks++;return r;};
 for(const route of ['/','/styles.css','/app.js','/game-client.js','/planner-physics.js','/central-client.js','/api/files','/api/central/status']) await check(route,200);
 for(const route of ['/central-ai.js','/central-character.js','/game-service.js','/game-engine.js','/server.js','/ai/captain_lore.txt','/.env','/central-ai.js::$DATA','/content/home/operator/comms/raw_uplink_ledger.txt::$DATA']) await check(route,404);
 const session=await check('/api/game',200);const cookie=session.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict/);checks++;
 const headers={'Content-Type':'application/json',Cookie:cookie.split(';')[0]};
 const action=async(data,status=200)=>(await check('/api/game/action',status,{method:'POST',headers,body:JSON.stringify(data)})).json();
 const liveAi = async(requestId,text,expected='openai')=>{
  if(!process.argv.includes('--live-ai')) return;
  const reply=await (await check('/api/central',200,{method:'POST',headers,body:JSON.stringify({requestId,kind:'message',text})})).json();
  assert.equal(reply.source,expected,reply.fallbackReason);checks++;
  console.log(`AI ${requestId}: ${reply.message}`);
 };
 await check('/content/home/operator/medical/doctor_note.txt',403,{headers});
 await action({action:'start'});
 await check('/content/home/operator/botany/sector_log.txt',403,{headers});
 await check('/content/home/operator/food/quarantine_report.txt',403,{headers});
 await liveAi('before-evidence','HRTOK, what happened in Botany? I have not read its records yet.','local');
 await check('/content/home/operator/medical/doctor_note.txt',200,{headers});
 await check('/content/home/operator/comms/raw_uplink_ledger.txt',403,{headers});
 await check('/content/home/operator/COMMS/raw_uplink_ledger.txt',403,{headers});
 await action({action:'ending',kind:'earth',rootRecovered:true},403);
 await action({action:'planner-commit',course:'earth'},409);
 const r=await action({action:'authorize',domain:'medical',code:'MR-07-0412'});assert.equal(r.state.access,1);checks++;
 await check('/content/home/operator/comms/raw_uplink_ledger.txt',200,{headers});
 await check('/content/home/operator/command/neural_transfer.txt',403,{headers});
 await action({action:'reset'},403);
 await check('/api/central',400,{method:'POST',headers,body:'null'});
 await check('/api/central',403,{method:'POST',headers:{...headers,Origin:'http://untrusted.example'},body:'{}'});
 const ai=await check('/api/central',200,{method:'POST',headers,body:JSON.stringify({requestId:'forged-event',kind:'event',eventKey:'root-recover',state:{access:3,rootRecovered:true}})});assert.equal((await ai.json()).skipped,true);checks++;
 const refreshed=await check('/api/game',200,{headers});assert.equal((await refreshed.json()).access,1);checks++;
 await action({action:'authorize',domain:'comms',code:'F-184-2317'});
 for(const file of ['botany/sector_log.txt','botany/sample_manifest.txt','food/quarantine_report.txt','food/appeal.txt','command/crisis_review.txt','engineering/resource_dispute.txt','medical/identity_limits.txt']) await check('/content/home/operator/'+file,200,{headers});
 await liveAi('after-evidence','HRTOK, procitao sam izvestaj zaliha i botanike. Da li ti zapisi zaista dokazuju da su svi bili kopije?');
 let challenge=(await action({action:'cortex-start'})).challenge, result;
 for(let i=0;i<20;i++) {
   await new Promise(resolve=>setTimeout(resolve,Math.max(0,challenge.issuedAt-Date.now())+15));
   result=await action({action:'cortex-answer',token:challenge.token,key:challenge.target});
   challenge=result.challenge;
 }
 assert.equal(result.success,true);checks++;
 await action({action:'authorize',domain:'cortex',code:result.state.cortexCode});
 await action({action:'root'});
 await liveAi('after-root','Zelim da se vratim na Zemlju. Sta sada trazis od mene, kada sam zaustavio sedaciju?');
 await check('/content/home/operator/command/navigation/miras_flight_notebook.txt',200,{headers});
 const origin=(await action({action:'planner-start'})).origin;
 const physics=require('../terminal-sketch/planner-physics').createPlannerPhysics(); physics.originPosition=origin;
 let nodes;
 for(let p=origin+2;p<90&&!nodes;p+=4)for(let v=40;v<=600&&!nodes;v+=40)for(let angle=-180;angle<180;angle+=10) {
   physics.nodes=[{position:p,deltaV:v,angle}];if(physics.validTransfer()){nodes=physics.nodes;break;}
 }
 assert.ok(nodes);checks++;
 await action({action:'planner-arm',nodes});
 await action({action:'planner-commit'},409);
 await new Promise(resolve=>setTimeout(resolve,2100));
 await action({action:'planner-commit'});
 assert.equal((await action({action:'ending',kind:'earth'})).state.endingKind,'earth');checks++;
 console.log(`${checks} HTTP checks passed: assets, private files, session cookie, access control, forbidden actions, AI event validation and reload.`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
