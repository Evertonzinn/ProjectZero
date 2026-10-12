/** Executar com npm run benchmark (usa o motor TypeScript compilado). */
import {createGame, startGame, advanceDay, adjustAttribute} from '../.engine-build/engine/simulation.js';
import {MODES} from '../.engine-build/engine/balance.js';
const seeds=[7,11,21,42,75,101,123,124,222,333,444,555,777,1001,2026,20261012];
const origins=['BRA','USA','CHN'];
const strategies=['neutra','expansiva','discreta'];
const counts={};
for(const mode of Object.keys(MODES)){
  let total=0, scientific=0, days=0, different=0;
  for(const origin of origins)for(const seed of seeds){
    const outcomes=[];
    for(const strategy of strategies){
      let g=createGame(origin,seed,mode);
      if(strategy==='expansiva'){g=adjustAttribute(g,'propagacao',1);g=adjustAttribute(g,'instabilidade',1)}
      if(strategy==='discreta'){g=adjustAttribute(g,'discricao',1);g=adjustAttribute(g,'resistencia',1)}
      g=startGame(g);
      while(g.phase==='running'&&g.day<350)g=advanceDay(g);
      if(g.phase==='running')throw Error('Partida sem conclusão no limite de 350 dias');
      total++;days+=g.day;if(g.phase==='contained')scientific++;
      outcomes.push(g.phase);
    }
    if(new Set(outcomes).size>1)different++;
  }
  counts[mode]={partidas:total,conclusoes_cientificas:scientific,taxa_contencao_pct:+(scientific/total*100).toFixed(1),dias_medios:+(days/total).toFixed(1),seeds_com_desfechos_distintos:different};
}
console.table(counts);
console.log('Amostra: 16 seeds × 3 origens × 3 estratégias. Resultados empíricos de jogo, não probabilidades garantidas.');
