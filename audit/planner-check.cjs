const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../terminal-sketch/app.js'),'utf8');
const context=vm.createContext({console});
vm.runInContext(source.slice(source.indexOf('function cubicPoint('),source.indexOf('function stopMissionDisplay(')) + '\n' + source.slice(source.indexOf('const plannerGame = {'),source.indexOf('function startOrbitalBurnPlanner('))+'\nthis.planner=plannerGame;',context);
const p=context.planner;
const results=[];
for(const origin of [0,33,60,80]) {
 p.originPosition=origin; let solution=null;
 search: for(let position=origin+2;position<99;position+=8) for(let deltaV=20;deltaV<=600;deltaV+=40) for(let angle=-180;angle<180;angle+=10){
  p.nodes=[{position,deltaV,angle}]; const t=p.trajectoryData();
  if(t.captured){solution={position,deltaV,angle,distance:t.captureDistance};break search;}
 }
 results.push({origin,solution,note:'Numerical search only; not a human playthrough or difficulty assessment.'});
}
fs.writeFileSync(path.join(__dirname,'planner-results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
