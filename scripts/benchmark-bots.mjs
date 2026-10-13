/** Benchmark reproduzível incluindo compras e táticas, sem cheats ou telemetria. */
import { BOT_IDS, BOT_INFO, simulateBot } from './strategy-bots.mjs';
import { MODES } from '../.engine-build/engine/balance.js';

const SEEDS=[7,11,21,42,75,101,123,124,222,333,444,555,777,1001,2026,20261012];
const ORIGINS=['BRA','USA','CHN'];
const MODES_TO_TEST=Object.keys(MODES);

export function benchmarkBots({seeds=SEEDS,origins=ORIGINS,modes=MODES_TO_TEST,bots=BOT_IDS,verify=false,ruleset='revisado'}={}){
  const rows=[];
  const result=[];
  for(const mode of modes)for(const bot of bots){
    const trials=[];
    for(const origin of origins)for(const seed of seeds){
      const {game,...result}=simulateBot({seed,origin,mode,botId:bot,verify,ruleset});
      trials.push(result);
    }
    const total=trials.length,contained=trials.filter(x=>x.outcome==='contained').length;
    rows.push({modo:mode,estrategia:bot,partidas:total,vit_player_pct:+((total-contained)/total*100).toFixed(1),
      contenção_pct:+(contained/total*100).toFixed(1),dias_medios:+(trials.reduce((v,x)=>v+x.day,0)/total).toFixed(1),
      melhorias_medias:+(trials.reduce((v,x)=>v+x.upgrades,0)/total).toFixed(2),
      taticas_medias:+(trials.reduce((v,x)=>v+x.tactics,0)/total).toFixed(2),
      pontos_nao_usados:+(trials.reduce((v,x)=>v+x.remainingPoints,0)/total).toFixed(2)});
    result.push(...trials);
  }
  const different=[];
  for(const mode of modes)for(const origin of origins)for(const seed of seeds){
    const group=result.filter(x=>x.mode===mode&&x.origin===origin&&x.seed===seed);
    if(new Set(group.map(x=>x.outcome)).size>1)different.push({mode,origin,seed});
  }
  const controlComparisons=[];
  if(bots.includes('economizador')){
    for(const mode of modes){
      const baseline=rows.find(x=>x.modo===mode&&x.estrategia==='economizador');
      for(const row of rows.filter(x=>x.modo===mode&&x.estrategia!=='economizador')){
        const controlled=['concentrado','adaptativo'].includes(row.estrategia);
        controlComparisons.push({mode,strategy:row.estrategia,controlled,
          deltaVitPlayerPct:+(row.vit_player_pct-baseline.vit_player_pct).toFixed(1),
          deltaDays:+(row.dias_medios-baseline.dias_medios).toFixed(1)});
      }
    }
  }
  const summary={setup:{seeds,origins,modes,bots,ruleset},total:result.length,rows,different,controlComparisons,
    botDescriptions:Object.fromEntries(bots.map(id=>[id,BOT_INFO[id].rationale]))};
  return summary;
}

if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){
  const report=benchmarkBots();
  console.table(report.rows);
  console.log('Partidas:',report.total,'Cenários com vencedores distintos conforme estratégia:',report.different.length);
  console.table(report.controlComparisons.filter(x=>x.controlled));
  console.log('Controle válido de atributos apenas para Concentrado e Adaptativo contra Economizador.');
  console.log('Benchmark determinístico: políticas fixas, sem aprendizado, sem compras ilegais, sem internet.');
  if(process.argv.includes('--json')) console.log('BEGIN_JSON\n'+JSON.stringify(report,null,2)+'\nEND_JSON');
}
