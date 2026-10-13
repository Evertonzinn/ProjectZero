/**
 * Bots estritamente determinísticos para AUDITORIA de gameplay.
 * Usam somente o mesmo motor público e os mesmos recursos do jogador.
 * Nunca alteram GameState diretamente nem alteram as regras do jogo.
 */
import {
  createGame, adjustAttribute, startGame, advanceDay, availableUpgrade, buyUpgrade,
  availableTactic, applyTactic, getWorldStats, isGameState,
} from '../.engine-build/engine/simulation.js';
import { COUNTRIES } from '../.engine-build/data/countries.js';

const BOT_DEFINITIONS = Object.freeze({
  observador: {
    label:'Observador', attributes:[], upgrades:[], tactic:null,
    rationale:'Linha de base sem compras; os pontos permanecem guardados.',
  },
  economizador: {
    label:'Economizador (controle)', attributes:['propagacao','resistencia'], upgrades:[], tactic:null,
    rationale:'Mesmos atributos do Concentrado, mas sem gastar pontos; isola o impacto das compras.',
  },
  concentrado: {
    label:'Concentrado', attributes:['propagacao','resistencia'], upgrades:['correntes','nucleo','inercia'], tactic:'pulso',
    rationale:'Foco em expansão interna e reforço do território ativo.',
  },
  conectividade: {
    label:'Conectividade', attributes:['propagacao','discricao'], upgrades:['rede','correntes','sombras'], tactic:'pulso',
    rationale:'Foco em conexões e avanço de novos territórios.',
  },
  discreto: {
    label:'Discreto', attributes:['discricao','resistencia'], upgrades:['sombras','inercia','nucleo'], tactic:'friccao',
    rationale:'Foco em resistência e pressão governamental.',
  },
  ruptura: {
    label:'Ruptura', attributes:['instabilidade','propagacao'], upgrades:['ruptura','correntes','rede'], tactic:'friccao',
    rationale:'Troca maior pressão científica por crescimento agressivo.',
  },
  adaptativo: {
    label:'Adaptativo', attributes:['propagacao','resistencia'], upgrades:['correntes','rede','inercia'], tactic:'dynamic',
    rationale:'Prioriza conexão cedo e muda a decisão conforme a corrida científica.',
  },
});
export const BOT_IDS = Object.freeze(Object.keys(BOT_DEFINITIONS));
export const BOT_INFO = BOT_DEFINITIONS;

function pulseTarget(game, strategy) {
  const options=COUNTRIES.filter(country => availableTactic(game,'pulso',country.id).ok);
  if(!options.length) return null;
  // Escores abstratos derivados de informações visíveis do tabuleiro, sem olhar o futuro.
  const rank=options.map(country => {
    const s=game.countries[country.id];
    const remaining=1-s.affected/country.population;
    const frontier=country.links.filter(id=>game.countries[id].affected===0).length;
    const score=strategy==='conectividade'||strategy==='adaptativo'
      ? country.population*remaining*(1+frontier*.10)
      : country.population*remaining;
    return {country,score};
  });
  rank.sort((a,b)=>b.score-a.score||a.country.id.localeCompare(b.country.id));
  return rank[0].country.id;
}
function frictionTarget(game){
  const options=COUNTRIES.filter(country => availableTactic(game,'friccao',country.id).ok);
  if(!options.length)return null;
  options.sort((a,b)=>{
    const aState=game.countries[a.id],bState=game.countries[b.id];
    const value=s=>s.research*3+s.government.stability-s.government.pressure*.2;
    return value(bState)-value(aState)||a.id.localeCompare(b.id);
  });
  return options[0].id;
}

/** Executa somente ações válidas, preservando o motor e os limites do jogador. */
export function playBotTurn(game, id){
  const bot=BOT_DEFINITIONS[id];if(!bot) throw new Error(`Bot desconhecido: ${id}`);
  if(game.phase!=='running'||(bot.upgrades.length===0&&!bot.tactic))return {game, purchases:0, tactics:0};
  let purchases=0,tactics=0;
  for(const upgrade of bot.upgrades){
    if(game.agent.purchased.includes(upgrade))continue;
    const check=availableUpgrade(game,upgrade);
    if(check.ok){
      const next=buyUpgrade(game,upgrade);
      if(next===game)throw new Error(`Compra elegível rejeitada: ${upgrade}`);
      game=next;purchases++;
    } else if(check.reason.includes('Faltam')) {
      // Reserva pontos até conseguir a melhoria planejada, como faria um jogador.
      return {game,purchases,tactics};
    }
    // Se excluída ou sem atributo suficiente, segue para a próxima melhoria.
  }
  // No máximo 5 táticas no mesmo checkpoint para evitar loops ou gastos irreais.
  for(let i=0;i<5;i++){
    let tactic=bot.tactic;
    if(tactic==='dynamic'){
      tactic=getWorldStats(game).research>70?'friccao':'pulso';
    }
    if(!tactic)break;
    let countryId=tactic==='pulso'?pulseTarget(game,id):frictionTarget(game);
    if(!countryId && bot.tactic==='dynamic'){
      tactic=tactic==='pulso'?'friccao':'pulso';
      countryId=tactic==='pulso'?pulseTarget(game,id):frictionTarget(game);
    }
    if(!countryId)break;
    const next=applyTactic(game,tactic,countryId);
    if(next===game)throw new Error(`Tática elegível rejeitada: ${tactic}`);
    game=next;tactics++;
  }
  return {game,purchases,tactics};
}

/** Inicia e conclui uma partida com a mesma interface pública usada no navegador. */
export function simulateBot({seed,origin,mode,botId,limit=350,verify=false}){
  const bot=BOT_DEFINITIONS[botId];if(!bot)throw new Error(`Bot desconhecido: ${botId}`);
  let game=createGame(origin,seed,mode);
  for(const attr of bot.attributes){const next=adjustAttribute(game,attr,1);if(next===game)throw new Error('Atributo inicial inválido');game=next;}
  game=startGame(game);
  let purchases=0,tactics=0;
  while(game.phase==='running'&&game.day<limit){
    game=advanceDay(game);
    if(game.phase==='running'&&game.day%10===0){const turn=playBotTurn(game,botId);game=turn.game;purchases+=turn.purchases;tactics+=turn.tactics;}
    if(verify&&!isGameState(game))throw new Error(`Save inválido: ${mode}/${botId}/${seed}/${game.day}`);
  }
  if(game.phase==='running')throw new Error(`Sem encerramento no dia ${limit}: ${mode}/${botId}/${seed}`);
  const stats=getWorldStats(game);
  if(game.agent.spentTactics<0||!isGameState(game))throw new Error('Estado inválido após conclusão');
  const expected=2*Math.floor(game.day/10);
  const cost=game.agent.purchased.reduce((sum,id)=>sum+({correntes:2,sombras:2,inercia:3,ruptura:3,rede:3,nucleo:3}[id]),0);
  if(game.agent.points+cost+game.agent.spentTactics!==expected) throw new Error('Contabilidade de pontos inconsistente');
  return {seed,origin,mode,bot:botId,day:game.day,outcome:game.phase,
    impactPct:stats.affectedPct,researchPct:stats.research,upgrades:purchases,tactics,tacticPoints:game.agent.spentTactics,
    remainingPoints:game.agent.points,game};
}
