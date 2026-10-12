import { COUNTRIES, COUNTRY_BY_ID, TOTAL_POPULATION } from '../data/countries.js';
import { ATTRIBUTE_IDS, DEFAULT_ATTRIBUTES, UPGRADE_BY_ID, UPGRADE_IDS, isAttributes } from './laboratory.js';
import type { AttributeId, Attributes, UpgradeId } from './laboratory.js';
import { ACTIONS, COUNTRY_DOCTRINE, decideAction, initialGovernmentState } from './intelligence.js';
import type { GovernmentState } from './intelligence.js';
import { EVENT_DEFINITIONS, EVENT_KINDS, decideGlobalEvent, getEventModifiers, makeGlobalEvent } from './events.js';
import type { GlobalEvent } from './events.js';
import { TACTIC_BY_ID } from './tactics.js';
import type { TacticId } from './tactics.js';
import { DEFAULT_MODE, MODES, isGameMode } from './balance.js';
import type { GameMode } from './balance.js';

export type Policy = 'normal' | 'atencao' | 'restricoes' | 'emergencia';
export type Phase = 'setup' | 'running' | 'contained' | 'overwhelmed';

export interface CountryState {
  affected: number;
  newlyAffected: number;
  research: number;
  policy: Policy;
  government: GovernmentState;
}
export interface NewsItem {
  id: string;
  day: number;
  category: 'alerta' | 'pesquisa' | 'governo' | 'mundo' | 'evento';
  text: string;
}
export interface HistoryEntry { day: number; affected: number; research: number }
export interface AgentState {
  name: string;
  attributes: Attributes;
  points: number;
  purchased: UpgradeId[];
  spentTactics: number;
}
export interface GameState {
  version: 6;
  mode: GameMode;
  globalEvents: GlobalEvent[];
  agent: AgentState;
  seed: number;
  day: number;
  origin: string;
  phase: Phase;
  countries: Record<string, CountryState>;
  news: NewsItem[];
  history: HistoryEntry[];
}

// PRNG determinístico sem chamadas a Math.random() durante simulação.
function noise(seed: number, day: number, id: string, channel: number): number {
  let h = (seed ^ Math.imul(day + 1, 0x9e3779b1) ^ channel) >>> 0;
  for (let i=0; i<id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x85ebca6b) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const policyStrength: Record<Policy, number> = { normal: 1, atencao: .82, restricoes: .57, emergencia: .39 };

export function createGame(origin = 'BRA', seed = 20261012, mode: GameMode = DEFAULT_MODE): GameState {
  if (!COUNTRY_BY_ID[origin]) throw new Error('País de origem inválido');
  if (!Number.isSafeInteger(seed)) throw new Error('Seed inválida');
  if (!isGameMode(mode)) throw new Error('Modo inválido');
  const countries = Object.fromEntries(COUNTRIES.map(c => [c.id, {
    affected: 0, newlyAffected: 0, research: 0, policy: 'normal' as Policy, government:initialGovernmentState(),
  }]));
  return { version:6, mode, globalEvents:[], agent:{name:'PROTOCOLO ZERO',attributes:{...DEFAULT_ATTRIBUTES},points:0,purchased:[],spentTactics:0}, seed, day:0, origin, phase:'setup', countries, news:[], history:[{day:0, affected:0, research:0}] };
}
export function changeMode(game: GameState, mode: GameMode): GameState {
  return game.phase==='setup' && isGameMode(mode) ? {...game,mode} : game;
}
export function changeOrigin(game: GameState, id: string): GameState {
  if (game.phase!=='setup' || !COUNTRY_BY_ID[id]) return game;
  return {...game,origin:id};
}
export function getWorldStats(game: GameState) {
  let affected = 0;
  let activeCountries = 0;
  let researchTotal = 0;
  let researchWeight = 0;
  for (const country of COUNTRIES) {
    const state = game.countries[country.id];
    affected += state.affected;
    if (state.affected > 0) activeCountries++;
    researchTotal += state.research * country.science;
    researchWeight += country.science;
  }
  return {
    affected, activeCountries, population: TOTAL_POPULATION,
    affectedPct: affected / TOTAL_POPULATION * 100,
    research: researchWeight ? researchTotal / researchWeight : 0,
    leader: [...COUNTRIES].sort((a,b)=>game.countries[b.id].research-game.countries[a.id].research || b.science-a.science)[0].id,
    cooperating: COUNTRIES.filter(c=>game.countries[c.id].government.action==='cooperar').length,
    mobilized: COUNTRIES.filter(c=>game.countries[c.id].government.action==='mobilizar').length,
  };
}
export function setAgentName(game: GameState, name: string): GameState {
  if (game.phase !== 'setup' || typeof name !== 'string' || name.length > 28) return game;
  return {...game,agent:{...game.agent,name:name.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,28)}};
}
export function adjustAttribute(game: GameState, id: AttributeId, delta: -1 | 1): GameState {
  if (game.phase !== 'setup' || !ATTRIBUTE_IDS.includes(id) || ![-1,1].includes(delta)) return game;
  const next = {...game.agent.attributes,[id]:game.agent.attributes[id]+delta};
  if (!isAttributes(next)) return game;
  return {...game,agent:{...game.agent,attributes:next}};
}
export function availableUpgrade(game: GameState, id: UpgradeId): {ok:boolean;reason:string} {
  const def=UPGRADE_BY_ID[id];
  if (!def) return {ok:false,reason:'Melhoria desconhecida'};
  if (game.phase==='setup') return {ok:false,reason:'Inicie a simulação'};
  if (game.phase!=='running') return {ok:false,reason:'Partida encerrada'};
  if (game.agent.purchased.includes(id)) return {ok:false,reason:'Adquirida'};
  if (def.excludes && game.agent.purchased.includes(def.excludes)) return {ok:false,reason:'Bloqueada por escolha oposta'};
  if (game.agent.attributes[def.requires]<def.minLevel) return {ok:false,reason:`Exige ${def.minLevel} em ${def.requires}`};
  if (game.agent.points<def.cost) return {ok:false,reason:`Faltam ${def.cost-game.agent.points} pontos`};
  return {ok:true,reason:'Disponível'};
}
export function buyUpgrade(game: GameState, id: UpgradeId): GameState {
  const check=availableUpgrade(game,id);
  if (!check.ok) return game;
  const def=UPGRADE_BY_ID[id];
  return {...game,agent:{...game.agent,points:game.agent.points-def.cost,purchased:[...game.agent.purchased,id]},
    news:[{id:`upgrade-${id}`,day:game.day,category:'mundo' as const,text:`Laboratório: ${def.title} ativada no dia ${game.day}.`},...game.news].slice(0,70)};
}
export function availableTactic(game: GameState, id: TacticId, countryId: string): {ok:boolean;reason:string} {
  if (!Object.hasOwn(TACTIC_BY_ID,id)) return {ok:false,reason:'Ação desconhecida'};
  if (game.phase!=='running') return {ok:false,reason:game.phase==='setup'?'Inicie a simulação':'Partida encerrada'};
  if (!Object.hasOwn(COUNTRY_BY_ID,countryId)) return {ok:false,reason:'País inválido'};
  if (game.agent.points<TACTIC_BY_ID[id].cost) return {ok:false,reason:'Pontos insuficientes'};
  if (id==='pulso' && game.countries[countryId].affected===0) return {ok:false,reason:'País ainda sem atividade'};
  if (id==='pulso' && game.countries[countryId].affected===COUNTRY_BY_ID[countryId].population) return {ok:false,reason:'Território já no limite'};
  if (id==='friccao' && game.countries[countryId].government.stability===0 && game.countries[countryId].government.pressure===100) return {ok:false,reason:'Pressão já no limite'};
  return {ok:true,reason:'Disponível'};
}

/** Ações de jogo determinísticas: gastam pontos e atualizam o estado apenas do país alvo. */
export function applyTactic(game: GameState, id: TacticId, countryId: string): GameState {
  if (!availableTactic(game,id,countryId).ok) return game;
  const country=COUNTRY_BY_ID[countryId];
  const current=game.countries[countryId];
  const def=TACTIC_BY_ID[id];
  let updated: CountryState;
  let history=game.history;
  if (id==='pulso') {
    const increment=Math.min(country.population-current.affected,Math.round(country.population*.012));
    updated={...current,affected:current.affected+increment,newlyAffected:Math.min(country.population,current.newlyAffected+increment)};
    history=game.history.map((entry,i)=>i===game.history.length-1?{...entry,affected:entry.affected+increment}:entry);
  } else {
    updated={...current,government:{...current.government,
      stability:clamp(current.government.stability-8,0,100),
      pressure:clamp(current.government.pressure+5,0,100),
    }};
  }
  const spent=game.agent.spentTactics+def.cost;
  return {...game, agent:{...game.agent,points:game.agent.points-def.cost,spentTactics:spent},
    countries:{...game.countries,[countryId]:updated},history,
    news:[{id:`tactic-${game.day}-${countryId}-${spent}`,day:game.day,category:'mundo' as const,
      text:`Laboratório: ${def.title} aplicada em ${country.name} por ${def.cost} pontos.`},...game.news].slice(0,70)};
}

export function startGame(game: GameState): GameState {
  if (game.phase !== 'setup') return game;
  const population = COUNTRY_BY_ID[game.origin].population;
  const countries = { ...game.countries, [game.origin]: { ...game.countries[game.origin], affected:Math.round(population * .000004), newlyAffected:Math.round(population * .000004) } };
  return {
    ...game, phase:'running', countries,
    news:[{ id:'origem',day:0,category:'alerta',text:`Sinal anômalo detectado em ${COUNTRY_BY_ID[game.origin].name}. O monitoramento global começou.` }],
    history:[{day:0,affected:countries[game.origin].affected,research:0}],
  };
}
function policyFor(affectedRatio: number): Policy {
  if (affectedRatio >= .15) return 'emergencia';
  if (affectedRatio >= .035) return 'restricoes';
  if (affectedRatio >= .003) return 'atencao';
  return 'normal';
}
const policyName: Record<Policy, string> = {normal:'monitoramento',atencao:'alerta preventivo',restricoes:'restrições',emergencia:'medidas de emergência'};

export function getLabModifiers(game: GameState) {
  const a=game.agent.attributes;
  const has=(id:UpgradeId)=>game.agent.purchased.includes(id);
  return {
    growthFactor:(1+(a.propagacao-2)*.12)*(1+(a.instabilidade-2)*.055)*(has('correntes')?1.15:1)*(has('ruptura')?1.16:1)*(has('rede')?.88:1)*(has('nucleo')?1.24:1),
    networkFactor:(1+(a.propagacao-2)*.08)*(has('rede')?1.65:1)*(has('nucleo')?.45:1),
    signalFactor:(1+(a.discricao-2)*.16)*(has('sombras')?1.30:1),
    defenseFactor:(1+(a.resistencia-2)*.06)*(has('inercia')?1.14:1),
    scienceFactor:(1+(a.instabilidade-2)*.055)*(has('ruptura')?1.20:1),
  };
}

export function advanceDay(game: GameState): GameState {
  if (game.phase !== 'running') return game;
  const day = game.day + 1;
  // Coeficientes simbólicos de gameplay, sem modelagem de fenômenos reais.
  const {growthFactor,networkFactor,signalFactor,defenseFactor,scienceFactor}=getLabModifiers(game);
  const balance=MODES[game.mode];
  const next: Record<string, CountryState> = {};
  const events: NewsItem[] = [];
  const oldStats = getWorldStats(game);
  // Duas passagens: toda expansão do dia lê exclusivamente o snapshot do dia anterior.
  for (const country of COUNTRIES) {
    const previous = game.countries[country.id];
    const eventEffect=getEventModifiers(game.globalEvents,country.id,day);
    const ratio = previous.affected / country.population;
    const edges = country.links.reduce((sum, id) => {
      const linked = game.countries[id];
      const def = COUNTRY_BY_ID[id];
      return linked && def ? sum + linked.affected / def.population * ACTIONS[linked.government.action].links * getEventModifiers(game.globalEvents,id,day).links : sum;
    }, 0);
    let introductions = 0;
    if (previous.affected === 0 && edges > .00008) {
      const chance = clamp((edges * 15 + .028)*networkFactor * balance.network * ACTIONS[previous.government.action].links * eventEffect.links, 0, .9);
      if (noise(game.seed, day, country.id, 11) < chance) {
        introductions = Math.round(country.population * .000001);
        events.push({id:`arrival-${country.id}`,day,category:'alerta',text:`${country.name} registrou o primeiro sinal de crise.`});
      }
    }
    const variation = .91 + noise(game.seed, day, country.id, 23) * .18;
    const defense = previous.policy === 'normal' ? 1 : defenseFactor;
    const activeMeasure=ACTIONS[previous.government.action];
    const growth = Math.round(previous.affected * (.095 + country.connectivity * .0017) * policyStrength[previous.policy] * variation * growthFactor * balance.growth * defense * activeMeasure.growth * eventEffect.growth);
    const newlyAffected = clamp(growth + introductions, 0, country.population - previous.affected);
    const affected = previous.affected + newlyAffected;
    const nextRatio = affected / country.population;
    const policy = policyFor(nextRatio / signalFactor);
    if (policy !== previous.policy) {
      events.push({id:`policy-${day}-${country.id}`,day,category:'governo',text:`${country.name} adotou ${policyName[policy]}.`});
    }
    const hasActiveWorld = oldStats.activeCountries > 0;
    // Acordos só transferem avanços entre parceiros já monitorados no dia anterior.
    const partnerState=previous.government.partner ? game.countries[previous.government.partner] : undefined;
    const knowledge = previous.government.action==='cooperar' && partnerState
      ? clamp((partnerState.research-previous.research)*.018,0,.48) : 0;
    const scienceStep = hasActiveWorld ? (.12 + country.science * .006 + (ratio > .003 ? .12 : 0))*scienceFactor*balance.science*activeMeasure.science*eventEffect.science + knowledge : 0;
    const research = clamp(previous.research + scienceStep, 0, 100);
    for(const milestone of [25,50,75,100]) if(previous.research<milestone && research>=milestone) {
      events.push({id:`research-${milestone}-${country.id}`,day,category:'pesquisa',text:`${country.name} alcançou ${milestone}% de progresso científico.`});
    }
    // A próxima ação só é avaliada quando o mandato anterior termina, ou na crise extrema.
    const pressure=clamp(nextRatio*1500+(newlyAffected/country.population)*5000+(oldStats.activeCountries>5?4:0),0,100);
    let government:GovernmentState;
    const oldGov=previous.government;
    if(day>=oldGov.until || (pressure>=85 && oldGov.action!=='mobilizar' && oldGov.budget>13)) {
      const partners=country.links.filter(id=>game.countries[id] && game.countries[id].research>0);
      partners.sort((a,b)=>game.countries[b].research-game.countries[a].research || a.localeCompare(b));
      const choice=decideAction({doctrine:COUNTRY_DOCTRINE[country.id],pressure,budget:oldGov.budget,
        activeCountries:oldStats.activeCountries,science:country.science,research:previous.research,
        partner:partners[0]??null,roll:noise(game.seed,day,country.id,67)});
      government={action:choice.action,since:day,until:day+7+Math.floor(noise(game.seed,day,country.id,71)*5),
        budget:oldGov.budget,stability:oldGov.stability,pressure,partner:choice.partner,reason:choice.reason};
      if(choice.action!==oldGov.action || choice.partner!==oldGov.partner) events.push({
        id:`gov-${day}-${country.id}`,day,category:'governo',text:`${country.name}: ${ACTIONS[choice.action].label.toLowerCase()} por ${government.until-day} dias. ${choice.reason}`
      });
    } else government={...oldGov,pressure};
    const effect=ACTIONS[government.action];
    government.budget=clamp(government.budget + country.economy*.014 - effect.cost + eventEffect.recovery,0,100);
    government.stability=clamp(government.stability + .12-pressure*.012 + (government.action==='orientar'?.09:0) - (government.action==='mobilizar'?.13:0),0,100);
    if(government.action==='cooperar' && government.partner && day===government.since) {
      events.push({id:`partner-${day}-${country.id}`,day,category:'pesquisa',text:`${country.name} abriu um canal científico com ${COUNTRY_BY_ID[government.partner].name}.`});
    }
    next[country.id] = { affected, newlyAffected, research, policy, government };
  }
  // Eventos são avaliados APÓS os 18 países do dia: uma reação não altera o cálculo
  // de outro território retroativamente. Bônus temporários atuam a partir do próximo dia.
  const triggered: GlobalEvent[]=[];
  for (const country of COUNTRIES) {
    if (game.globalEvents.some(e=>e.countryId===country.id && day-e.day<30)) continue;
    const current=next[country.id];
    const {budget,stability,pressure,action,partner}=current.government;
    const conditions={budget,stability,pressure,action,partner,research:current.research,science:country.science};
    const kind=decideGlobalEvent(conditions,EVENT_KINDS.map((_,i)=>noise(game.seed,day,country.id,101+i)));
    if (!kind) continue;
    const event=makeGlobalEvent(kind,country.id,day,conditions);
    const impact=EVENT_DEFINITIONS[kind].impacts;
    current.government.budget=clamp(current.government.budget+impact.budget,0,100);
    current.government.stability=clamp(current.government.stability+impact.stability,0,100);
    current.research=clamp(current.research+impact.research,0,100);
    triggered.push(event);
    events.push({id:event.id,day,category:'evento',text:`${country.name}: ${event.title}. ${event.consequence}`});
  }
  if (day % 10===0) events.push({id:`lab-points-${day}`,day,category:'mundo',text:`Laboratório: +2 pontos de evolução recebidos no dia ${day}.`});
  const result: GameState = {
    ...game, day, globalEvents:[...triggered.reverse(),...game.globalEvents].slice(0,120), agent:day%10===0?{...game.agent,points:game.agent.points+2}:game.agent, countries:next,
    news:[...events, ...game.news].slice(0, 70),
    history: [...game.history, {day,affected:COUNTRIES.reduce((acc,c)=>acc+next[c.id].affected,0),research:0}].slice(-320),
  };
  const stats = getWorldStats(result);
  if(day%10===0) result.news.unshift({id:`leader-${day}`,day,category:'pesquisa',text:`Corrida científica: ${COUNTRY_BY_ID[stats.leader].name} lidera com ${result.countries[stats.leader].research.toFixed(1)}%.`});
  result.history[result.history.length-1].research = stats.research;
  if (stats.research >= balance.researchGoal) {
    result.phase='contained';
    result.news.unshift({id:`outcome-${day}`,day,category:'mundo',text:`Programa científico alcançou a meta do modo (${balance.researchGoal}%). A crise entrou em fase de contenção.`});
  } else if (stats.affectedPct >= 70) {
    result.phase='overwhelmed';
    result.news.unshift({id:`outcome-${day}`,day,category:'mundo',text:'O limite crítico do cenário foi ultrapassado. Simulação encerrada.'});
  }
  if (day % 20 === 0) result.news.unshift({id:`report-${day}`,day,category:'mundo',text:`Relatório do dia ${day}: ${stats.activeCountries} territórios em observação.`});
  return result;
}

// Validação de saves legados e atuais antes de migrar para o schema v6.
function isGameStateBase(value: unknown, version:1|2|3|4|5|6): boolean {
  if (!value || typeof value!=='object') return false;
  const g=value as Partial<GameState>;
  if (g.version!==version || !Number.isSafeInteger(g.seed) || !Number.isInteger(g.day) || (g.day??-1)<0 || !g.origin || !COUNTRY_BY_ID[g.origin]) return false;
  if (!['setup','running','contained','overwhelmed'].includes(g.phase??'')) return false;
  if (!g.countries || typeof g.countries!=='object' || !Array.isArray(g.news) || !Array.isArray(g.history)) return false;
  if (g.news.length>1000 || g.history.length>1000) return false;
  if (!g.news.every(n=>n && typeof n==='object' && typeof n.id==='string' && n.id.length<=120 &&
    Number.isInteger(n.day) && n.day>=0 && n.day<=g.day! && typeof n.text==='string' && n.text.length<=500 &&
    ['alerta','pesquisa','governo','mundo','evento'].includes(n.category))) return false;
  if (!g.history.every(h=>h && typeof h==='object' && Number.isInteger(h.day) && h.day>=0 && h.day<=g.day! &&
    Number.isInteger(h.affected) && h.affected>=0 && h.affected<=TOTAL_POPULATION &&
    typeof h.research==='number' && Number.isFinite(h.research) && h.research>=0 && h.research<=100)) return false;
  return COUNTRIES.every(country=>{
    const s=g.countries?.[country.id];
    return s && Number.isInteger(s.affected) && s.affected >= 0 && s.affected <= country.population &&
      Number.isInteger(s.newlyAffected) && s.newlyAffected>=0 && s.newlyAffected<=country.population &&
      typeof s.research==='number' && Number.isFinite(s.research) && s.research>=0 && s.research<=100 &&
      ['normal','atencao','restricoes','emergencia'].includes(s.policy);
  });
}
export function isGameState(value: unknown): value is GameState {
  if (!isGameStateBase(value,6)) return false;
  const g=value as GameState;
  if (!isGameMode(g.mode)) return false;
  if (!Array.isArray(g.globalEvents) || g.globalEvents.length>120) return false;
  if (!g.globalEvents.every((e,i)=>{
    if (!e || typeof e!=='object' || !EVENT_KINDS.includes(e.kind) || !COUNTRY_BY_ID[e.countryId] ||
      !Number.isInteger(e.day) || e.day<1 || e.day>g.day ||
      !Number.isInteger(e.expiresDay) || e.expiresDay!==e.day+EVENT_DEFINITIONS[e.kind].duration ||
      e.id!==`event-${e.day}-${e.countryId}-${e.kind}` ||
      e.title!==EVENT_DEFINITIONS[e.kind].title || e.consequence!==EVENT_DEFINITIONS[e.kind].consequence ||
      typeof e.cause!=='string' || e.cause.length>240 ||
      !e.impacts || Object.keys(e.impacts).length!==7 ||
      !Object.entries(EVENT_DEFINITIONS[e.kind].impacts).every(([k,v])=>e.impacts[k as keyof typeof e.impacts]===v) ||
      (i>0 && g.globalEvents[i-1].day<e.day)) return false;
    return !g.globalEvents.slice(i+1).some(other=>other.id===e.id);
  })) return false;
  if (!COUNTRIES.every(c=>{
    const gov=g.countries[c.id].government;
    return gov && typeof gov==='object' && Object.hasOwn(ACTIONS,gov.action) &&
      Number.isInteger(gov.since) && gov.since>=0 && gov.since<=g.day &&
      Number.isInteger(gov.until) && gov.until>=gov.since && gov.until<=g.day+13 &&
      ['budget','stability','pressure'].every(k=>typeof gov[k as keyof GovernmentState]==='number' && Number.isFinite(gov[k as keyof GovernmentState]) && (gov[k as keyof GovernmentState] as number)>=0 && (gov[k as keyof GovernmentState] as number)<=100) &&
      (gov.partner===null || (COUNTRY_BY_ID[gov.partner] && c.links.includes(gov.partner))) &&
      typeof gov.reason==='string' && gov.reason.length<=180 &&
      (gov.action==='cooperar' || gov.partner===null);
  })) return false;
  const a=g.agent;
  if (!a || typeof a!=='object' || typeof a.name!=='string' || a.name.length>28 || !isAttributes(a.attributes)) return false;
  if (!Number.isInteger(a.points) || a.points<0 || a.points>1000 || !Number.isInteger(a.spentTactics) || a.spentTactics<0 || a.spentTactics>1000 || !Array.isArray(a.purchased) || a.purchased.length>UPGRADE_IDS.length) return false;
  if (!a.purchased.every(id=>UPGRADE_IDS.includes(id)) || new Set(a.purchased).size!==a.purchased.length) return false;
  if (a.purchased.some(id=>a.attributes[UPGRADE_BY_ID[id].requires]<UPGRADE_BY_ID[id].minLevel)) return false;
  if (a.purchased.some(id=>UPGRADE_BY_ID[id].excludes && a.purchased.includes(UPGRADE_BY_ID[id].excludes!))) return false;
  if (a.points+a.spentTactics+a.purchased.reduce((sum,id)=>sum+UPGRADE_BY_ID[id].cost,0)!==Math.floor(g.day/10)*2) return false;
  if (g.phase==='setup' && (g.day!==0 || a.points!==0 || a.spentTactics!==0 || a.purchased.length!==0)) return false;
  return true;
}
export function restoreGame(value: unknown): GameState | null {
  if (isGameState(value)) return value;
  const versions=[1,2,3,4,5] as const;
  const version=versions.find(v=>isGameStateBase(value,v));
  if (!version) return null;
  const old=value as Omit<GameState,'version'|'mode'|'globalEvents'|'agent'> & {version:1|2|3|4|5;globalEvents?:GlobalEvent[];agent?:Omit<AgentState,'spentTactics'>};
  const countries=Object.fromEntries(COUNTRIES.map(c=>[c.id,{
    ...old.countries[c.id],
    government:version>=3?old.countries[c.id].government:{...initialGovernmentState(),since:old.day,until:old.day},
  }]));
  const agent=version>=2?old.agent:{name:'PROTOCOLO ZERO',attributes:{...DEFAULT_ATTRIBUTES},points:Math.floor(old.day/10)*2,purchased:[]};
  const migrated:GameState={...old,version:6,mode:'classico',globalEvents:version>=4?(old.globalEvents??[]):[],countries,agent:version===5?(old.agent as AgentState):{...agent!,spentTactics:0}};
  return isGameState(migrated)?migrated:null;
}
