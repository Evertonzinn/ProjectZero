import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import WorldMap from './components/WorldMap';
import { COUNTRIES, COUNTRY_BY_ID, type CountryId } from './data/countries';
import { createGame, getGlobalStats, simulateDay, startGame, type GameState, type Traits } from './simulation/engine';

function Icon({ name, size = 18 }: { name: 'globe' | 'activity' | 'shield' | 'flask' | 'terminal' | 'chevron' | 'pause' | 'play' | 'refresh' | 'radar' | 'settings' | 'arrow'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  const paths = {
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    activity: <><path d="M3 12h4l3-7 4 14 3-7h4" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    flask: <><path d="M9 3h6M10 3v6l-6 9a2 2 0 0 0 1.8 3h12.4A2 2 0 0 0 20 18l-6-9V3M7.4 15h9.2" /></>,
    terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M12 16h5" /></>,
    chevron: <><path d="m9 18 6-6-6-6" /></>,
    pause: <><path d="M9 5v14M15 5v14" strokeWidth="3" /></>,
    play: <><path d="m8 5 12 7-12 7V5Z" fill="currentColor" stroke="none" /></>,
    refresh: <><path d="M3 12a9 9 0 0 1 15.5-6.1L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.1L3 16M3 21v-5h5" /></>,
    radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="m12 12 6-6" /></>,
    settings: <><path d="M4 8h16M4 16h16" /><circle cx="9" cy="8" r="2" fill="currentColor" /><circle cx="16" cy="16" r="2" fill="currentColor" /></>,
    arrow: <><path d="M4 12h16m-7-7 7 7-7 7" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function StatCard({ label, value, suffix, icon, foot, tone = 'teal' }: { label: string; value: string; suffix?: string; icon: 'globe' | 'activity' | 'shield' | 'flask'; foot: string; tone?: 'teal' | 'orange' | 'blue' }) {
  return <div className={`stat-card stat-${tone}`}>
    <div className="stat-heading"><span>{label}</span><span className="stat-icon"><Icon name={icon} size={19} /></span></div>
    <div className="stat-value">{value}<small>{suffix}</small></div>
    <div className="stat-foot"><span className="foot-pip" />{foot}</div>
  </div>;
}

function TraitControl({ name, value, onChange, label, description }: { name: keyof Traits; value: number; onChange: (key: keyof Traits, value: number) => void; label: string; description: string }) {
  return <div className="trait-field">
    <div className="trait-label"><label htmlFor={`trait-${name}`}>{label}</label><strong>{String(value).padStart(2, '0')} <span>/10</span></strong></div>
    <input id={`trait-${name}`} type="range" min={1} max={10} step={1} value={value} onChange={(e) => onChange(name, Number(e.currentTarget.value))} style={{ '--range-progress': `${((value - 1) / 9) * 100}%` } as CSSProperties} />
    <small>{description}</small>
  </div>;
}

const RATE_OPTIONS = [1, 2, 4] as const;
const RATE_INTERVAL: Record<number, number> = { 1: 920, 2: 460, 4: 230 };

function GameSidebar({ game, selected, speed, onStart, onToggle, onReset, onSpeed, onName, onTrait, onSelectCountry }: {
  game: GameState; selected: CountryId; speed: number; onStart: () => void; onToggle: () => void; onReset: () => void;
  onSpeed: (value: number) => void; onName: (value: string) => void; onTrait: (key: keyof Traits, value: number) => void; onSelectCountry: (id: CountryId) => void;
}) {
  const country = COUNTRY_BY_ID[selected];
  const stats = game.countries[selected];
  const setup = game.status === 'setup';
  const playing = game.status === 'running';
  const finished = game.status === 'victory' || game.status === 'defeat';
  const activity = stats.exposure === 0 ? 'SEM ATIVIDADE' : stats.exposure > 65 ? 'NÍVEL CRÍTICO' : stats.exposure > 30 ? 'EM EXPANSÃO' : 'MONITORADO';

  return <aside className="sidebar">
    <div className="side-card control-card">
      <div className="card-eyebrow"><Icon name="terminal" size={15} /> CONTROLE DE SIMULAÇÃO <span className="mini-index">01</span></div>
      <div className="control-head">
        <div><div className="eyebrow-muted">{setup ? 'CONFIGURAÇÃO DA PARTIDA' : 'AGENTE EM SIMULAÇÃO'}</div><h2>{setup ? 'Configurar agente' : game.agentName}</h2></div>
        <span className={`control-status ${playing ? 'status-running' : ''}`}>{setup ? 'AGUARDANDO' : playing ? 'ATIVO' : finished ? 'ENCERRADO' : 'PAUSADO'}</span>
      </div>
      {setup ? <>
        <div className="form-field"><label htmlFor="agent-name">IDENTIFICAÇÃO DO AGENTE</label><input id="agent-name" type="text" value={game.agentName} maxLength={24} spellCheck={false} onChange={(event) => onName(event.currentTarget.value)} placeholder="Ex.: ZERO-01" /></div>
        <div className="agent-traits">
          <TraitControl name="spread" value={game.traits.spread} onChange={onTrait} label="Propagação" description="Altera o ritmo de expansão no jogo" />
          <TraitControl name="stealth" value={game.traits.stealth} onChange={onTrait} label="Discrição" description="Retarda a resposta global fictícia" />
          <TraitControl name="endurance" value={game.traits.endurance} onChange={onTrait} label="Resiliência" description="Influencia o crescimento do agente" />
        </div>
        <div className="selected-origin"><span>PAÍS DE ORIGEM</span><strong>{COUNTRY_BY_ID[game.source].flag} {COUNTRY_BY_ID[game.source].name}</strong><small>Altere clicando no mapa.</small></div>
        <button className="primary-button" onClick={onStart} disabled={!game.agentName.trim()}><Icon name="play" size={16} /> INICIAR SIMULAÇÃO <Icon name="arrow" size={17} /></button>
      </> : <>
        <div className="run-mini-stats"><div><span>PARTIDA</span><strong>{String(game.day).padStart(3, '0')} <small>DIAS</small></strong></div><div><span>CARACTERÍSTICAS</span><strong>{game.traits.spread} / {game.traits.stealth} / {game.traits.endurance}</strong></div></div>
        {finished && <div className={`game-result ${game.status === 'victory' ? 'result-win' : ''}`}><strong>{game.status === 'victory' ? 'OBJETIVO ATINGIDO' : 'CONTRAMEDIDA CONCLUÍDA'}</strong><span>{game.status === 'victory' ? 'A expansão atingiu 16 países com atividade elevada.' : 'A pesquisa global chegou a 100%.'}</span></div>}
        <div className="simulation-actions"><button className="primary-button" onClick={onToggle} disabled={finished}><Icon name={playing ? 'pause' : 'play'} size={16} /> {playing ? 'PAUSAR SIMULAÇÃO' : 'CONTINUAR SIMULAÇÃO'}</button><button className="reset-button" onClick={onReset} title="Reiniciar partida" aria-label="Reiniciar partida"><Icon name="refresh" size={17} /></button></div>
        <div className="speed-row"><span>VELOCIDADE DA PARTIDA</span><div className="speed-options">{RATE_OPTIONS.map((n) => <button key={n} className={speed === n ? 'speed-active' : ''} onClick={() => onSpeed(n)} aria-pressed={speed === n}>{n}×</button>)}</div></div>
      </>}
    </div>
    <div className="side-card country-card">
      <div className="card-eyebrow"><Icon name="radar" size={15} /> DADOS DO TERRITÓRIO <span className="mini-index">02</span></div>
      <div className="country-switcher"><label htmlFor="country-picker">SELECIONAR TERRITÓRIO</label><select id="country-picker" value={selected} onChange={(event) => onSelectCountry(event.currentTarget.value as CountryId)}>{COUNTRIES.map(({ id, name, flag }) => <option key={id} value={id}>{flag} {name}</option>)}</select></div>
      <div className="selected-country-name"><span className="country-flag" aria-hidden="true">{country.flag}</span><div><h2>{country.name}</h2><span>{country.region} <span className="dot-spacer">•</span> {country.id}</span></div></div>
      <div className="country-state"><span className={`small-led ${stats.exposure > 0 ? 'led-warm' : ''}`} /> {activity}</div>
      <div className="progress-head"><span>ÍNDICE DE ATIVIDADE</span><strong>{stats.exposure.toFixed(1)}%</strong></div>
      <div className="progress-track"><div className="progress-fill exposure-fill" style={{ width: `${stats.exposure}%` }} /></div>
      <div className="country-data-grid"><div><span>DEFESA*</span><strong>{country.defense}<small>/100</small></strong></div><div><span>CONEXÕES*</span><strong>{country.connectivity}<small>/100</small></strong></div><div><span>RESPOSTA</span><strong>{stats.alert.toFixed(0)}<small>/100</small></strong></div></div>
      {setup && <p className="country-tip"><span>↗</span> Clique em qualquer um dos 20 países destacados para definir o ponto de partida.</p>}
    </div>
    <div className="side-card cure-card">
      <div className="card-eyebrow"><Icon name="flask" size={15} /> RESPOSTA GLOBAL <span className="mini-index">03</span></div>
      <div className="cure-head"><div><span>PROGRESSO DA PESQUISA</span><strong>{game.research.toFixed(1)}%</strong></div><div className="research-icon"><Icon name="flask" size={25} /></div></div>
      <div className="progress-track research-track"><div className="progress-fill research-fill" style={{ width: `${game.research}%` }} /></div>
      <div className="cure-leader"><span>CENTRO DE PESQUISA LÍDER</span><strong>{game.research >= 50 ? `${COUNTRY_BY_ID[game.cureLeader].flag} ${COUNTRY_BY_ID[game.cureLeader].name}` : 'DESCONHECIDO'} <span>{game.research >= 50 ? 'IDENTIFICADO' : 'AGUARDANDO SINAL'}</span></strong></div>
    </div>
  </aside>;
}

function EventsLog({ game }: { game: GameState }) {
  const events = game.events.slice(0, 5);
  return <section className="event-panel"><div className="events-head"><div><Icon name="activity" size={17} /><h2>Feed de inteligência</h2><span>EVENTOS EM TEMPO REAL</span></div><span className="events-count">{String(game.events.length).padStart(2, '0')} REGISTROS</span></div>
    <div className="event-list">{events.length === 0 ? <div className="no-events"><Icon name="radar" size={23} /><div><strong>Sistema aguardando ativação</strong><span>Os acontecimentos da simulação aparecerão neste painel.</span></div></div> : events.map((event) => <div key={event.id} className="event-row"><span className={`event-mark mark-${event.kind}`} /><span className="event-day">DIA {String(event.day).padStart(3, '0')}</span><div><strong>{event.title}</strong><span>{event.detail}</span></div><Icon name="chevron" size={15} /></div>)}</div>
  </section>;
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [selected, setSelected] = useState<CountryId>('BRA');
  const [speed, setSpeed] = useState<number>(1);
  const global = useMemo(() => getGlobalStats(game), [game]);

  useEffect(() => {
    if (game.status !== 'running') return;
    const timer = window.setInterval(() => setGame((previous) => simulateDay(previous)), RATE_INTERVAL[speed]);
    return () => window.clearInterval(timer);
  }, [game.status, speed]);

  function selectCountry(id: CountryId) {
    setSelected(id);
    setGame((previous) => previous.status === 'setup' ? { ...previous, source: id } : previous);
  }

  function updateTrait(key: keyof Traits, value: number) {
    setGame((previous) => previous.status === 'setup' ? { ...previous, traits: { ...previous.traits, [key]: value } } : previous);
  }

  function toggleGame() {
    setGame((previous) => ({ ...previous, status: previous.status === 'running' ? 'paused' : previous.status === 'paused' ? 'running' : previous.status }));
  }

  function resetGame() {
    setGame(createGame());
    setSelected('BRA');
    setSpeed(1);
  }

  return <div className="app-shell">
    <header className="topbar"><div className="topbar-inner">
      <div className="brand"><div className="brand-mark"><span>0</span><i /></div><div className="brand-text"><strong>PROJECT<span>ZERO</span></strong><small>GLOBAL STRATEGY SIMULATOR</small></div></div>
      <div className="topbar-section"><span className="nav-active"><Icon name="globe" size={16} /> MAPA GLOBAL</span><span className="topbar-divider" /><span className="nav-disabled"><Icon name="settings" size={16} /> MOTOR V0.1</span></div>
      <div className="topbar-right"><span className="build-badge"><span className="signal-dot" /> SYSTEM ONLINE</span><span className="topbar-version">BUILD 0.1.0 / ALPHA</span></div>
    </div></header>
    <main className="main-content">
      <div className="page-header"><div className="page-title"><div className="page-eyebrow"><span className="line-dash" /> OPERATION CENTER / <span>PROJECT ZERO</span></div><h1>Visão global <span className="header-star">✳</span></h1><p>Monitore o mundo. Escolha sua origem. Cada decisão altera a simulação.</p></div><div className="page-id"><span>WORLD INTERFACE</span><strong>01 <span>/</span> 04</strong></div></div>
      <div className="stats-grid">
        <StatCard label="TERRITÓRIOS ALCANÇADOS" value={String(global.reached).padStart(2, '0')} suffix={`/ ${COUNTRIES.length}`} icon="globe" foot="Países no cenário atual" />
        <StatCard label="ATIVIDADE GLOBAL" value={global.exposure.toFixed(1)} suffix="%" icon="activity" foot="Índice abstrato de expansão" tone="orange" />
        <StatCard label="MEDIDAS DE CONTENÇÃO" value={String(global.alerts).padStart(2, '0')} suffix="países" icon="shield" foot="Territórios em alerta elevado" tone="blue" />
        <StatCard label="PESQUISA GLOBAL" value={game.research.toFixed(1)} suffix="%" icon="flask" foot="Corrida pela contramedida" tone="teal" />
      </div>
      <div className="content-grid"><div className="primary-column"><WorldMap state={game} selected={selected} onSelect={selectCountry} /><EventsLog game={game} /></div><GameSidebar game={game} selected={selected} speed={speed} onStart={() => setGame((previous) => startGame(previous))} onToggle={toggleGame} onReset={resetGame} onSpeed={setSpeed} onName={(name) => setGame((previous) => previous.status === 'setup' ? { ...previous, agentName: name } : previous)} onTrait={updateTrait} onSelectCountry={selectCountry} /></div>
      <footer className="site-footer"><div><span className="footer-hex">⬡</span> PROJECT ZERO <span>—</span> PROTÓTIPO DE JOGO FICCIONAL</div><p>* Indicadores e mecânicas de países são parâmetros inventados para gameplay, não dados ou previsões do mundo real.</p><span>© 2026 · ALPHA BUILD</span></footer>
    </main>
  </div>;
}
