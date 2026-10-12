import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, startGame, advanceDay, getWorldStats, isGameState } from '../.engine-build/engine/simulation.js';
import { COUNTRIES, TOTAL_POPULATION } from '../.engine-build/data/countries.js';

const simulate = (seed, days) => {
  let g = startGame(createGame('BRA', seed));
  for (let i=0;i<days;i++) g=advanceDay(g);
  return g;
};

test('simulação tem reprodução determinística', () => {
  assert.deepEqual(simulate(123456,85),simulate(123456,85));
});
test('seeds distintas geram cenários distintos', () => {
  assert.notDeepEqual(simulate(123,65).countries,simulate(456,65).countries);
});
test('contagens e pesquisa permanecem dentro dos limites', () => {
  for(const origin of ['BRA','CHN','ZAF']) {
    let game=startGame(createGame(origin,321));
    for(let day=0;day<240;day++) {
      game=advanceDay(game);
      for(const c of COUNTRIES) {
        const s=game.countries[c.id];
        assert.ok(s.affected>=0 && s.affected<=c.population, c.id);
        assert.ok(s.research>=0 && s.research<=100, c.id);
      }
      const world=getWorldStats(game);
      assert.ok(world.affected>=0 && world.affected<=TOTAL_POPULATION);
      assert.ok(world.research>=0 && world.research<=100);
    }
    assert.equal(isGameState(game), true);
  }
});
test('país inválido e save adulterado são rejeitados', () => {
  assert.throws(()=>createGame('XYZ',123));
  assert.equal(isGameState({version:999}),false);
  const game=simulate(2,5);
  game.countries.BRA.affected=-1;
  assert.equal(isGameState(game),false);
});

import { adjustAttribute, availableUpgrade, buyUpgrade, getLabModifiers, restoreGame, setAgentName } from '../.engine-build/engine/simulation.js';

test('pontos iniciais são limitados a oito e atributos travam após iniciar', () => {
  let g=createGame('BRA',3);
  assert.equal(g.version,4);
  assert.equal(g.agent.attributes.propagacao,2);
  g=adjustAttribute(g,'propagacao',1);
  g=adjustAttribute(g,'resistencia',1);
  g=adjustAttribute(g,'propagacao',1);
  assert.equal(g.agent.attributes.propagacao,3);
  assert.equal(g.agent.attributes.resistencia,2);
  assert.equal(g.agent.attributes.instabilidade,1);
  assert.equal(setAgentName(g,'TESTE').agent.name,'TESTE');
  const running=startGame(g);
  assert.equal(adjustAttribute(running,'propagacao',-1),running);
});

test('estratégias com a mesma seed produzem consequências diferentes', () => {
  let a=startGame(createGame('BRA',111));
  let b=createGame('BRA',111);
  b=adjustAttribute(b,'instabilidade',1);
  b=adjustAttribute(b,'propagacao',1);
  b=startGame(b);
  assert.notDeepEqual(getLabModifiers(a),getLabModifiers(b));
  for(let i=0;i<70;i++){a=advanceDay(a);b=advanceDay(b);}
  assert.notDeepEqual(a.countries,b.countries);
});

test('evoluções gastam pontos, não duplicam e respeitam os pré-requisitos',()=>{
  let g=startGame(createGame('BRA',42));
  assert.equal(availableUpgrade(g,'correntes').ok,false);
  for(let i=0;i<10;i++)g=advanceDay(g);
  assert.equal(g.agent.points,2);
  assert.equal(availableUpgrade(g,'correntes').ok,true);
  g=buyUpgrade(g,'correntes');
  assert.equal(g.agent.points,0);
  assert.deepEqual(g.agent.purchased,['correntes']);
  assert.equal(buyUpgrade(g,'correntes'),g);
  assert.equal(isGameState(g),true);
  const altered={...g,agent:{...g.agent,points:99}};
  assert.equal(isGameState(altered),false);
});

test('caminhos opostos não podem ser adquiridos juntos',()=>{
  let g=createGame('BRA',14);
  g=adjustAttribute(g,'resistencia',1);
  g=startGame(g);
  for(let i=0;i<30;i++)g=advanceDay(g);
  g=buyUpgrade(g,'rede');
  assert.equal(g.agent.purchased.includes('rede'),true);
  assert.equal(availableUpgrade(g,'nucleo').ok,false);
  assert.equal(buyUpgrade(g,'nucleo'),g);
  assert.equal(isGameState(g),true);
});

test('save versão 1 é migrado mantendo mapa, dia e seed',()=>{
  let g=simulate(84,21);
  const {agent, ...old}=g;
  const legacy={...old,version:1,countries:Object.fromEntries(Object.entries(old.countries).map(([id,{government,...c}])=>[id,c]))};
  const restored=restoreGame(legacy);
  assert.ok(restored);
  assert.equal(restored.version,4);
  assert.equal(restored.day,21);
  assert.equal(restored.seed,84);
  for(const c of COUNTRIES){
    const {government,...fields}=restored.countries[c.id];
    const {government:oldGov,...oldFields}=g.countries[c.id];
    assert.deepEqual(fields,oldFields);
    assert.equal(government.until,21);
    assert.ok(oldGov);
  }
  assert.equal(restored.agent.points,4);
  assert.equal(isGameState(restored),true);
  assert.equal(restoreGame({...legacy,countries:{}}),null);
  assert.ok(agent);
});

import { ACTIONS, COUNTRY_DOCTRINE, DOCTRINES, decideAction } from '../.engine-build/engine/intelligence.js';

test('cada governo tem perfil e seus indicadores respeitam os limites',()=>{
  assert.equal(COUNTRIES.length,Object.keys(COUNTRY_DOCTRINE).length);
  for(const c of COUNTRIES) assert.ok(DOCTRINES[COUNTRY_DOCTRINE[c.id]]);
  let g=startGame(createGame('IND',2026));
  for(let n=0;n<170;n++){
    g=advanceDay(g);
    for(const c of COUNTRIES){
      const x=g.countries[c.id].government;
      assert.ok(ACTIONS[x.action]);
      assert.ok(x.pressure>=0&&x.pressure<=100);
      assert.ok(x.budget>=0&&x.budget<=100);
      assert.ok(x.stability>=0&&x.stability<=100);
      assert.ok(x.until>=x.since);
      assert.ok(x.partner===null||c.links.includes(x.partner));
    }
    assert.equal(isGameState(g),true);
  }
});

test('doutrinas geram decisões diferentes para mesmos indicadores',()=>{
  const base={pressure:25,budget:60,activeCountries:5,science:65,research:25,partner:'FRA',roll:.65};
  const cautious=decideAction({...base,doctrine:'cautelosa'});
  const cooperative=decideAction({...base,doctrine:'colaborativa'});
  assert.equal(cautious.action,'restringir');
  assert.equal(cooperative.action,'cooperar');
  assert.equal(cooperative.partner,'FRA');
  assert.notEqual(ACTIONS[cautious.action].science,ACTIONS[cooperative.action].science);
});

test('a corrida científica gera líderes e canais de cooperação rastreáveis',()=>{
  const g=simulate(2026,75);
  const entries=Object.entries(g.countries);
  const leader=entries.toSorted((a,b)=>b[1].research-a[1].research)[0];
  const {leader:identified,cooperating}=getWorldStats(g);
  assert.equal(g.countries[leader[0]].research,g.countries[identified].research);
  assert.equal(cooperating,entries.filter(([,s])=>s.government.action==='cooperar').length);
  assert.ok(g.news.some(n=>n.id.startsWith('leader-')));
  assert.ok(g.news.some(n=>n.id.startsWith('gov-')));
});

test('salvamento v2 migra para v3 sem perder laboratório, pesquisa e seed',()=>{
  let g=startGame(createGame('BRA',12345));
  for(let i=0;i<23;i++)g=advanceDay(g);
  g=buyUpgrade(g,'correntes');
  const legacy={...g,version:2,countries:Object.fromEntries(Object.entries(g.countries).map(([id,{government,...c}])=>[id,c]))};
  const migrated=restoreGame(legacy);
  assert.ok(migrated);
  assert.equal(migrated.version,4);
  assert.equal(migrated.day,23);
  assert.equal(migrated.seed,12345);
  assert.deepEqual(migrated.agent,g.agent);
  assert.equal(migrated.countries.BRA.research,legacy.countries.BRA.research);
  assert.equal(isGameState(migrated),true);
  assert.equal(restoreGame({...legacy,agent:{...legacy.agent,points:99}}),null);
});

test('save alterado com parceiro impossível, orçamento negativo ou ação falsa é rejeitado',()=>{
  const state=simulate(7,15);
  const tamper = changes=>({...state,countries:{...state.countries,BRA:{...state.countries.BRA,government:{...state.countries.BRA.government,...changes}}}});
  assert.equal(isGameState(tamper({partner:'USA',action:'vigiar'})),false);
  assert.equal(isGameState(tamper({budget:-4})),false);
  assert.equal(isGameState(tamper({action:'invalida'})),false);
});

import { changeOrigin } from '../.engine-build/engine/simulation.js';
test('trocar origem na configuração preserva pontos e laboratório',()=>{
  let g=createGame('BRA',2027);
  g=adjustAttribute(g,'propagacao',1);
  g=setAgentName(g,'SIMULACAO X');
  const updated=changeOrigin(g,'JPN');
  assert.equal(updated.origin,'JPN');
  assert.deepEqual(updated.agent,g.agent);
  assert.equal(g.origin,'BRA');
  assert.equal(changeOrigin(startGame(updated),'USA').origin,'JPN');
});

import { decideGlobalEvent, getEventModifiers, makeGlobalEvent, EVENT_DEFINITIONS } from '../.engine-build/engine/events.js';

test('gatilhos causais disparam apenas com requisitos e seed controlável',()=>{
  const base={budget:25,stability:40,pressure:50,research:48,science:92,action:'investir',partner:null};
  assert.equal(decideGlobalEvent(base,[0,1,1,1]),'crise_economica');
  assert.equal(decideGlobalEvent({...base,budget:60},[0,0,1,1]),'instabilidade_politica');
  assert.equal(decideGlobalEvent({...base,budget:60,stability:90},[1,1,0,1]),'descoberta_cientifica');
  assert.equal(decideGlobalEvent({...base,budget:60,stability:90,action:'cooperar',partner:'FRA'},[1,1,1,0]),'ruptura_diplomatica');
  assert.equal(decideGlobalEvent({...base,budget:99,stability:98,pressure:0,research:0},[0,0,0,0]),null);
});
test('efeitos temporários expiraram, mas consequências imediatas permanecem',()=>{
  const state={budget:20,stability:48,pressure:40,research:25,science:92,action:'investir',partner:null};
  const event=makeGlobalEvent('crise_economica','JPN',15,state);
  assert.equal(getEventModifiers([event],'JPN',16).recovery,EVENT_DEFINITIONS.crise_economica.impacts.recovery);
  assert.equal(getEventModifiers([event],'JPN',event.expiresDay).recovery,EVENT_DEFINITIONS.crise_economica.impacts.recovery);
  assert.equal(getEventModifiers([event],'JPN',event.expiresDay+1).recovery,0);
  assert.equal(getEventModifiers([event],'BRA',16).links,1);
  const bonus=makeGlobalEvent('descoberta_cientifica','USA',16,state);
  assert.equal(bonus.impacts.research,5);
  assert.equal(bonus.expiresDay,16+EVENT_DEFINITIONS.descoberta_cientifica.duration);
});
test('histórico de eventos permanece ordenado, com cooldown e quatro categorias',()=>{
  const one=simulate(20261012,180);
  const two=simulate(20261012,180);
  assert.deepEqual(one.globalEvents,two.globalEvents);
  assert.ok(one.globalEvents.length>10);
  assert.deepEqual(new Set(one.globalEvents.map(e=>e.kind)),new Set([
    'crise_economica','instabilidade_politica','descoberta_cientifica','ruptura_diplomatica'
  ]));
  for (const e of one.globalEvents){
    const same=one.globalEvents.filter(candidate=>candidate.countryId===e.countryId && candidate.id!==e.id);
    assert.ok(same.every(candidate=>Math.abs(candidate.day-e.day)>=30),e.id);
  }
  assert.equal(isGameState(one),true);
});
test('save v3 é migrado para v4 sem perder governos e pesquisas',()=>{
  const g=simulate(2026,47);
  const {globalEvents,...legacyState}=g;
  const old={...legacyState,version:3};
  const restored=restoreGame(old);
  assert.ok(restored);
  assert.equal(restored.version,4);
  assert.equal(restored.seed,g.seed);
  assert.equal(restored.day,g.day);
  assert.deepEqual(restored.countries,g.countries);
  assert.deepEqual(restored.globalEvents,[]);
  assert.equal(isGameState(restored),true);
  assert.equal(restoreGame({...old,countries:{...old.countries,BRA:{...old.countries.BRA,government:{...old.countries.BRA.government,budget:-1}}}}),null);
  assert.ok(globalEvents);
});
test('save v4 rejeita eventos falsificados e recuperação preserva histórico',()=>{
  const game=simulate(456,67);
  assert.ok(game.globalEvents.length>0);
  const copy=JSON.parse(JSON.stringify(game));
  assert.deepEqual(restoreGame(copy),copy);
  copy.globalEvents[0].impacts.research=999;
  assert.equal(restoreGame(copy),null);
  const duplicate=JSON.parse(JSON.stringify(game));
  duplicate.globalEvents.push(duplicate.globalEvents[0]);
  assert.equal(isGameState(duplicate),false);
});

test('efeito de crise ativa altera efetivamente a próxima transição de estado',()=>{
  let base=startGame(createGame('BRA',607));
  for (let i=0;i<30;i++) base=advanceDay(base);
  const conditions={budget:20,stability:50,pressure:40,research:30,science:56,action:'investir',partner:null};
  const event=makeGlobalEvent('crise_economica','BRA',base.day,conditions);
  const withEvent={...base,globalEvents:[event,...base.globalEvents.filter(e=>e.countryId!=='BRA')]};
  const original=advanceDay(base);
  const changed=advanceDay(withEvent);
  assert.ok(changed.countries.BRA.government.budget<original.countries.BRA.government.budget);
  assert.ok(changed.countries.BRA.research<=original.countries.BRA.research);
});
