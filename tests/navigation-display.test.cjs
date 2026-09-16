const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('Earth transfer starts at the current ship position and advances toward Earth',()=>{
 const source=fs.readFileSync('terminal-sketch/app.js','utf8');
 const fn=source.slice(source.indexOf('function updateMissionDisplay()'),source.indexOf('async function startMissionDisplay()'));
 let now=100;
 const attrs={cx:'180',cy:'230'};
 const node=()=>({textContent:'',classList:{toggle(){},add(){},remove(){}},setAttribute(){}});
 const context=vm.createContext({gameState:{course:'earth',navigationKnown:()=>true},document:{querySelector:node},missionClock:node(),missionPath:node(),missionShip:{getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v},missionDestination:node(),missionObjective:node(),trajectoryPanel:node(),performance:{now:()=>now},earthVisualStart:null});
 vm.runInContext(fn,context);
 vm.runInContext('updateMissionDisplay()',context);
 assert.equal(Number(attrs.cx),180);assert.equal(Number(attrs.cy),230);
 now+=1250;vm.runInContext('updateMissionDisplay()',context);
 assert.ok(Number(attrs.cx)>180 && Number(attrs.cx)<238);assert.ok(Number(attrs.cy)<230 && Number(attrs.cy)>56);
 now+=1250;vm.runInContext('updateMissionDisplay()',context);
 assert.equal(Number(attrs.cx),238);assert.equal(Number(attrs.cy),56);
});
