/** Project Zero: eventos inteiramente ficcionais e determinísticos, sem modelos do mundo real. */
import type { GovernmentAction } from './intelligence.js';

export type GlobalEventKind = 'crise_economica' | 'instabilidade_politica' | 'descoberta_cientifica' | 'ruptura_diplomatica';
export const EVENT_KINDS: readonly GlobalEventKind[] = [
  'crise_economica', 'instabilidade_politica', 'descoberta_cientifica', 'ruptura_diplomatica',
];
export interface EventImpacts {
  budget: number; stability: number; research: number;
  growth: number; links: number; science: number; recovery: number;
}
export interface GlobalEvent {
  id: string;
  kind: GlobalEventKind;
  countryId: string;
  day: number;
  expiresDay: number;
  title: string;
  cause: string;
  consequence: string;
  impacts: EventImpacts;
}
export const EVENT_DEFINITIONS: Readonly<Record<GlobalEventKind, {
  title: string; duration: number; impacts: EventImpacts; consequence: string;
}>> = {
  crise_economica: {
    title: 'Contração econômica', duration: 13,
    impacts: {budget:-7,stability:-5,research:0,growth:1,links:.90,science:.90,recovery:-.22},
    consequence:'Orçamento −7, estabilidade −5; conexões, ciência e recuperação fiscal reduzidas temporariamente.',
  },
  instabilidade_politica: {
    title: 'Instabilidade institucional',duration: 12,
    impacts: {budget:-3,stability:-9,research:0,growth:1.06,links:.84,science:.87,recovery:-.12},
    consequence:'Estabilidade −9, orçamento −3; governo perde eficiência por 12 dias.',
  },
  descoberta_cientifica: {
    title: 'Avanço científico inesperado',duration: 11,
    impacts: {budget:-2,stability:2,research:5,growth:1,links:1,science:1.18,recovery:0},
    consequence:'Pesquisa +5 pontos permanentes e ciência acelerada por 11 dias; investimento custa 2 de orçamento.',
  },
  ruptura_diplomatica: {
    title: 'Ruptura diplomática',duration: 14,
    impacts: {budget:-2,stability:-4,research:0,growth:1,links:.72,science:.80,recovery:-.06},
    consequence:'Orçamento −2, estabilidade −4; circulação e intercâmbio científico prejudicados por 14 dias.',
  },
};
export interface EventConditions {
  budget: number; stability: number; pressure: number; research: number;
  science: number; action: GovernmentAction; partner: string|null;
}
/** Uma tentativa independente por tipo. Só dispara quando indicadores justificam a narrativa. */
export function decideGlobalEvent(state: EventConditions, rolls: readonly number[]): GlobalEventKind|null {
  if (state.budget<=42 && state.pressure>=18 &&
    ['restringir','mobilizar','investir'].includes(state.action) && rolls[0]<.19) return 'crise_economica';
  if (state.stability<=68 && state.pressure>=28 && rolls[1]<.18) return 'instabilidade_politica';
  if (state.research>=22 && state.science>=60 &&
    ['investir','cooperar'].includes(state.action) && rolls[2]<.115) return 'descoberta_cientifica';
  if (state.action==='cooperar' && state.partner!==null && state.pressure>=12 && rolls[3]<.14)
    return 'ruptura_diplomatica';
  return null;
}
export function makeGlobalEvent(kind: GlobalEventKind, countryId: string, day: number, state: EventConditions): GlobalEvent {
  const def=EVENT_DEFINITIONS[kind];
  const evidence: Record<GlobalEventKind,string> = {
    crise_economica:`Orçamento em ${state.budget.toFixed(0)}/100 e pressão social em ${state.pressure.toFixed(0)}/100 sob medidas custosas.`,
    instabilidade_politica:`Estabilidade em ${state.stability.toFixed(0)}/100 diante de pressão social em ${state.pressure.toFixed(0)}/100.`,
    descoberta_cientifica:`Progresso em ${state.research.toFixed(1)}% com capacidade científica ${state.science}/100 e prioridade de pesquisa.`,
    ruptura_diplomatica:`Canal com ${state.partner??'parceiro'} tensionado por pressão social de ${state.pressure.toFixed(0)}/100.`,
  };
  return {
    id:`event-${day}-${countryId}-${kind}`,kind,countryId,day,expiresDay:day+def.duration,
    title:def.title,cause:evidence[kind],consequence:def.consequence,impacts:{...def.impacts},
  };
}
export function getEventModifiers(events: readonly GlobalEvent[], countryId: string, day: number) {
  let growth=1,links=1,science=1,recovery=0;
  for (const event of events) if (event.countryId===countryId && event.day<day && day<=event.expiresDay) {
    growth*=event.impacts.growth;
    links*=event.impacts.links;
    science*=event.impacts.science;
    recovery+=event.impacts.recovery;
  }
  return {growth,links,science,recovery};
}
