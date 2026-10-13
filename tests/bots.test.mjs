import assert from 'node:assert/strict';
import {test} from 'node:test';
import { BOT_IDS, simulateBot, playBotTurn } from '../scripts/strategy-bots.mjs';
import { benchmarkBots } from '../scripts/benchmark-bots.mjs';
import { createGame, startGame, advanceDay, restoreGame, isGameState, availableUpgrade } from '../.engine-build/engine/simulation.js';

test('bots oferecem sete políticas distintas e rejeitam perfis inexistentes',()=>{
  assert.equal(BOT_IDS.length,7);
  assert.throws(()=>simulateBot({seed:7,origin:'BRA',mode:'equilibrado',botId:'inventado'}));
  assert.throws(()=>playBotTurn(createGame('BRA',7),'inventado'));
});
test('bots têm replay bit a bit determinístico, com e sem ações',()=>{
  for(const botId of ['observador','economizador','concentrado','conectividade','discreto','ruptura','adaptativo']){
    const a=simulateBot({seed:42,origin:'BRA',mode:'desafio',botId,verify:true});
    const b=simulateBot({seed:42,origin:'BRA',mode:'desafio',botId,verify:true});
    assert.deepEqual(a,b,`Divergência no bot ${botId}`);
    assert.ok(['contained','overwhelmed'].includes(a.outcome));
  }
});
test('grupo controle e estratégia Concentrado iniciam com os mesmos atributos',()=>{
  const baseline=simulateBot({seed:7,origin:'BRA',mode:'equilibrado',botId:'economizador'});
  const concentrate=simulateBot({seed:7,origin:'BRA',mode:'equilibrado',botId:'concentrado'});
  assert.deepEqual(baseline.game.agent.attributes,concentrate.game.agent.attributes);
  assert.equal(baseline.upgrades,0);
  assert.equal(baseline.tactics,0);
  assert.ok(concentrate.upgrades>0);
  assert.ok(concentrate.tactics>0);
  assert.equal(isGameState(concentrate.game),true);
  assert.ok(restoreGame(JSON.parse(JSON.stringify(concentrate.game))));
});
test('bot não compra durante setup nem após fim e não gasta saldo insuficiente',()=>{
  let game=createGame('BRA',12);
  assert.equal(playBotTurn(game,'concentrado').game,game);
  game=startGame(game);
  for(let i=0;i<5;i++)game=advanceDay(game);
  assert.equal(game.agent.points,0);
  assert.equal(playBotTurn(game,'concentrado').game,game);
  while(game.phase==='running')game=advanceDay(game);
  assert.equal(playBotTurn(game,'concentrado').game,game);
});
test('bot economiza para pagar um upgrade antes de gastar em táticas',()=>{
  let game=startGame(createGame('BRA',99));
  for(let i=0;i<10;i++)game=advanceDay(game);
  let result=playBotTurn(game,'concentrado');
  assert.equal(result.purchases,1);
  assert.equal(result.tactics,0);
  game=result.game;
  for(let i=0;i<10;i++)game=advanceDay(game);
  assert.equal(game.agent.points,2);
  assert.equal(availableUpgrade(game,'nucleo').ok,false); // Sem nível 2 de resistência no teste direto.
});
test('benchmark miniatura contabiliza partidas, custo e comparação controlada',()=>{
  const r=benchmarkBots({seeds:[42,7],origins:['BRA'],modes:['equilibrado'],bots:['economizador','concentrado']});
  assert.equal(r.total,4);
  assert.equal(r.rows.length,2);
  assert.equal(r.controlComparisons.length,1);
  assert.equal(r.controlComparisons[0].controlled,true);
  assert.ok(r.rows.every(x=>x.partidas===2&&x.taticas_medias>=0&&x.melhorias_medias>=0));
});
