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

test('HRTOK starts without identity or navigation facts and learns from records', () => {
  const character = createCharacter();
  const opening = prepareTurn(character, {kind:'opening', text:'', state:{}});
  assert.doesNotMatch(localReply(character, opening), /Samuel|Kovac|Sun|captain/i);
  assert.equal(allowedFacts(character).some(f => ['patient','course','neural'].includes(f.id)), false);
  prepareTurn(character, {kind:'message',text:'hello',state:{readFiles:['/home/operator/medical/patient_intake.txt']}});
  assert.equal(character.facts.includes('patient'),true);
  assert.equal(character.facts.includes('course'),false);
});
