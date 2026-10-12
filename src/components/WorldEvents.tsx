import { useState } from 'react';
import { COUNTRY_BY_ID } from '../data/countries';
import type { GameState } from '../engine/simulation';
import type { GlobalEventKind } from '../engine/events';

export const EVENT_LABELS: Record<GlobalEventKind,string> = {
  crise_economica:'ECONOMIA',instabilidade_politica:'POLÍTICA',
  descoberta_cientifica:'CIÊNCIA',ruptura_diplomatica:'DIPLOMACIA',
};

export function WorldEvents({game,selected,onSelect}:{game:GameState;selected:string;onSelect:(id:string)=>void}) {
  const [filter,setFilter]=useState<'all'|'active'|'country'>('all');
  const active=game.globalEvents.filter(event=>game.day<event.expiresDay);
  const visible=game.globalEvents.filter(event=>filter==='all'||
    (filter==='active'&&game.day<event.expiresDay)||(filter==='country'&&event.countryId===selected)).slice(0,9);
  return <section className="events-shell" aria-label="Crônicas globais e eventos causais">
    <header className="events-heading"><div><span className="intel-kicker">MÓDULO 04 / GLOBAL EVENTS</span><h2>Crônicas <em>do mundo</em></h2><p>Acontecimentos gerados pelos indicadores do jogo, com causas e consequências verificáveis.</p></div><div className="events-counter"><strong>{String(active.length).padStart(2,'0')}</strong><span>EM CURSO</span></div></header>
    <div className="events-controls"><span>{game.globalEvents.length} REGISTROS · {game.globalEvents.filter(e=>e.kind==='descoberta_cientifica').length} DESCOBERTAS</span><div role="group" aria-label="Filtro de eventos">
      <button type="button" className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>TODOS</button>
      <button type="button" className={filter==='active'?'active':''} onClick={()=>setFilter('active')}>ATIVOS</button>
      <button type="button" className={filter==='country'?'active':''} onClick={()=>setFilter('country')}>PAÍS ATUAL</button>
    </div></div>
    {visible.length?<div className="events-timeline">{visible.map(event=>{
      const ongoing=game.day<event.expiresDay;
      return <article className={`world-event event-${event.kind}`} key={event.id}>
        <div className="event-side"><span className="event-day">DIA {String(event.day).padStart(3,'0')}</span><span className={`event-type event-type-${event.kind}`}>{EVENT_LABELS[event.kind]}</span></div>
        <div className="event-detail"><div className="event-title-row"><h3>{event.title}</h3><span className={ongoing?'event-active':'event-resolved'}>{ongoing?`ATIVO · ${event.expiresDay-game.day}D`:'ENCERRADO'}</span></div>
          <button className="event-country" type="button" onClick={()=>onSelect(event.countryId)} aria-label={`Inspecionar ${COUNTRY_BY_ID[event.countryId].name}`}>{COUNTRY_BY_ID[event.countryId].flag} {COUNTRY_BY_ID[event.countryId].name} ↗</button>
          <p className="event-cause"><b>GATILHO</b> {event.cause}</p><p className="event-consequence"><b>EFEITO</b> {event.consequence}</p>
        </div>
      </article>;
    })}</div>:<div className="events-empty">{filter==='country'?'Sem eventos para o país selecionado.':filter==='active'?'Nenhum evento com efeitos temporários ativos.':'Nenhum evento ainda. Avance os dias para que decisões e indicadores produzam acontecimentos.'}</div>}
    <footer className="events-footer">Os impactos permanentes permanecem no estado do país. Modificadores temporários expiram automaticamente no dia indicado.</footer>
  </section>;
}
