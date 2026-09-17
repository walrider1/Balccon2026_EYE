const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createPlannerPhysics}=require('../terminal-sketch/planner-physics');
function fixture(){
 const source=fs.readFileSync('terminal-sketch/app.js','utf8'),timers=[];
 const context=vm.createContext({createPlannerPhysics,Set,window:{clearTimeout(){},setTimeout(fn){timers.push(fn);}},plannerStatus:{textContent:''},sfx:{play(){}}});
 vm.runInContext(source.slice(source.indexOf('const plannerGame = {'),source.indexOf('async function startOrbitalBurnPlanner'))+';globalThis.subject=plannerGame;',context);
 const game=context.subject;game.active=true;game.render=()=>{};
 const key=(key,shiftKey=false,repeat=false)=>game.handleKey({key,shiftKey,repeat,preventDefault(){}});
 return {game,key,timers};
}
test('verified planner route arms without deselecting or adding a burn',()=>{
 const {game,key,timers}=fixture();game.nodes=[{position:25,deltaV:200,angle:30}];game.selected=0;game.validTransfer=()=>true;let armed=0;game.beginCommitHold=()=>armed++;
 key('Enter');assert.equal(game.selected,0);assert.equal(game.nodes.length,1);assert.equal(timers.length,1);assert.equal(armed,0);timers[0]();assert.equal(armed,1);
});
test('planner arrows edit thrust and direction with smaller Shift increments',()=>{
 const {game,key}=fixture();game.nodes=[{position:25,deltaV:200,angle:30}];game.selected=0;
 key('ArrowUp');key('ArrowDown',true);assert.equal(game.nodes[0].deltaV,215);
 key('ArrowRight');key('ArrowLeft',true);assert.equal(game.nodes[0].angle,34);
 key('ArrowUp');assert.equal(game.nodes[0].deltaV,235);
});
test('an unverified Enter places one node and cannot arm a burn',()=>{
 const {game,key,timers}=fixture();game.validTransfer=()=>false;game.cursor=30;
 key('Enter');assert.equal(game.nodes.length,1);assert.equal(game.selected,0);key('Enter',false,true);assert.equal(game.selected,0);assert.equal(timers.length,0);
});
