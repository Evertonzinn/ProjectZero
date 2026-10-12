/** Laboratório ficcional. Todos os valores representam mecânicas de jogo abstratas. */
export const ATTRIBUTE_IDS = ['propagacao', 'discricao', 'resistencia', 'instabilidade'] as const;
export type AttributeId = (typeof ATTRIBUTE_IDS)[number];
export type Attributes = Record<AttributeId, number>;
export const ATTRIBUTE_BUDGET = 8;
export const ATTRIBUTE_MAX = 4;
export const DEFAULT_ATTRIBUTES: Attributes = { propagacao: 2, discricao: 2, resistencia: 1, instabilidade: 1 };
export const ATTRIBUTES: Record<AttributeId, { title: string; description: string; impact: string; color: string }> = {
  propagacao: { title: 'Propagação', description: 'Ritmo abstrato de expansão do cenário.', impact: 'Acelera o avanço nos territórios ativos.', color: 'orange' },
  discricao: { title: 'Discrição', description: 'Intensidade dos sinais que acionam respostas.', impact: 'Retarda medidas governamentais.', color: 'blue' },
  resistencia: { title: 'Resistência', description: 'Inércia da expansão diante de restrições.', impact: 'Reduz o efeito das medidas defensivas.', color: 'green' },
  instabilidade: { title: 'Instabilidade', description: 'Pressão sistêmica fictícia gerada pelo evento.', impact: 'Aumenta expansão, mas também a pesquisa mundial.', color: 'violet' },
};

export const UPGRADE_IDS = ['correntes', 'sombras', 'inercia', 'ruptura', 'rede', 'nucleo'] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];
export interface UpgradeDefinition {
  id: UpgradeId;
  title: string;
  description: string;
  effect: string;
  tradeoff?: string;
  cost: number;
  requires: AttributeId;
  minLevel: number;
  excludes?: UpgradeId;
}
export const UPGRADES: readonly UpgradeDefinition[] = [
  { id: 'correntes', title: 'Correntes cruzadas', description: 'Amplifica a dinâmica já estabelecida.', effect: '+15% de expansão por ciclo', cost: 2, requires: 'propagacao', minLevel: 2 },
  { id: 'sombras', title: 'Sombra estatística', description: 'Sinais mais difíceis de perceber no tabuleiro.', effect: '+30% no limiar de reação', cost: 2, requires: 'discricao', minLevel: 2 },
  { id: 'inercia', title: 'Inércia residual', description: 'Preserva parte do ritmo sob restrições.', effect: '+14% na expansão sob medidas', cost: 3, requires: 'resistencia', minLevel: 2 },
  { id: 'ruptura', title: 'Ruído sistêmico', description: 'Força uma dinâmica de maior pressão.', effect: '+16% de expansão', tradeoff: '+20% de resposta científica', cost: 3, requires: 'instabilidade', minLevel: 2 },
  { id: 'rede', title: 'Rede aberta', description: 'Prioriza novas conexões no mapa.', effect: '+65% na chance abstrata de conexão', tradeoff: '−12% da expansão local', cost: 3, requires: 'propagacao', minLevel: 2, excludes: 'nucleo' },
  { id: 'nucleo', title: 'Núcleo concentrado', description: 'Prioriza a continuidade em territórios ativos.', effect: '+24% de expansão local', tradeoff: '−55% na chance abstrata de conexão', cost: 3, requires: 'resistencia', minLevel: 2, excludes: 'rede' },
];
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u])) as Record<UpgradeId, UpgradeDefinition>;
export const upgradeOwned = (purchased: readonly UpgradeId[], id: UpgradeId) => purchased.includes(id);
export function isAttributes(value: unknown): value is Attributes {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  return Object.keys(a).length === ATTRIBUTE_IDS.length && ATTRIBUTE_IDS.every(id => Number.isInteger(a[id]) && (a[id] as number) >= 0 && (a[id] as number) <= ATTRIBUTE_MAX) &&
    ATTRIBUTE_IDS.reduce((sum, id) => sum + (a[id] as number), 0) <= ATTRIBUTE_BUDGET;
}
export const freeAttributePoints = (attributes: Attributes) => ATTRIBUTE_BUDGET - ATTRIBUTE_IDS.reduce((n,id) => n+attributes[id],0);
