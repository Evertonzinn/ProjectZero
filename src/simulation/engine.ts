import { COUNTRIES, COUNTRY_BY_ID, ROUTES, type CountryId } from '../data/countries';

export type GameStatus = 'setup' | 'running' | 'paused' | 'victory' | 'defeat';
export type Traits = { spread: number; stealth: number; endurance: number };
export type CountryMetrics = { exposure: number; alert: number; controlled: boolean };
export type GameEvent = { id: string; day: number; title: string; detail: string; kind: 'info' | 'warning' | 'success' };
export type GameState = {
  status: GameStatus;
  day: number;
  source: CountryId;
  agentName: string;
  traits: Traits;
  countries: Record<CountryId, CountryMetrics>;
  research: number;
  cureLeader: CountryId;
  events: GameEvent[];
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function emptyCountries(): Record<CountryId, CountryMetrics> {
  return Object.fromEntries(COUNTRIES.map(({ id }) => [id, { exposure: 0, alert: 0, controlled: false }])) as Record<CountryId, CountryMetrics>;
}

export function createGame(source: CountryId = 'BRA', agentName = 'ZERO-01', traits: Traits = { spread: 5, stealth: 5, endurance: 5 }): GameState {
  return {
    status: 'setup', day: 0, source, agentName, traits,
    countries: emptyCountries(), research: 0, cureLeader: 'JPN', events: [],
  };
}

export function startGame(draft: GameState): GameState {
  if (draft.status !== 'setup') return draft;
  return {
    ...draft,
    status: 'running',
    countries: { ...draft.countries, [draft.source]: { exposure: 3.5, alert: 1, controlled: false } },
    events: [{ id: 'begin', day: 0, kind: 'info', title: 'Simulação iniciada', detail: `O agente ${draft.agentName} foi detectado em ${COUNTRY_BY_ID[draft.source].name}.` }],
  };
}

/** Ruído reprodutível para decisões ficcionais; dispensa Math.random e backend. */
function deterministic(day: number, index: number, source: CountryId): number {
  let n = (day * 19087 + index * 9521 + source.charCodeAt(0) * 1237) | 0;
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function simulateDay(current: GameState): GameState {
  if (current.status !== 'running') return current;

  const day = current.day + 1;
  const nextCountries = Object.fromEntries(
    COUNTRIES.map(({ id, defense }) => {
      const previous = current.countries[id];
      if (previous.exposure <= 0) return [id, { ...previous }];
      const resilience = 1 - ((defense / 100) * 0.35);
      const growth = (0.7 + previous.exposure * (0.08 + current.traits.spread * 0.011)) * resilience * (0.65 + current.traits.endurance * 0.07);
      const exposure = clamp(previous.exposure + growth);
      const alert = clamp(previous.alert + Math.max(0.25, exposure * (0.01 + (10 - current.traits.stealth) * 0.002)));
      return [id, { exposure, alert, controlled: alert >= 63 }];
    }),
  ) as Record<CountryId, CountryMetrics>;

  const events: GameEvent[] = [];
  ROUTES.forEach((route, index) => {
    const a = current.countries[route.from];
    const b = current.countries[route.to];
    const from = a.exposure >= b.exposure ? route.from : route.to;
    const to = from === route.from ? route.to : route.from;
    const sender = current.countries[from];
    const receiver = current.countries[to];
    if (sender.exposure < 13 || receiver.exposure > 0) return;
    const guard = COUNTRY_BY_ID[to].defense;
    const chance = Math.min(0.58, 0.045 + current.traits.spread * 0.019 + route.intensity * 0.16 - guard * 0.001);
    if (deterministic(day, index, current.source) < chance && nextCountries[to].exposure <= 0) {
      nextCountries[to] = { exposure: 1.4 + route.intensity, alert: 0.2, controlled: false };
      events.push({
        id: `${day}-${to}`, day, kind: 'warning', title: `Novo território: ${COUNTRY_BY_ID[to].name}`,
        detail: `Sinal detectado por rota ${route.mode === 'air' ? 'aérea' : 'marítima'} internacional.`,
      });
    }
  });

  const reached = COUNTRIES.filter(({ id }) => nextCountries[id].exposure > 0);
  const exposureIndex = COUNTRIES.reduce((total, { id }) => total + nextCountries[id].exposure, 0) / COUNTRIES.length;
  const detectionPressure = 1 + (10 - current.traits.stealth) * 0.07;
  const research = clamp(current.research + (reached.length * 0.19 + exposureIndex * 0.024) * detectionPressure);

  if (current.research < 25 && research >= 25) {
    events.push({ id: `research25-${day}`, day, kind: 'info', title: 'Rede científica mobilizada', detail: 'A resposta global entrou na fase de investigação coordenada.' });
  }
  if (current.research < 50 && research >= 50) {
    events.push({ id: `research50-${day}`, day, kind: 'warning', title: 'Centro de pesquisa identificado', detail: `${COUNTRY_BY_ID[current.cureLeader].name} lidera a corrida por uma solução.` });
  }
  if (current.research < 75 && research >= 75) {
    events.push({ id: `research75-${day}`, day, kind: 'warning', title: 'Contramedida em fase final', detail: 'Os países intensificaram suas ações conjuntas.' });
  }

  const majorReached = COUNTRIES.filter(({ id }) => nextCountries[id].exposure >= 35).length;
  let status: GameStatus = 'running';
  if (research >= 100) status = 'defeat';
  else if (majorReached >= 16) status = 'victory';
  if (status !== 'running') {
    events.push({
      id: `end-${day}`, day, kind: status === 'victory' ? 'success' : 'warning',
      title: status === 'victory' ? 'Expansão global concluída' : 'Resposta global concluída',
      detail: status === 'victory' ? 'Você atingiu o objetivo desta simulação.' : 'A rede científica concluiu sua contramedida antes do objetivo.',
    });
  }

  return {
    ...current, day, countries: nextCountries, research, status,
    events: [...events.reverse(), ...current.events].slice(0, 28),
  };
}

export function getGlobalStats(state: GameState) {
  const reached = COUNTRIES.filter(({ id }) => state.countries[id].exposure > 0).length;
  const exposure = COUNTRIES.reduce((sum, { id }) => sum + state.countries[id].exposure, 0) / COUNTRIES.length;
  const alerts = COUNTRIES.filter(({ id }) => state.countries[id].controlled).length;
  return { reached, exposure, alerts };
}
