const test = require('node:test');
const assert = require('node:assert/strict');
const { RemoteKosmosGame } = require('../terminal-sketch/game-client');
const { createCharacter, prepareTurn, allowedFacts, localReply } = require('../terminal-sketch/central-character');

test('identity and navigation reveal independently from read records', () => {
  const game = new RemoteKosmosGame();
  assert.doesNotMatch(game.status(), /SAMUEL|MEDICAL PATIENT|SOLAR|DESTINATION: SUN/);
  game.readFiles = ['/home/operator/medical/doctor_note.txt'];
  assert.equal(game.identityKnown(), false);
  game.readFiles.push('/home/operator/medical/patient_intake.txt');
  assert.match(game.status(), /SAMUEL KOVAC/);
  assert.equal(game.navigationKnown(), false);
  game.readFiles.push('/home/operator/wake_protocol.txt');
  assert.match(game.status(), /DESTINATION: SUN/);
  game.readFiles = [];
  assert.equal(game.navigationKnown(), false);
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
