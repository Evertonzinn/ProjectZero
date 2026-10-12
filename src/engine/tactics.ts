/** Operações de tabuleiro completamente fictícias. Não representam mecanismos biológicos reais. */
export const TACTICS = [
  {
    id: 'pulso',
    title: 'Impulso local',
    description: 'Acelera o indicador abstrato de impacto no território selecionado, se ele já estiver ativo.',
    effect: '+1,2 ponto percentual no território (limitado à população restante)',
    cost: 2,
  },
  {
    id: 'friccao',
    title: 'Atrito institucional',
    description: 'Aumenta a pressão estratégica no governo selecionado, com consequências nas próximas decisões.',
    effect: '−8 estabilidade e +5 pressão social no país',
    cost: 3,
  },
] as const;
export type TacticId = typeof TACTICS[number]['id'];
export const TACTIC_BY_ID = Object.fromEntries(TACTICS.map(t => [t.id,t])) as Record<TacticId,typeof TACTICS[number]>;
