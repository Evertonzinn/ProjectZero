/** Coeficientes de GAMEPLAY inventados. Não representam dados, cenários ou modelos reais. */
export const MODES = {
  classico: { title:'Clássico v0.6', description:'Regras anteriores, mantidas para saves antigos.', growth:1, network:1, science:1, researchGoal:100 },
  exploracao: { title:'Exploração', description:'Maior margem para expandir e experimentar escolhas.', growth:1.08, network:1.04, science:1.00, researchGoal:100 },
  equilibrado: { title:'Equilibrado', description:'Disputa mais próxima entre expansão e resposta científica.', growth:1, network:1, science:1.07, researchGoal:98.5 },
  desafio: { title:'Desafio', description:'Pesquisa mais ágil e crescimento menos favorável.', growth:.94, network:.96, science:1.14, researchGoal:98.5 },
} as const;
export type GameMode = keyof typeof MODES;
export const DEFAULT_MODE: GameMode = 'equilibrado';
export function isGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && Object.hasOwn(MODES,value);
}
