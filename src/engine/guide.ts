/** Orientações sobre as regras de jogo: sem previsões inventadas ou novas mecânicas. */
import { freeAttributePoints, UPGRADES, UPGRADE_BY_ID } from './laboratory.js';
import type { UpgradeId } from './laboratory.js';
import { COUNTRIES, COUNTRY_BY_ID } from '../data/countries.js';
import { availableTactic, availableUpgrade, getWorldStats } from './simulation.js';
import type { GameState } from './simulation.js';
import { TACTIC_BY_ID } from './tactics.js';
import type { TacticId } from './tactics.js';
import { MODES } from './balance.js';

export const TUTORIAL_STEPS = [
  { title:'Prepare o cenário', caption:'01 / CONFIGURAÇÃO', text:'Escolha um país de origem e o modo de dificuldade na coluna esquerda. A seed identifica a simulação: repetindo a mesma seed e os mesmos atributos, você pode comparar decisões.' },
  { title:'Distribua 8 pontos iniciais', caption:'02 / LABORATÓRIO', text:'Abra o Laboratório Zero e distribua até 8 pontos entre os quatro atributos. Eles definem sua estratégia de partida e são diferentes dos pontos de evolução conquistados depois.' },
  { title:'Decida a cada 10 dias', caption:'03 / EVOLUÇÃO', text:'Inicie a simulação. A cada 10 dias você recebe 2 pontos de evolução, e o relógio pausa. Invista nas melhorias únicas ou em ações táticas repetíveis no país selecionado.' },
  { title:'Leia o mundo e tente de novo', caption:'04 / RESULTADO', text:'Observe o mapa, os governos, os eventos e o avanço científico. O cenário acaba quando o impacto chega a 70% ou quando a pesquisa atinge a meta do modo. Repita a seed para testar outra estratégia.' },
] as const;

export interface Guidance {
  title: string;
  description: string;
  actionLabel: string;
  action: 'lab'|'start'|'outcome'|'none';
  tone: 'neutral'|'attention'|'positive';
}

export function getGuidance(game: GameState, selected: string): Guidance {
  if (game.phase==='setup') {
    const free=freeAttributePoints(game.agent.attributes);
    if (free>0) return {title:`${free} pontos iniciais para distribuir`,description:'Abra o laboratório e configure seus atributos. Pontos iniciais não compram evoluções.',actionLabel:'CONFIGURAR ATRIBUTOS',action:'lab',tone:'neutral'};
    return {title:'Configuração pronta',description:'Escolha a origem e o modo à esquerda. Inicie quando quiser; a primeira pausa de evolução ocorrerá no dia 10.',actionLabel:'INICIAR CENÁRIO',action:'start',tone:'positive'};
  }
  if (game.phase==='contained'||game.phase==='overwhelmed') return {
    title:game.phase==='contained'?'A resposta científica concluiu a contenção':'O limite crítico foi atingido',
    description:`Partida encerrada no dia ${game.day}. Consulte os marcos e tente uma nova estratégia usando a mesma seed.`,actionLabel:'VER RESULTADO',action:'outcome',tone:'neutral',
  };
  const stats=getWorldStats(game);
  if (game.agent.points>=2) {
    const upgrades=UPGRADES.filter(u=>availableUpgrade(game,u.id).ok).length;
    const canTactic=COUNTRIES.some(c=>availableTactic(game,'pulso',c.id).ok||availableTactic(game,'friccao',c.id).ok);
    if (upgrades>0||canTactic) return {title:`${game.agent.points} pontos de evolução disponíveis`,description:`${upgrades} melhorias únicas habilitadas. As ações táticas podem ser repetidas; escolha o país-alvo e compare os efeitos.`,actionLabel:'ABRIR LABORATÓRIO',action:'lab',tone:'attention'};
    return {title:'Pontos acumulados',description:'Os requisitos atuais ou o saldo impedem algumas compras. Confira o motivo exibido em cada opção e seus países ativos.',actionLabel:'VER OPÇÕES',action:'lab',tone:'attention'};
  }
  if (stats.research>=MODES[game.mode].researchGoal*.8) return {title:'Corrida científica avançada',description:`Pesquisa mundial em ${stats.research.toFixed(1)}%. Meta deste modo: ${MODES[game.mode].researchGoal}%. Acompanhe os governos e considere suas próximas escolhas.`,actionLabel:'VER LABORATÓRIO',action:'lab',tone:'attention'};
  if (stats.affectedPct>=50) return {title:'O cenário se aproxima do limite crítico',description:`Impacto global em ${stats.affectedPct.toFixed(1)}%; o limite da partida é 70%. A pesquisa também pode encerrar o jogo antes.`,actionLabel:'VER ESTRATÉGIA',action:'lab',tone:'attention'};
  const region=COUNTRY_BY_ID[selected];
  return {title:'Observe as decisões no mapa',description:`O território selecionado é ${region?.name??'o mapa'}. Consulte os governos, eventos e indicadores; os próximos 2 pontos chegam no dia ${Math.floor(game.day/10+1)*10}.`,actionLabel:'ABRIR LABORATÓRIO',action:'lab',tone:'neutral'};
}

export function upgradeFeedback(before: GameState, id: UpgradeId): string | null {
  if (!availableUpgrade(before,id).ok) return null;
  const up=UPGRADE_BY_ID[id];
  return `✓ ${up.title}: −${up.cost} PT. ${up.effect}${up.tradeoff?`; contrapartida: ${up.tradeoff}`:''}. Os modificadores valem nos próximos dias.`;
}

export function tacticFeedback(before: GameState, after: GameState, id: TacticId, countryId: string): string | null {
  if (before===after) return null;
  const b=before.countries[countryId],a=after.countries[countryId],country=COUNTRY_BY_ID[countryId];
  if (!b||!a||!country) return null;
  if (id==='pulso') return `✓ ${TACTIC_BY_ID[id].title}: −${TACTIC_BY_ID[id].cost} PT em ${country.name}. Indicador local: ${(b.affected/country.population*100).toFixed(2)}% → ${(a.affected/country.population*100).toFixed(2)}%.`;
  return `✓ ${TACTIC_BY_ID[id].title}: −${TACTIC_BY_ID[id].cost} PT em ${country.name}. Estabilidade ${b.government.stability.toFixed(0)} → ${a.government.stability.toFixed(0)}; pressão ${b.government.pressure.toFixed(0)} → ${a.government.pressure.toFixed(0)}.`;
}
