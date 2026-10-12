/** Government personas and actions are entirely fictional game mechanics. */
export type Doctrine = 'cientifica' | 'cautelosa' | 'comercial' | 'colaborativa';
export type GovernmentAction = 'vigiar' | 'orientar' | 'restringir' | 'investir' | 'cooperar' | 'mobilizar';

export interface GovernmentState {
  action: GovernmentAction;
  since: number;
  until: number;
  budget: number;
  stability: number;
  pressure: number;
  partner: string | null;
  reason: string;
}

export const DOCTRINES: Record<Doctrine, {label:string; description:string; caution:number; science:number; sharing:number}> = {
  cientifica: {label:'Tecnocracia científica',description:'Prioriza investimento em pesquisas e aceleração tecnológica.',caution:.45,science:.94,sharing:.43},
  cautelosa: {label:'Estado preventivo',description:'Prioriza respostas antecipadas e estabilidade interna.',caution:.94,science:.46,sharing:.35},
  comercial: {label:'Abertura econômica',description:'Tende a preservar circulação e orçamento antes de restringir.',caution:.29,science:.56,sharing:.39},
  colaborativa: {label:'Diplomacia cooperativa',description:'Troca avanços científicos com outras nações.',caution:.53,science:.62,sharing:.94},
};

export const COUNTRY_DOCTRINE: Readonly<Record<string,Doctrine>> = {
  BRA:'colaborativa', USA:'cientifica', CAN:'colaborativa', MEX:'comercial', ARG:'comercial',
  GBR:'cientifica', FRA:'colaborativa', DEU:'cientifica', ESP:'cautelosa', RUS:'cautelosa',
  CHN:'cautelosa', IND:'comercial', JPN:'cientifica', AUS:'cautelosa', ZAF:'colaborativa',
  EGY:'cautelosa', NGA:'comercial', IDN:'comercial',
};

export const ACTIONS: Record<GovernmentAction, {label:string; description:string; cost:number; growth:number; links:number; science:number}> = {
  vigiar: {label:'Observação ativa',description:'Mantém o acompanhamento com custo mínimo.',cost:.16,growth:1,links:1,science:1},
  orientar: {label:'Comunicação pública',description:'Reduz a pressão interna sem restringir conexões.',cost:.54,growth:.97,links:1,science:1.03},
  restringir: {label:'Controles de circulação',description:'Diminui conexões e crescimento, com impacto no orçamento.',cost:1.27,growth:.76,links:.64,science:.94},
  investir: {label:'Investimento científico',description:'Acelera a pesquisa, consumindo recursos públicos.',cost:1.55,growth:1,links:1,science:1.78},
  cooperar: {label:'Cooperação internacional',description:'Compartilha descobertas com uma nação conectada.',cost:1.12,growth:1,links:1,science:1.27},
  mobilizar: {label:'Mobilização nacional',description:'Resposta de emergência para reduzir a expansão.',cost:1.86,growth:.56,links:.81,science:.85},
};

export function initialGovernmentState(): GovernmentState {
  return {action:'vigiar',since:0,until:0,budget:72,stability:85,pressure:0,partner:null,reason:'Aguardando evidências para definir uma resposta.'};
}

/** Policy selection is a game state machine, not a public-health recommendation. */
export function decideAction(input: {
  doctrine: Doctrine; pressure:number; budget:number; activeCountries:number;
  science:number; research:number; partner:string|null; roll:number;
}): {action:GovernmentAction;reason:string;partner:string|null} {
  const {doctrine,pressure,budget,activeCountries,science,research,partner,roll}=input;
  const persona=DOCTRINES[doctrine];
  if (pressure>=71 && budget>=13) return {action:'mobilizar',reason:'Pressão social crítica exige mobilização imediata.',partner:null};
  if (pressure>=19 && budget>=17 && roll<persona.caution*(pressure>=45?1.1:1))
    return {action:'restringir',reason:'Pressão crescente e perfil de precaução ativaram controles.',partner:null};
  if (activeCountries>=3 && partner && budget>=16 && roll<persona.sharing && research>=8)
    return {action:'cooperar',reason:'A presença de parceiros conectados favoreceu troca científica.',partner};
  if (activeCountries>=1 && budget>=20 && roll<persona.science && science>=55)
    return {action:'investir',reason:'Capacidade científica e orçamento permitem acelerar a pesquisa.',partner:null};
  if (pressure>=9 && budget>=6) return {action:'orientar',reason:'A pressão social motivou comunicação com a população.',partner:null};
  return {action:'vigiar',reason:budget<15?'Recursos limitados mantêm o acompanhamento básico.':'Indicadores moderados permitem observação contínua.',partner:null};
}
