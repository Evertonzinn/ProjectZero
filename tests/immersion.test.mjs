import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePreferences,effectiveMotion,deriveMoment } from '../.engine-build/engine/immersion.js';
import { createGame,startGame,advanceDay } from '../.engine-build/engine/simulation.js';

test('preferências antigas, inválidas e malformadas não afetam saves',()=>{
  assert.deepEqual(parsePreferences(null),{sound:false,motion:true});
  assert.deepEqual(parsePreferences('{invalid'),{sound:false,motion:true});
  assert.deepEqual(parsePreferences('{"sound":true,"motion":false}'),{sound:true,motion:false});
  assert.deepEqual(parsePreferences('{"sound":"true","motion":0}'),{sound:false,motion:true});
});
test('preferência do sistema para movimento reduzido sempre prevalece',()=>{
  assert.equal(effectiveMotion(true,true),false);
  assert.equal(effectiveMotion(true,false),true);
  assert.equal(effectiveMotion(false,false),false);
});
test('não gera alertas repetidos para o mesmo estado',()=>{
  const game=startGame(createGame('BRA',345));
  assert.equal(deriveMoment(game,game),null);
  const day1=advanceDay(game);
  const moment=deriveMoment(game,day1);
  assert.equal(moment===null || moment.day===day1.day,true);
  assert.equal(deriveMoment(day1,day1),null);
});
test('recomeçar com outra seed não produz evento falso',()=>{
  const a=startGame(createGame('BRA',101));
  const b=startGame(createGame('BRA',102));
  assert.equal(deriveMoment(a,b),null);
});
test('fim da partida tem prioridade sobre notícias e limiares',()=>{
  const before=startGame(createGame('BRA',135));
  const after={...before,phase:'contained',day:before.day+1};
  assert.equal(deriveMoment(before,after)?.cue,'contained');
});
