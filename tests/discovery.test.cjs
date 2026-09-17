const test = require('node:test');
const assert = require('node:assert/strict');
const { RemoteKosmosGame } = require('../terminal-sketch/game-client');
const { createCharacter, prepareTurn, allowedFacts, localReply } = require('../terminal-sketch/central-character');

test('navigation is visible immediately while identity is discovered through records', () => {
  const game = new RemoteKosmosGame();
  assert.doesNotMatch(game.status(), /SAMUEL|MEDICAL PATIENT/);
  game.readFiles = ['/home/operator/medical/doctor_note.txt'];
  assert.equal(game.identityKnown(), true);
  game.readFiles.push('/home/operator/medical/patient_intake.txt');
  assert.match(game.status(), /SAMUEL KOVAC/);
  assert.equal(game.navigationKnown(), true);
  game.readFiles.push('/home/operator/wake_protocol.txt');
  assert.match(game.status(), /DESTINATION: SUN/);
  game.readFiles = [];
  assert.equal(game.navigationKnown(), true);
});

test('HRTOK knows Sloki but keeps navigation and continuity undisclosed', () => {
  const character = createCharacter();
  const opening = prepareTurn(character, {kind:'opening', text:'', state:{}});
  assert.doesNotMatch(localReply(character, opening), /Sun|captain/i);
  assert.equal(allowedFacts(character).some(f => ['course','neural'].includes(f.id)), false);
  prepareTurn(character, {kind:'message',text:'hello',state:{readFiles:['/home/operator/medical/patient_intake.txt']}});
  assert.equal(character.facts.includes('patient'),true);
  assert.equal(character.facts.includes('course'),false);
});

 test('basic orientation questions receive relevant English fallback answers', () => {
  const character = createCharacter();
  for (const [text, expected] of [
    ['where am i?', /medical section/i],
    ['Who am i where are we? i dont know anything', /Samuel Kovac.*medical section/i],
    ['what happened to me?', /head injury.*regeneration/i],
    ["why can't i remember?", /memory/i]
  ]) {
    const turn = prepareTurn(character, {kind:'message',text,state:{}});
    assert.match(localReply(character,turn), expected);
    assert.doesNotMatch(localReply(character,turn), /copy|captain|solar/i);
  }
 });


test('lore is disclosed by reading the matching record at its required access', () => {
 const character=createCharacter();
 assert.ok(character.facts.includes('mission'));
 const paths=['/home/operator/medical/observations.txt','/home/operator/botany/private_letter.txt','/home/operator/command/navigation/origin_review.txt'];
 const read=access=>prepareTurn(character,{kind:'message',text:'what do these records mean?',state:{access,readFiles:paths}});
 read(0);assert.ok(character.facts.includes('identityLimits'));assert.ok(!character.facts.includes('personal'));assert.ok(!character.facts.includes('origin'));
 read(2);assert.ok(character.facts.includes('personal'));assert.ok(!character.facts.includes('origin'));
 read(3);assert.ok(character.facts.includes('origin'));
});

test('mission background works without an API and late sectors stay locked in the UI', () => {
 const character=createCharacter();
 const turn=prepareTurn(character,{kind:'message',text:'What is our mission?',state:{}});
 assert.match(localReply(character,turn),/civilian mission to Mars.*Yugoslavia/i);
 assert.doesNotMatch(localReply(character,turn),/addict|copy|duplicate/i);
 const game=new RemoteKosmosGame();
 for(const path of ['/home/operator/botany/private_letter.txt','/home/operator/food/quarantine_report.txt']) {
 assert.equal(game.canAccessPath(path),false);game.access=2;assert.equal(game.canAccessPath(path),true);game.access=0;
 }
});
