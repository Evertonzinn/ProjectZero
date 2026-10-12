import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { WorldMap } from './components/WorldMap';
import { TrendChart } from './components/TrendChart';
import { Laboratory } from './components/Laboratory';
import { GovernmentDetail, WorldIntelligence } from './components/WorldIntelligence';
import { WorldEvents } from './components/WorldEvents';
import { GameOutcome } from './components/GameOutcome';
import { repeatSeed, summarizeRun } from './engine/outcome';
import type { RunSummary } from './engine/outcome';
import type { AttributeId, UpgradeId } from './engine/laboratory';
import { COUNTRIES, COUNTRY_BY_ID } from './data/countries';
import { adjustAttribute, advanceDay, buyUpgrade, changeOrigin, createGame, getWorldStats, restoreGame, setAgentName, startGame } from './engine/simulation';
import type { GameState, Policy } from './engine/simulation';

const SAVE_KEY='project-zero-save-v1';
const num=new Intl.NumberFormat('pt-BR');
const decimal=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
const percent=(v:number)=>`${decimal.format(v)}%`;
const policyLabel:Record<Policy,string>={normal:'Monitoramento',atencao:'Alerta preventivo',restricoes:'Restrições',emergencia:'Emergência'};
const categoryLabel={alerta:'ALERTA',pesquisa:'PESQUISA',governo:'GOVERNO',mundo:'GLOBAL',evento:'EVENTO'};
const nowSeed=()=>Math.floor(Date.now()%2_000_000_000);

function StatBar({value,color='green'}:{value:number;color?:'green'|'orange'|'blue'}) {
  return <div className="bar-track"><div className={`bar-fill bar-${color}`} style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div>;
}
function Icon({name}:{name:'globe'|'pause'|'play'|'step'|'save'|'reset'|'upload'}) {
  const common={width:17,height:17,fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  const paths:{[key:string]:ReactNode}={
    globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c6 5 6 13 0 18M12 3c-6 5-6 13 0 18"/></>,
    pause:<><path d="M8 5v14M16 5v14"/></>, play:<path d="m8 5 11 7-11 7z"/>,
    step:<><path d="m5 5 10 7-10 7zM19 5v14"/></>,
    save:<><path d="M5 3h12l4 4v14H3V3h2zM7 3v7h10V3M7 21v-8h10v8"/></>,
    reset:<><path d="M4 11a8 8 0 1 0 2-5M4 4v6h6"/></>,
    upload:<><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/></>,
  };
  return <svg viewBox="0 0 24 24" {...common} aria-hidden="true">{paths[name]}</svg>;
}

export default function App() {
  const [game,setGame]=useState<GameState>(()=>createGame('BRA',nowSeed()));
  const [selected,setSelected]=useState('BRA');
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState<1|5|20>(1);
  const [notice,setNotice]=useState('');
  const [labOpen,setLabOpen]=useState(false);
  const [outcomeOpen,setOutcomeOpen]=useState(false);
  const [previousRun,setPreviousRun]=useState<RunSummary|null>(null);
  const [newsTab,setNewsTab]=useState<'all'|'alerta'|'pesquisa'|'evento'>('all');
  const stats=useMemo(()=>getWorldStats(game),[game]);
  const country=COUNTRY_BY_ID[selected];
  const countryState=game.countries[selected];
  const countryPct=(countryState.affected/country.population)*100;
  const started=game.phase!=='setup';
  const ended=game.phase==='contained'||game.phase==='overwhelmed';

  useEffect(()=>{
    if(!playing||game.phase!=='running')return;
    const timer=window.setInterval(()=>setGame(g=>advanceDay(g)),speed===1?850:speed===5?170:50);
    return ()=>window.clearInterval(timer);
  },[playing,speed,game.phase]);
  useEffect(()=>{
    if(ended){setPlaying(false);setOutcomeOpen(true);}
  },[ended]);

  const selectCountry=(id:string)=>{
    if(game.phase==='setup')setGame(current=>changeOrigin(current,id));
    setSelected(id);
    setNotice('');
  };
  const openLab=()=>{setPlaying(false);setLabOpen(true);};
  const begin=()=>{
    setGame(current=>startGame(current));
    setPlaying(true);
    setNotice('Simulação iniciada.');
  };
  const reset=()=>{
    if(started && !window.confirm('Reiniciar a simulação? O progresso não salvo será perdido.'))return;
    setPlaying(false);
    setLabOpen(false);
    setOutcomeOpen(false);
    setPreviousRun(null);
    setGame(createGame(selected,nowSeed()));
    setNotice('Novo cenário pronto. Selecione a origem e inicie.');
  };
  const newAfterOutcome=()=>{
    setPlaying(false);setOutcomeOpen(false);setLabOpen(false);setPreviousRun(null);
    setGame(createGame(game.origin,nowSeed()));setSelected(game.origin);
    setNotice('Nova seed criada. Configure o laboratório e comece.');
  };
  const repeat=()=>{
    const summary=summarizeRun(game);
    if(!summary)return;
    setPlaying(false);setOutcomeOpen(false);setPreviousRun(summary);
    setGame(repeatSeed(game));setSelected(game.origin);setLabOpen(true);
    setNotice('Mesma seed e atributos iniciais. Reconfigure se desejar e inicie.');
  };
  const save=()=>{
    try { localStorage.setItem(SAVE_KEY,JSON.stringify(game));setNotice('Partida salva neste navegador.'); }
    catch {setNotice('Não foi possível salvar neste navegador.');}
  };
  const load=()=>{
    try {
      const content=localStorage.getItem(SAVE_KEY);
      if(!content){setNotice('Nenhuma partida salva encontrada.');return;}
      const parsed:unknown=JSON.parse(content);
      const restored=restoreGame(parsed);
      if(!restored){setNotice('Save incompatível ou inválido.');return;}
      setPlaying(false);setLabOpen(false);setOutcomeOpen(false);setPreviousRun(null);setGame(restored);setSelected(restored.origin);setNotice((parsed as {version?:number}).version===1?'Save antigo migrado.':'Partida restaurada.');
    }catch{setNotice('Não foi possível carregar o save.');}
  };
  const news=game.news.filter(item=>newsTab==='all'||item.category===newsTab).slice(0,6);

  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Icon name="globe"/></div><div className="brand-word"><strong>PROJECT<span> ZERO</span></strong><small>GLOBAL STRATEGY SIMULATOR</small></div></div>
      <div className="topcenter"><span className="top-label">OPERAÇÃO</span><b>OBSERVATÓRIO MUNDIAL</b><span className="header-separator"/><span className="build-label">ALPHA <span>0.5.0</span></span></div>
      <div className="topright"><span className="server-dot"/><span>SIMULAÇÃO LOCAL</span><span className="top-date">SEED #{game.seed}</span></div>
    </header>

    <div className="page-body">
      <div className="eyebrow-row"><span>PAINEL DE OPERAÇÕES <b>/</b> MAPA GLOBAL</span><span className="scenario-id">CENÁRIO <b>ZERO / 001</b></span></div>
      <section className="headline">
        <div><h1>O mundo é seu tabuleiro<span className="headline-dot">.</span></h1><p>Uma simulação fictícia. Dezoito nações, decisões imprevisíveis, consequências em cadeia.</p></div>
        <div className="day-highlight"><span>DIA DA SIMULAÇÃO</span><strong>{String(game.day).padStart(3,'0')}</strong><div className="status-meta"><span className={`status-led ${playing?'live':''}`}/>{ended?'ENCERRADO':playing?'EM EXECUÇÃO':started?'PAUSADO':'AGUARDANDO INÍCIO'}</div></div>
      </section>

      <section className="kpi-row" aria-label="Indicadores globais">
        <div className="kpi"><div className="kpi-heading"><span>POPULAÇÃO SIMULADA</span><span className="kpi-symbol">◈</span></div><strong>{decimal.format(stats.population/1_000_000_000)} <small>bi</small></strong><span className="kpi-foot">TOTAL NOS 18 PAÍSES</span></div>
        <div className="kpi"><div className="kpi-heading"><span>POPULAÇÃO IMPACTADA</span><span className="kpi-symbol orange">◉</span></div><strong>{num.format(stats.affected)}</strong><span className="kpi-foot"><span className="orange-text">{percent(stats.affectedPct)}</span> DA POPULAÇÃO</span></div>
        <div className="kpi"><div className="kpi-heading"><span>PAÍSES EM CRISE</span><span className="kpi-symbol blue">◎</span></div><strong>{String(stats.activeCountries).padStart(2,'0')} <small>/ 18</small></strong><span className="kpi-foot">REGIÕES MONITORADAS</span></div>
        <div className="kpi"><div className="kpi-heading"><span>RESPOSTA CIENTÍFICA</span><span className="kpi-symbol green">⬡</span></div><strong>{percent(stats.research)}</strong><StatBar value={stats.research}/></div>
      </section>

      <div className="workspace">
        <aside className="sidebar left-sidebar">
          <div className="panel-heading"><span className="heading-square"/> CONTROLE DE CENÁRIO <span className="panel-number">01</span></div>
          <div className="scenario-panel">
            <div className="small-label">PROTOCOLO ATUAL</div><div className="scenario-badge"><span className="tiny-glow"/> ZERO — SIMULAÇÃO</div>
            <p>Escolha onde o evento fictício começa e observe as reações globais ao longo dos dias.</p>
            <div className="fine-divider"/>
            <div className="small-label">PAÍS DE ORIGEM</div>
            <label className="field-wrap"><span className="flag">{COUNTRY_BY_ID[game.origin].flag}</span><select value={game.origin} disabled={started} onChange={e=>selectCountry(e.target.value)} aria-label="País de origem">
              {COUNTRIES.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}
            </select><span className="field-chevron">⌄</span></label>
            <div className="seed-row"><span>SEED DO CENÁRIO</span><span>#{game.seed}</span></div>
            <button className="lab-launch" onClick={openLab} type="button"><span className="lab-launch-icon">⬡</span><span><strong>LABORATÓRIO ZERO</strong><small>{game.agent.name||'PROTOCOLO SEM NOME'} · {game.agent.purchased.length} MELHORIAS</small></span><span className="lab-launch-arrow">↗</span></button>
            {game.agent.points>0&&<div className="lab-alert">◆ {ended?`${game.agent.points} pontos não utilizados · partida encerrada`:`${game.agent.points} pontos disponíveis para evolução`}</div>}
            {!started?<button className="primary-btn" onClick={begin} type="button"><Icon name="play"/> INICIAR SIMULAÇÃO <span>↗</span></button>:<button className="outline-btn full-width" onClick={reset} type="button"><Icon name="reset"/> NOVA PARTIDA</button>}
            {ended&&<div className="outcome-box"><strong>{game.phase==='contained'?'CONTENÇÃO CIENTÍFICA':'LIMITE CRÍTICO ATINGIDO'}</strong><span>Simulação encerrada no dia {game.day}.</span><button type="button" className="outline-btn" onClick={()=>setOutcomeOpen(true)}>VER RELATÓRIO FINAL ↗</button></div>}
          </div>
          <div className="panel-heading secondary"><span className="heading-square"/> CONTROLES RÁPIDOS <span className="panel-number">02</span></div>
          <div className="quick-panel"><button onClick={save} type="button"><Icon name="save"/> Salvar partida <span>⌘</span></button><button onClick={load} type="button"><Icon name="upload"/> Carregar partida <span>↗</span></button><button onClick={reset} type="button"><Icon name="reset"/> Reiniciar cenário <span>↺</span></button></div>
          <div className="sidebar-note"><span className="note-mark">!</span><p>Protótipo estratégico. Todas as estatísticas, decisões e conexões são abstrações de gameplay.</p></div>
        </aside>

        <main className="mainstage">
          <WorldMap game={game} selected={selected} onSelect={selectCountry}/>
          <div className="playback">
            <div className="playback-title"><span>CONTROLE TEMPORAL</span><strong>DIA {String(game.day).padStart(3,'0')}</strong></div>
            <div className="playback-buttons"><button type="button" className="lab-quick" onClick={openLab} title="Abrir laboratório">⬡ LABORATÓRIO {game.agent.points>0?`· ${game.agent.points} PT`:""}</button>
              <button className="round-play" type="button" disabled={!started||ended} aria-label={playing?'Pausar':'Continuar'} onClick={()=>setPlaying(p=>!p)}>{playing?<Icon name="pause"/>:<Icon name="play"/>}</button>
              <button className="step-btn" type="button" disabled={game.phase!=='running'} onClick={()=>{setPlaying(false);setGame(g=>advanceDay(g));}}><Icon name="step"/> PRÓXIMO DIA</button>
              <span className="playback-separator"/>
              <span className="speed-caption">VELOCIDADE</span>
              <div className="speed-group" role="group" aria-label="Velocidade da simulação">{([1,5,20] as const).map(n=><button key={n} className={speed===n?'active':''} onClick={()=>setSpeed(n)} type="button">{n}×</button>)}</div>
            </div>
            {notice&&<div className="notification" role="status">{notice}</div>}
          </div>
          <div className="bottom-panels">
            <TrendChart history={game.history}/>
            <div className="news-shell">
              <div className="news-header"><span>BOLETIM GLOBAL</span><span className="news-total">{game.news.length} EVENTOS</span></div>
              <div className="news-tabs" role="group" aria-label="Filtrar notícias"><button type="button" className={newsTab==='all'?'active':''} onClick={()=>setNewsTab('all')}>TODOS</button><button type="button" className={newsTab==='alerta'?'active':''} onClick={()=>setNewsTab('alerta')}>ALERTAS</button><button type="button" className={newsTab==='pesquisa'?'active':''} onClick={()=>setNewsTab('pesquisa')}>CIÊNCIA</button><button type="button" className={newsTab==='evento'?'active':''} onClick={()=>setNewsTab('evento')}>EVENTOS</button></div>
              <div className="news-list" aria-live="off">{news.length?news.map(n=><div className="news-item" key={n.id}><span className={`news-symbol news-${n.category}`}>●</span><div><span className="news-tag">{categoryLabel[n.category]} · DIA {n.day}</span><p>{n.text}</p></div></div>):<div className="empty-news">Nenhum evento registrado. Inicie a simulação para acompanhar os boletins.</div>}</div>
            </div>
          </div>
          <WorldIntelligence game={game} selected={selected} onSelect={selectCountry}/>
          <WorldEvents game={game} selected={selected} onSelect={selectCountry}/>
        </main>

        <aside className="sidebar right-sidebar">
          <div className="panel-heading"><span className="heading-square"/> INTELIGÊNCIA REGIONAL <span className="panel-number">03</span></div>
          <div className="country-panel">
            <div className="country-header"><div><span className="small-label">TERRITÓRIO SELECIONADO</span><h2><span className="big-flag">{country.flag}</span> {country.name}</h2><span className="country-iso">CÓDIGO {country.id} <b>·</b> PERFIL ESTRATÉGICO</span></div><span className="target-icon">⌖</span></div>
            <div className="regional-stat"><span>POPULAÇÃO SIMULADA</span><strong>{num.format(country.population)}</strong></div>
            <div className="regional-stat affected"><span>POPULAÇÃO IMPACTADA</span><strong>{num.format(countryState.affected)} <small>({percent(countryPct)})</small></strong></div>
            <div className="regional-stat"><span>NOVOS IMPACTOS / DIA</span><strong>{num.format(countryState.newlyAffected)}</strong></div>
            <div className="country-attrs">
              <div className="country-attr"><div><span>CONECTIVIDADE</span><b>{country.connectivity}/100</b></div><StatBar value={country.connectivity} color="blue"/></div>
              <div className="country-attr"><div><span>CIÊNCIA</span><b>{country.science}/100</b></div><StatBar value={country.science}/></div>
              <div className="country-attr"><div><span>ECONOMIA</span><b>{country.economy}/100</b></div><StatBar value={country.economy} color="orange"/></div>
            </div>
            <div className="country-policy"><span className="small-label">POSIÇÃO DO GOVERNO</span><div className={`policy-status policy-${countryState.policy}`}><span>◈</span>{policyLabel[countryState.policy]}</div></div>
            <div className="country-research"><div><span className="small-label">PESQUISA LOCAL</span><strong>{percent(countryState.research)}</strong></div><StatBar value={countryState.research}/></div>
            <GovernmentDetail game={game} id={selected}/>
            <div className="regional-footer"><span className="led-dot"/>{countryState.affected>0?'TERRITÓRIO EM OBSERVAÇÃO':'SEM SINAIS LOCAIS'}</div>
          </div>
          <div className="model-note"><div className="model-title">MODELO DE MUNDO</div><p>Os 18 territórios são conectados por uma malha abstrata. Clique no mapa para inspecionar cada país.</p><div className="model-stat">18 <span>NAÇÕES</span> <span className="slash">/</span> 01 <span>CENÁRIO</span></div></div>
        </aside>
      </div>
      <footer className="page-footer"><span>PROJECT ZERO <b>/</b> EXPERIMENTO DE ESTRATÉGIA</span><span>SIMULAÇÃO TOTALMENTE FICTÍCIA · NÃO REPRESENTA PREVISÕES REAIS</span><span>V0.5.0 — RESULTADOS E REPARTIDAS</span></footer>
    </div>
    {outcomeOpen&&ended&&<GameOutcome game={game} previous={previousRun} onClose={()=>setOutcomeOpen(false)} onRepeat={repeat} onNew={newAfterOutcome}/>}
    {labOpen&&<Laboratory game={game} onClose={()=>setLabOpen(false)} onName={name=>setGame(g=>setAgentName(g,name))} onAttribute={(id:AttributeId,delta:-1|1)=>setGame(g=>adjustAttribute(g,id,delta))} onPurchase={(id:UpgradeId)=>setGame(g=>buyUpgrade(g,id))}/>}
  </div>;
}
