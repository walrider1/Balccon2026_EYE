const test=require('node:test');
const assert=require('node:assert/strict');
const {createGameService}=require('../terminal-sketch/game-service');
test('replay changes emphasis on reset while keeping puzzle authority unchanged',()=>{
 const game=createGameService();let id=game.create();const first=game.narrative(id).replayVariant;
 const memo=game.replayMemo(id);assert.equal(game.replayMemo(id),memo);
 game.action(id,{action:'start'});id=game.operatorReset(id).newId;
 assert.notEqual(game.narrative(id).replayVariant,first);
 assert.equal(game.history().runs[0].replayVariant,first);
 assert.equal(game.canRead(id,'/home/operator/command/recovered_review.txt'),false);
 game.action(id,{action:'start'});
 assert.equal(game.action(id,{action:'authorize',domain:'medical',code:'MR-07-0412'}).state.access,1);
});
test('simulated 72-hour schedule keeps replay, session cleanup and history bounded',()=>{
 let now=1000;const game=createGameService({now:()=>now});let id=game.create();
 for(let i=0;i<270;i++){
  game.action(id,{action:'start'});now+=16*60000;game.snapshot(id);
  id=game.operatorReset(id).newId;
 }
 assert.equal(game.history().total,270);assert.equal(game.history().outcomes.mission,270);
});
