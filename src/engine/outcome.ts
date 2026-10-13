/** Resultados calculados a partir do estado real do jogo, sem simulação adicional. */
import { COUNTRY_BY_ID, TOTAL_POPULATION } from '../data/countries.js';
import { createGame, getWorldStats } from './simulation.js';
import type { GameState } from './simulation.js';
import type { Attributes } from './laboratory.js';
import { MODES } from './balance.js';
import type { GameMode } from './balance.js';

export interface RunSummary {
  seed: number;
  mode: GameMode;
  ruleset: GameState['ruleset'];
  origin: string;
  attributes: Attributes;
  day: number;
  outcome: 'contained' | 'overwhelmed';
  researchGoal: number;
  affectedPct: number;
  research: number;
  activeCountries: number;
  upgrades: number;
  tacticsSpent: number;
  events: number;
}
export interface Milestone { day: number; label: string; category: 'inicio'|'expansao'|'pesquisa'|'evento'|'fim' }

export function summarizeRun(game: GameState): RunSummary | null {
  if (game.phase !== 'contained' && game.phase !== 'overwhelmed') return null;
  const stats = getWorldStats(game);
  return {
    seed:game.seed, mode:game.mode, ruleset:game.ruleset, origin:game.origin, attributes:{...game.agent.attributes},
    day:game.day, outcome:game.phase, researchGoal:MODES[game.mode].researchGoal, affectedPct:stats.affectedPct,
    research:stats.research, activeCountries:stats.activeCountries,
    upgrades:game.agent.purchased.length, tacticsSpent:game.agent.spentTactics, events:game.globalEvents.length,
  };
}

export function comparableRuns(previous:RunSummary|null,current:RunSummary): boolean {
  return !!previous && previous.seed===current.seed && previous.mode===current.mode && previous.ruleset===current.ruleset && previous.origin===current.origin &&
    (Object.keys(current.attributes) as (keyof Attributes)[]).every(key=>previous.attributes[key]===current.attributes[key]);
}

export function repeatSeed(game:GameState):GameState {
  const fresh = createGame(game.origin, game.seed, game.mode, game.ruleset);
  return {...fresh,agent:{...fresh.agent,name:game.agent.name,attributes:{...game.agent.attributes}}};
}

export function buildMilestones(game:GameState):Milestone[] {
  const result:Milestone[]=[{day:0,label:`Início em ${COUNTRY_BY_ID[game.origin].name}`,category:'inicio'}];
  const thresholds = [
    {threshold:1,field:'affected' as const,label:'1% da população impactada',category:'expansao' as const},
    {threshold:10,field:'affected' as const,label:'10% da população impactada',category:'expansao' as const},
    {threshold:30,field:'affected' as const,label:'30% da população impactada',category:'expansao' as const},
    {threshold:50,field:'affected' as const,label:'50% da população impactada',category:'expansao' as const},
    {threshold:25,field:'research' as const,label:'Pesquisa global chegou a 25%',category:'pesquisa' as const},
    {threshold:50,field:'research' as const,label:'Pesquisa global chegou a 50%',category:'pesquisa' as const},
    {threshold:75,field:'research' as const,label:'Pesquisa global chegou a 75%',category:'pesquisa' as const},
    {threshold:MODES[game.mode].researchGoal,field:'research' as const,label:`Meta científica do modo (${MODES[game.mode].researchGoal}%) alcançada`,category:'pesquisa' as const},
  ];
  for(const t of thresholds){
    const record=game.history.find(h=>(t.field==='affected'?h.affected/TOTAL_POPULATION*100:h.research)>=t.threshold);
    if(record)result.push({day:record.day,label:t.label,category:t.category});
  }
  // Somente eventos retidos no histórico limitado do save; nunca inventar eventos anteriores.
  for(const event of game.globalEvents.slice(-5)){
    result.push({day:event.day,label:`${event.title} — ${COUNTRY_BY_ID[event.countryId].name}`,category:'evento'});
  }
  if(game.phase==='contained'||game.phase==='overwhelmed'){
    result.push({day:game.day,label:game.phase==='contained'?'Contenção científica concluída':'Limite crítico do cenário atingido',category:'fim'});
  }
  return result.sort((a,b)=>a.day-b.day || (a.category==='inicio'?-1:b.category==='inicio'?1:0));
}
