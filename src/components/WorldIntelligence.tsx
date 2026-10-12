import { COUNTRIES, COUNTRY_BY_ID } from '../data/countries';
import { ACTIONS, COUNTRY_DOCTRINE, DOCTRINES } from '../engine/intelligence';
import type { GameState } from '../engine/simulation';

const p=(n:number)=>`${n.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;

export function WorldIntelligence({game,selected,onSelect}:{game:GameState;selected:string;onSelect:(id:string)=>void}) {
  const leaders=[...COUNTRIES].sort((a,b)=>game.countries[b.id].research-game.countries[a.id].research || b.science-a.science).slice(0,5);
  const agreements=COUNTRIES.filter(c=>game.countries[c.id].government.action==='cooperar').length;
  const mobilized=COUNTRIES.filter(c=>game.countries[c.id].government.action==='mobilizar').length;
  return <section className="intel-shell" aria-label="Inteligência mundial e corrida científica">
    <header className="intel-heading"><div><span className="intel-kicker">MÓDULO 03 / WORLD INTELLIGENCE</span><h2>Corrida científica <em>& diplomacia</em></h2><p>Dezoito governos autônomos. Estratégias, decisões e custos observáveis.</p></div><span className="intel-live"><i/> {game.phase==='setup'?'EM ESPERA':'ANÁLISE ATIVA'}</span></header>
    <div className="intel-summary"><div><small>LÍDER ATUAL</small><strong>{COUNTRY_BY_ID[leaders[0].id].flag} {leaders[0].name}</strong></div><div><small>CANAIS DE COOPERAÇÃO</small><strong>{String(agreements).padStart(2,'0')}</strong></div><div><small>GOVERNOS MOBILIZADOS</small><strong>{String(mobilized).padStart(2,'0')}</strong></div></div>
    <div className="intel-leader-header"><span>CLASSIFICAÇÃO DE PESQUISA</span><span>PROGRESSO / 100%</span></div>
    <div className="intel-ranking">{leaders.map((c,i)=><button className={'intel-rank'+(selected===c.id?' intel-current':'')} key={c.id} onClick={()=>onSelect(c.id)} type="button" aria-label={`Inspecionar ${c.name}, pesquisa ${p(game.countries[c.id].research)}`}>
      <span className="intel-position">{String(i+1).padStart(2,'0')}</span><span className="intel-rank-name">{c.flag} {c.name}<small>{DOCTRINES[COUNTRY_DOCTRINE[c.id]].label}</small></span><span className="intel-rank-bar"><i style={{width:`${game.countries[c.id].research}%`}}/></span><strong>{p(game.countries[c.id].research)}</strong>
    </button>)}</div>
    <div className="intel-legend">◈ Selecione um país na classificação para inspecionar suas decisões no painel regional.</div>
  </section>;
}

export function GovernmentDetail({game,id}:{game:GameState;id:string}) {
 const s=game.countries[id],gov=s.government,persona=DOCTRINES[COUNTRY_DOCTRINE[id]],action=ACTIONS[gov.action];
 return <section className="gov-detail" aria-label="Estratégia governamental">
   <div className="gov-caption">INTELIGÊNCIA DE GOVERNO <b>AI RULES / V0.4</b></div>
   <div className="gov-doctrine"><small>PERFIL DE GOVERNO</small><strong>{persona.label}</strong><span>{persona.description}</span></div>
   <div className="gov-current"><small>DECISÃO ATUAL · ATÉ O DIA {gov.until}</small><strong>{action.label}</strong><span>{action.description}</span></div>
   <div className="gov-reason"><span>POR QUE ESSA DECISÃO?</span><p>{gov.reason}</p></div>
   {gov.partner && <div className="gov-partner">↗ CANAL CIENTÍFICO: {COUNTRY_BY_ID[gov.partner].flag} {COUNTRY_BY_ID[gov.partner].name}</div>}
   {active.length>0&&<div className="gov-active-events"><strong>◈ EVENTOS COM EFEITOS ATIVOS</strong>{active.map(e=><span key={e.id}>{e.title} · até o dia {e.expiresDay}</span>)}</div>}
   <div className="gov-indicators">{([['PRESSÃO SOCIAL',gov.pressure],['ORÇAMENTO',gov.budget],['ESTABILIDADE',gov.stability]] as const).map(([label,n])=><div className="gov-metric" key={label}><div><span>{label}</span><b>{Math.round(n)}/100</b></div><div className="gov-meter"><i style={{width:`${n}%`}}/></div></div>)}</div>
   <span className="gov-disclaimer">Parâmetros e reações fictícios, exclusivos deste jogo.</span>
 </section>;
}
