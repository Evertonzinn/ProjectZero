/** Preferências de apresentação: nunca entram no GameState nem alteram a seed. */
import type { GameState } from './simulation.js';
import { getWorldStats } from './simulation.js';

export const IMMERSION_KEY = 'project-zero-immersion-v011';
export type Cue = 'start' | 'upgrade' | 'tactic' | 'alert' | 'event' | 'evolution' | 'victory' | 'contained';
export interface ImmersionPreferences { sound: boolean; motion: boolean }
export const DEFAULT_IMMERSION: Readonly<ImmersionPreferences> = { sound: false, motion: true };

export function parsePreferences(value: string | null): ImmersionPreferences {
  if (value === null) return { ...DEFAULT_IMMERSION };
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== 'object') return { ...DEFAULT_IMMERSION };
    const item = data as Partial<ImmersionPreferences>;
    return { sound: item.sound === true, motion: item.motion !== false };
  } catch { return { ...DEFAULT_IMMERSION }; }
}

export function effectiveMotion(preference: boolean, systemReducedMotion: boolean): boolean {
  return preference && !systemReducedMotion;
}

export interface Moment { cue: Cue; title: string; detail: string; day: number }
/** Uma única notificação prioritária por tick; nenhum estado global mutável. */
export function deriveMoment(before: GameState, after: GameState): Moment | null {
  if (before.seed !== after.seed || before.day > after.day || before.phase === 'setup') return null;
  if (before.phase !== 'overwhelmed' && after.phase === 'overwhelmed')
    return {cue:'victory',title:'LIMITE CRÍTICO ATINGIDO',detail:'O cenário foi encerrado. Consulte o relatório final.',day:after.day};
  if (before.phase !== 'contained' && after.phase === 'contained')
    return {cue:'contained',title:'RESPOSTA CIENTÍFICA CONCLUÍDA',detail:'A pesquisa atingiu a meta do modo de jogo.',day:after.day};
  if (after.day <= before.day || after.phase !== 'running') return null;
  const oldStats=getWorldStats(before),newStats=getWorldStats(after);
  for (const t of [50,30,15,5]) {
    if (oldStats.affectedPct < t && newStats.affectedPct >= t)
      return {cue:'alert',title:`MARCO GLOBAL · ${t}%`,detail:'Acompanhe a resposta dos governos no mapa.',day:after.day};
  }
  if (after.globalEvents.length > before.globalEvents.length) {
    const event=after.globalEvents[after.globalEvents.length-1];
    return {cue:'event',title:'EVENTO GLOBAL REGISTRADO',detail:event.title,day:after.day};
  }
  if (after.day % 10 === 0 && after.agent.points > before.agent.points)
    return {cue:'evolution',title:'+2 PONTOS DE EVOLUÇÃO',detail:'A simulação pausará para permitir decisões no laboratório.',day:after.day};
  return null;
}
