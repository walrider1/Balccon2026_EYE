const test=require('node:test');
const assert=require('node:assert/strict');
const {createPlannerPhysics}=require('../terminal-sketch/planner-physics');
test('coast and late burn stop on the solar surface',()=>{
 const p=createPlannerPhysics();
 for(const nodes of [[],[{position:99.8,deltaV:600,angle:0}]]){
  p.nodes=nodes;const result=p.trajectoryData();
  assert.equal(result.terminal,'sun');assert.equal(result.captured,false);
  const end=result.points.at(-1);assert.ok(Math.abs(Math.hypot(end.x-p.sun.x,end.y-p.sun.y)-38)<.001);
 }
 p.nodes=[];assert.ok(p.positionBounds().max<p.solarArrivalPosition());
});
test('captured prediction ends at the Earth capture boundary',()=>{
 const p=createPlannerPhysics();p.nodes=[{position:63,deltaV:580,angle:-105}];
 const result=p.trajectoryData();assert.equal(result.terminal,'earth');
 const end=result.points.at(-1);assert.ok(Math.abs(Math.hypot(end.x-p.earth.x,end.y-p.earth.y)-33)<.001);
 assert.ok(result.points.length<p.integrationSteps);
});
