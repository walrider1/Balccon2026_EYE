const test = require('node:test');
const assert = require('node:assert/strict');
const { EyeDirector } = require('../terminal-sketch/eye-director');
const state = {sessionTag:'a',started:true,rootRecovered:false,readCount:0};
test('all actual HRTOK moods map to distinct authored reactions', () => {
  const moods = require('../terminal-sketch/central-character').MOODS;
  const clips = new Set();
  for (const mood of moods) {
    const director = new EyeDirector(); director.update(state, 1000);
    const scene = director.update({...state, ai:{at:2000,intent:'OBSERVE',mood}}, 2001);
    assert.ok(require('node:fs').existsSync(require('node:path').join(__dirname,'../terminal-sketch/eye-media',scene.clip+'.mp4')));
    clips.add(scene.clip);
  }
  assert.equal(clips.size, moods.length);
});
test('eye follows standby, awakening, real reads, and session reset', () => {
  const d = new EyeDirector();
  assert.equal(d.update({started:false}).clip, 'Sleep_standby');
  assert.equal(d.update(state).clip, 'Awakening');
  assert.equal(d.update(state), null);
  assert.equal(d.update({...state,readCount:1}).clip,'Reading');
  assert.equal(d.update({...state,sessionTag:'b'}).clip,'Awakening');
});
test('AI pending expires, replies play once, and danger uses actual deadline', () => {
  const d = new EyeDirector(); d.update(state,1000);
  assert.equal(d.update({...state,ai:{pendingUntil:2000}},1000).clip,'Reading');
  assert.equal(d.update({...state,ai:{pendingUntil:2000}},3000),null);
  const reply={...state,ai:{at:3000,intent:'PROBE'}};
  assert.equal(d.update(reply,3001).clip,'Curious');
  assert.equal(d.update(reply,3002),null);
  assert.equal(d.update({...state,sedationEndsAt:20000},4000).clip,'Panic2');
  assert.equal(d.update({...state,rootRecovered:true,sedationEndsAt:20000},4001).clip,'Shocked');
});
test('all endings override AI expressions and death never loops', () => {
  for (const [endingKind,clip] of Object.entries({shutdown:'Death',sun:'Death',earth:'Long_blink',transfer:'Long_blink',sedation:'Sleep_standby',mission:'Sleep_standby'})) {
    const d=new EyeDirector(); d.update(state);
    const result=d.update({...state,endingKind,ai:{pendingUntil:Infinity}});
    assert.equal(result.clip,clip); assert.equal(result.hold,true);
    if(clip==='Death') assert.equal(result.loop,false);
  }
});
