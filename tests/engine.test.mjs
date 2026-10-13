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
  assert.equal(g.version,7);
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
  assert.equal(restored.version,7);
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
  const legacy={...g,version:2,agent:{name:g.agent.name,attributes:g.agent.attributes,points:g.agent.points,purchased:g.agent.purchased},countries:Object.fromEntries(Object.entries(g.countries).map(([id,{government,...c}])=>[id,c]))};
  const migrated=restoreGame(legacy);
  assert.ok(migrated);
  assert.equal(migrated.version,7);
  assert.equal(migrated.day,23);
  assert.equal(migrated.seed,12345);
  assert.deepEqual({...migrated.agent,tacticUses:undefined},{...g.agent,tacticUses:undefined});
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
  assert.equal(restored.version,7);
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

import { summarizeRun, repeatSeed, comparableRuns, buildMilestones } from '../.engine-build/engine/outcome.js';

test('resultado só é calculado após encerramento',()=>{
  const setup=createGame('BRA',123);
  assert.equal(summarizeRun(setup),null);
  let game=startGame(setup);
  assert.equal(summarizeRun(game),null);
  for(let i=0;i<350&&game.phase==='running';i++) game=advanceDay(game);
  const result=summarizeRun(game);
  assert.ok(result);
  assert.equal(result.seed,123);
  assert.equal(result.day,game.day);
  assert.equal(result.outcome,game.phase);
  assert.ok(result.affectedPct>=0&&result.affectedPct<=100);
  assert.ok(result.research>=0&&result.research<=100);
});

test('repetição preserva seed, país e atributos mas limpa progressão',()=>{
  let game=createGame('JPN',9983);
  game=adjustAttribute(game,'propagacao',1);
  game=startGame(game);
  for(let i=0;i<32&&game.phase==='running';i++)game=advanceDay(game);
  game=buyUpgrade(game,'correntes');
  const repeated=repeatSeed(game);
  assert.equal(repeated.version,7);
  assert.equal(repeated.phase,'setup');
  assert.equal(repeated.seed,9983);
  assert.equal(repeated.origin,'JPN');
  assert.deepEqual(repeated.agent.attributes,game.agent.attributes);
  assert.deepEqual(repeated.agent.purchased,[]);
  assert.equal(repeated.agent.points,0);
  assert.equal(repeated.day,0);
  assert.deepEqual(repeated.globalEvents,[]);
  assert.ok(isGameState(repeated));
});

test('comparação só é válida para condições iniciais idênticas',()=>{
  let game=startGame(createGame('BRA',301));
  for(let i=0;i<350&&game.phase==='running';i++)game=advanceDay(game);
  const summary=summarizeRun(game);
  assert.ok(summary);
  assert.equal(comparableRuns(null,summary),false);
  assert.equal(comparableRuns(summary,summary),true);
  assert.equal(comparableRuns({...summary,seed:99},summary),false);
  assert.equal(comparableRuns({...summary,origin:'JPN'},summary),false);
  assert.equal(comparableRuns({...summary,attributes:{...summary.attributes,propagacao:summary.attributes.propagacao+1}},summary),false);
});

test('linha do tempo só usa marcos registrados e mantém dias em ordem',()=>{
  const setup=createGame('BRA',23);
  assert.deepEqual(buildMilestones(setup),[{day:0,label:'Início em Brasil',category:'inicio'}]);
  let game=startGame(setup);
  for(let i=0;i<350&&game.phase==='running';i++)game=advanceDay(game);
  const marks=buildMilestones(game);
  assert.equal(marks[0].day,0);
  assert.equal(marks.at(-1).day,game.day);
  assert.ok(marks.every((m,i)=>i===0||marks[i-1].day<=m.day));
  assert.ok(marks.every(m=>m.day<=game.day));
});

import { applyTactic, availableTactic } from '../.engine-build/engine/simulation.js';

test('operações táticas gastam pontos, alteram o país e preservam integridade',()=>{
 let g=startGame(createGame('BRA',987));
 for(let i=0;i<20;i++)g=advanceDay(g);
 assert.equal(g.agent.points,4);
 assert.equal(availableTactic(g,'pulso','XYZ').ok,false);
 assert.equal(availableTactic(g,'pulso','BRA').ok,true);
 const before=g.countries.BRA.affected;
 const other=g.countries.JPN.affected;
 const after=applyTactic(g,'pulso','BRA');
 assert.equal(after.agent.points,2);
 assert.equal(after.agent.spentTactics,2);
 assert.ok(after.countries.BRA.affected>before);
 assert.equal(after.countries.JPN.affected,other);
 assert.equal(after.history.at(-1).affected,g.history.at(-1).affected+(after.countries.BRA.affected-before));
 assert.equal(isGameState(after),true);
 assert.equal(restoreGame(JSON.parse(JSON.stringify(after))).agent.spentTactics,2);
 assert.equal(applyTactic(after,'friccao','BRA'),after); // insuficiente
});

test('tática institucional é determinística, repetível e não aceita gasto depois do fim',()=>{
 let g=startGame(createGame('BRA',11));
 for(let i=0;i<40;i++)g=advanceDay(g);
 let h=applyTactic(g,'friccao','BRA');
 assert.equal(h.agent.spentTactics,3);
 assert.equal(h.agent.points,g.agent.points-3);
 assert.ok(h.countries.BRA.government.stability<=g.countries.BRA.government.stability);
 assert.deepEqual(applyTactic(g,'friccao','BRA'),h);
 assert.ok(isGameState(h));
 while(h.phase==='running')h=advanceDay(h);
 assert.equal(applyTactic(h,'pulso','BRA'),h);
});

test('save v4 migra para v5 com mesmo saldo e eventos; replays zeram gastos',()=>{
 let g=startGame(createGame('BRA',530));
 for(let i=0;i<25;i++)g=advanceDay(g);
 const {spentTactics,...agent}=g.agent;
 const legacy={...g,version:4,agent};
 const restored=restoreGame(legacy);
 assert.ok(restored);
 assert.equal(restored.version,7);
 assert.equal(restored.agent.spentTactics,0);
 assert.deepEqual(restored.globalEvents,g.globalEvents);
 assert.equal(isGameState(restored),true);
 assert.equal(repeatSeed(restored).agent.spentTactics,0);
 const bad={...restored,agent:{...restored.agent,spentTactics:2}};
 assert.equal(isGameState(bad),false);
});

import { changeMode } from '../.engine-build/engine/simulation.js';
import { MODES, DEFAULT_MODE } from '../.engine-build/engine/balance.js';

test('v0.7 inicia no modo equilibrado e bloqueia alterações após começar', () => {
  const initial=createGame('BRA',12345);
  assert.equal(initial.mode,DEFAULT_MODE);
  assert.equal(initial.mode,'equilibrado');
  assert.equal(initial.version,7);
  const changed=changeMode(initial,'desafio');
  assert.equal(changed.mode,'desafio');
  assert.equal(initial.mode,'equilibrado');
  const started=startGame(changed);
  assert.equal(changeMode(started,'exploracao'),started);
  assert.equal(changeMode(initial,'invalid'),initial);
  assert.throws(()=>createGame('BRA',12345,'invalid'));
  assert.equal(isGameState(changed),true);
});

test('save versão 5 é migrado para Clássico, sem mudar a simulação de uma partida em andamento', () => {
  let current=startGame(createGame('BRA',874,'classico','legado'));
  for(let i=0;i<73;i++)current=advanceDay(current);
  const {mode,ruleset,...original}=current;
  const legacy={...original,version:5};
  const migrated=restoreGame(legacy);
  assert.ok(migrated);
  assert.equal(migrated.version,7);
  assert.equal(migrated.mode,'classico');
  assert.deepEqual(migrated.countries,current.countries);
  assert.deepEqual(advanceDay(migrated),advanceDay(current));
  assert.equal(isGameState({...migrated,mode:'invalid'}),false);
});

test('os modos expõem objetivos estáveis e saves com modo inválido são rejeitados', () => {
  assert.equal(MODES.classico.researchGoal,100);
  assert.equal(MODES.equilibrado.researchGoal,98.5);
  assert.equal(MODES.desafio.science>MODES.equilibrado.science,true);
  const game=startGame(createGame('BRA',1928,'desafio'));
  assert.equal(isGameState(game),true);
  assert.equal(restoreGame({...game,mode:'undefined'}),null);
});

test('a mesma seed e origem podem produzir desfechos opostos com escolhas diferentes', () => {
  let neutral=createGame('BRA',42,'equilibrado','legado');
  let faster=createGame('BRA',42,'equilibrado','legado');
  faster=adjustAttribute(faster,'propagacao',1);
  faster=adjustAttribute(faster,'instabilidade',1);
  neutral=startGame(neutral); faster=startGame(faster);
  for(let i=0;i<240;i++){neutral=advanceDay(neutral);faster=advanceDay(faster);}
  assert.equal(neutral.phase,'contained');
  assert.equal(faster.phase,'overwhelmed');
  assert.ok(neutral.day>faster.day);
});

test('resultado e replay carregam o modo e impedem comparar dificuldades diferentes', async () => {
  const {summarizeRun,repeatSeed,comparableRuns}=await import('../.engine-build/engine/outcome.js');
  let g=startGame(createGame('BRA',42,'equilibrado'));
  while(g.phase==='running')g=advanceDay(g);
  const summary=summarizeRun(g);
  assert.ok(summary);
  assert.equal(summary.mode,'equilibrado');
  assert.equal(summary.researchGoal,98.5);
  const repeat=repeatSeed(g);
  assert.equal(repeat.mode,'equilibrado');
  assert.equal(repeat.day,0);
  assert.equal(repeat.phase,'setup');
  assert.equal(comparableRuns(summary,{...summary,mode:'desafio'}),false);
  assert.equal(comparableRuns(summary,{...summary,seed:5}),false);
  assert.equal(comparableRuns(summary,{...summary}),true);
});

test('a amostra de balanceamento produz vitórias e derrotas no modo equilibrado', () => {
  const seeds=[7,11,21,42,75,101,123,124];
  const results=new Set();
  for(const origin of ['BRA','USA','CHN'])for(const seed of seeds){
    let g=startGame(createGame(origin,seed,'equilibrado'));
    while(g.phase==='running' && g.day<350)g=advanceDay(g);
    results.add(g.phase);
    assert.equal(isGameState(g),true);
  }
  assert.ok(results.has('contained'));
  assert.ok(results.has('overwhelmed'));
});

import { TUTORIAL_STEPS, getGuidance, upgradeFeedback, tacticFeedback } from '../.engine-build/engine/guide.js';

test('guia tem quatro etapas estáveis e instruções sobre saldo inicial e evolução', () => {
  assert.equal(TUTORIAL_STEPS.length,4);
  assert.match(TUTORIAL_STEPS[1].text,/8 pontos/);
  assert.match(TUTORIAL_STEPS[2].text,/10 dias/);
  assert.equal(new Set(TUTORIAL_STEPS.map(s=>s.caption)).size,4);
});

test('orientação muda de configuração para evolução conforme o estado real da partida', () => {
  const original=createGame('BRA',719,'equilibrado');
  const snap=structuredClone(original);
  let guide=getGuidance(original,'BRA');
  assert.equal(guide.action,'lab');
  assert.match(guide.title,/2 pontos iniciais/);
  assert.deepEqual(original,snap);
  let prepared=adjustAttribute(original,'resistencia',1);
  prepared=adjustAttribute(prepared,'instabilidade',1);
  guide=getGuidance(prepared,'BRA');
  assert.equal(guide.action,'start');
  let running=startGame(prepared);
  for(let i=0;i<10;i++)running=advanceDay(running);
  assert.equal(running.day,10);
  guide=getGuidance(running,'BRA');
  assert.equal(guide.action,'lab');
  assert.match(guide.title,/2 pontos de evolução/);
  const purchased=upgradeFeedback(running,'correntes');
  assert.ok(purchased?.includes('−2 PT'));
  assert.equal(upgradeFeedback(buyUpgrade(running,'correntes'),'correntes'),null);
});

test('feedback de ação tática deriva dos estados antes e depois, não altera saves', () => {
  let g=startGame(createGame('BRA',1024,'equilibrado'));
  for(let i=0;i<20;i++)g=advanceDay(g);
  const old=structuredClone(g);
  const next=applyTactic(g,'friccao','BRA');
  const feedback=tacticFeedback(g,next,'friccao','BRA');
  assert.ok(feedback?.includes('−3 PT'));
  assert.ok(feedback?.includes('Estabilidade'));
  assert.deepEqual(g,old);
  assert.equal(tacticFeedback(g,g,'friccao','BRA'),null);
  assert.equal(isGameState(next),true);
});

import {getTacticCost, applyTactic as tacticalAction} from '../.engine-build/engine/simulation.js';

test('v0.9.1: novas partidas usam regras revisadas, v6 restaura regras antigas intactas',()=>{
  const newGame=createGame('BRA',42,'desafio');
  assert.equal(newGame.version,7);
  assert.equal(newGame.ruleset,'revisado');
  const old=startGame(createGame('BRA',42,'desafio','legado'));
  let snapshot=old;
  for(let i=0;i<40;i++)snapshot=advanceDay(snapshot);
  const {ruleset,...data}=snapshot;
  const {tacticUses,...agent}=data.agent;
  const savedV6={...data,version:6,agent};
  const migrated=restoreGame(JSON.parse(JSON.stringify(savedV6)));
  assert.ok(migrated);
  assert.equal(migrated.version,7);
  assert.equal(migrated.ruleset,'legado');
  assert.deepEqual(migrated.agent.tacticUses,{pulso:0,friccao:0});
  let continuedOriginal=snapshot,continuedMigrated=migrated;
  for(let i=0;i<65;i++){continuedOriginal=advanceDay(continuedOriginal);continuedMigrated=advanceDay(continuedMigrated);}
  assert.deepEqual(continuedOriginal.countries,continuedMigrated.countries);
  assert.equal(continuedOriginal.day,continuedMigrated.day);
  assert.equal(continuedOriginal.phase,continuedMigrated.phase);
  assert.equal(restoreGame({...savedV6,mode:'inválido'}),null);
});

test('v0.9.1: custo progressivo contabilizado e saves adulterados rejeitados',()=>{
  let game=startGame(createGame('BRA',83));
  for(let day=0;day<40;day++)game=advanceDay(game);
  assert.equal(game.agent.points,8);
  assert.equal(getTacticCost(game,'pulso'),2);
  for(const price of [2,2,4]){
    const previous=game;
    game=tacticalAction(game,'pulso','BRA');
    assert.equal(previous.agent.points-game.agent.points,price);
    assert.equal(isGameState(game),true);
  }
  assert.equal(game.agent.spentTactics,8);
  assert.equal(game.agent.tacticUses.pulso,3);
  assert.equal(getTacticCost(game,'pulso'),4);
  assert.equal(restoreGame(JSON.parse(JSON.stringify(game))).agent.spentTactics,8);
  assert.equal(isGameState({...game,agent:{...game.agent,tacticUses:{pulso:2,friccao:0}}}),false);
  assert.equal(isGameState({...game,agent:{...game.agent,spentTactics:6,points:2}}),false);
  assert.equal(tacticalAction(game,'pulso','BRA'),game);
});

test('v0.9.1: contrapartida de pesquisa é específica do conjunto revisado',async()=>{
  let revised=startGame(createGame('BRA',1234));
  let legacy=startGame(createGame('BRA',1234,'equilibrado','legado'));
  for(let day=0;day<10;day++){revised=advanceDay(revised);legacy=advanceDay(legacy);}
  const priorResearch=getLabModifiers(revised).scienceFactor;
  revised=buyUpgrade(revised,'correntes');
  legacy=buyUpgrade(legacy,'correntes');
  assert.ok(getLabModifiers(revised).scienceFactor>priorResearch);
  assert.equal(getLabModifiers(legacy).scienceFactor,1+(legacy.agent.attributes.instabilidade-2)*.055);
  const {summarizeRun,repeatSeed,comparableRuns}=await import('../.engine-build/engine/outcome.js');
  while(revised.phase==='running')revised=advanceDay(revised);
  const summary=summarizeRun(revised);
  assert.ok(summary);
  assert.equal(summary.ruleset,'revisado');
  assert.equal(repeatSeed(revised).ruleset,'revisado');
  assert.equal(comparableRuns(summary,{...summary,ruleset:'legado'}),false);
  assert.equal(repeatSeed(legacy).ruleset,'legado');
});
