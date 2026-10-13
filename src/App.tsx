import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readSave, writeSave, parseGameJson, MAX_IMPORT_BYTES } from './engine/persistence';
import { AUTOSAVE_OWNER_KEY, coordinatedAutosave, newAutosaveSessionId, parseAutosaveOwner } from './engine/autosaveCoordinator';
import type { SaveSlot, StoragePort } from './engine/persistence';
import type { ReactNode } from 'react';
import { WorldMap } from './components/WorldMap';
import { useImmersion } from './components/useImmersion';
import { deriveMoment } from './engine/immersion';
import type { Moment } from './engine/immersion';
import { TrendChart } from './components/TrendChart';
import { Laboratory } from './components/Laboratory';
import { GovernmentDetail, WorldIntelligence } from './components/WorldIntelligence';
import { WorldEvents } from './components/WorldEvents';
import { GameOutcome } from './components/GameOutcome';
import { Onboarding } from './components/Onboarding';
import { getGuidance, tacticFeedback, upgradeFeedback } from './engine/guide';
import { repeatSeed, summarizeRun } from './engine/outcome';
import type { RunSummary } from './engine/outcome';
import type { AttributeId, UpgradeId } from './engine/laboratory';
import type { TacticId } from './engine/tactics';
import { COUNTRIES, COUNTRY_BY_ID } from './data/countries';
import { adjustAttribute, advanceDay, applyTactic, buyUpgrade, changeMode, changeOrigin, createGame, getWorldStats, setAgentName, startGame } from './engine/simulation';
import type { GameState, Policy } from './engine/simulation';
import { DEFAULT_MODE, MODES } from './engine/balance';
import type { GameMode } from './engine/balance';

const GUIDE_KEY='project-zero-guide-v08';
function gameStorage(): StoragePort {
  try {return window.localStorage;}
  catch {return {getItem(){throw new Error('Storage indisponível')},setItem(){throw new Error('Storage indisponível')}};}
}
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
  const [game,setGame]=useState<GameState>(()=>createGame('BRA',nowSeed(),DEFAULT_MODE));
  const gameRef=useRef(game); gameRef.current=game;
  const autosaveSession=useRef(newAutosaveSessionId());
  const autosaveInFlight=useRef(false);
  const importRef=useRef<HTMLInputElement>(null);
  const [selected,setSelected]=useState('BRA');
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState<1|5|20>(1);
  const [notice,setNotice]=useState('');
  const [autosaveFailure,setAutosaveFailure]=useState<string|null>(null);
  const [lastAutosave,setLastAutosave]=useState<{seed:number;day:number}|null>(null);
  // Erros de autosave não podem ser escondidos por notificações transitórias.
  const [autosaveConflict,setAutosaveConflict]=useState(false);
  const attemptAutosave=useCallback(async(snapshot:GameState,takeover=false)=>{
    if(snapshot.phase==='setup'||snapshot.day===0||autosaveInFlight.current)return;
    autosaveInFlight.current=true;
    try {
      const result=await coordinatedAutosave(gameStorage(),snapshot,autosaveSession.current,takeover);
      if(result.status==='ok'){
        setLastAutosave({seed:snapshot.seed,day:snapshot.day});
        setAutosaveFailure(null);
        setAutosaveConflict(false);
      }else{
        const conflict=result.status==='conflict';
        setAutosaveConflict(conflict);
        if(conflict)setPlaying(false);
        setAutosaveFailure(conflict
          ? 'Outra aba controla o autosave. Esta aba foi pausada para proteger o checkpoint existente.'
          : result.status==='invalid'
            ? 'O estado desta partida não pôde ser validado para o autosave.'
            : 'O navegador não conseguiu gravar o autosave (armazenamento bloqueado ou cheio).');
      }
      return result;
    }finally{autosaveInFlight.current=false;}
  },[]);
  const {sound,soundStatus,testSound,motion,systemReduced,toggleSound,toggleMotion,cue}=useImmersion();
  const previousGame=useRef<GameState|null>(null);
  const [moment,setMoment]=useState<Moment|null>(null);
  const [labOpen,setLabOpen]=useState(false);
  const [tourOpen,setTourOpen]=useState(()=>{try{return localStorage.getItem(GUIDE_KEY)!=='complete';}catch{return true;}});
  const [decisionFeedback,setDecisionFeedback]=useState('');
  const lastLabPrompt=useRef<string|null>(null);
  const [outcomeOpen,setOutcomeOpen]=useState(false);
  const [previousRun,setPreviousRun]=useState<RunSummary|null>(null);
  const [newsTab,setNewsTab]=useState<'all'|'alerta'|'pesquisa'|'evento'>('all');
  const stats=useMemo(()=>getWorldStats(game),[game]);
  const country=COUNTRY_BY_ID[selected];
  const countryState=game.countries[selected];
  const countryPct=(countryState.affected/country.population)*100;
  const started=game.phase!=='setup';
  const ended=game.phase==='contained'||game.phase==='overwhelmed';
  const guidance=getGuidance(game,selected);
  const closeTour=()=>{setTourOpen(false);try{localStorage.setItem(GUIDE_KEY,'complete');}catch{/* O tutorial funciona sem armazenamento */}};
  const guidedAction=()=>{if(guidance.action==='lab')openLab();else if(guidance.action==='start')begin();else if(guidance.action==='outcome')setOutcomeOpen(true);};
  const purchase=(id:UpgradeId)=>{const feedback=upgradeFeedback(game,id);if(!feedback)return;setGame(buyUpgrade(game,id));setDecisionFeedback(feedback);setNotice(feedback);cue('upgrade',true);};
  const useTactic=(id:TacticId,countryId:string)=>{const next=applyTactic(game,id,countryId);const feedback=tacticFeedback(game,next,id,countryId);if(!feedback)return;setGame(next);setDecisionFeedback(feedback);setNotice(feedback);cue('tactic',true);};

  useEffect(()=>{
    if(!playing||game.phase!=='running')return;
    const timer=window.setInterval(()=>setGame(g=>advanceDay(g)),speed===1?850:speed===5?170:50);
    return ()=>window.clearInterval(timer);
  },[playing,speed,game.phase]);
  useEffect(()=>{
    const before=previousGame.current;
    previousGame.current=game;
    if(!before)return;
    const newMoment=deriveMoment(before,game);
    if(newMoment){setMoment(newMoment);cue(newMoment.cue);}
    else if(before.seed!==game.seed || game.day<before.day){setMoment(null);}
  },[game,cue]);
  useEffect(()=>{
    if(!moment)return;
    const timeout=window.setTimeout(()=>setMoment(null),6000);
    return ()=>window.clearTimeout(timeout);
  },[moment]);
  useEffect(()=>{
    if(ended){setPlaying(false);setOutcomeOpen(true);}
  },[ended]);
  // Pausa antes que a simulação avance sem permitir decisões: a cada 10 dias.
  useEffect(()=>{
    if(game.phase!=='running'||game.day===0||game.day%10!==0||game.agent.points<2)return;
    const marker=`${game.seed}:${game.origin}:${game.day}`;
    if(lastLabPrompt.current===marker)return;
    lastLabPrompt.current=marker;
    setPlaying(false);
    setLabOpen(true);
    setNotice(`Dia ${game.day}: pontos de evolução recebidos. Escolha uma melhoria ou ação tática.`);
  },[game.phase,game.day,game.seed,game.origin,game.agent.points]);

  const selectCountry=(id:string)=>{
    if(game.phase==='setup')setGame(current=>changeOrigin(current,id));
    setSelected(id);
    setNotice('');
  };
  const openLab=()=>{setPlaying(false);setDecisionFeedback('');setLabOpen(true);};
  const begin=()=>{
    setGame(current=>startGame(current));
    setPlaying(true);
    setNotice('Simulação iniciada.');
    cue('start',true);
  };
  const reset=()=>{
    if(started && !window.confirm('Reiniciar a simulação? O progresso não salvo será perdido.'))return;
    setPlaying(false);
    lastLabPrompt.current=null;
    setLabOpen(false);
    setOutcomeOpen(false);
    setPreviousRun(null);
    setGame(createGame(selected,nowSeed(),game.mode));
    setNotice('Novo cenário pronto. Selecione a origem e inicie.');
  };
  const newAfterOutcome=()=>{
    setPlaying(false);lastLabPrompt.current=null;setOutcomeOpen(false);setLabOpen(false);setPreviousRun(null);
    setGame(createGame(game.origin,nowSeed(),game.mode));setSelected(game.origin);
    setNotice('Nova seed criada. Configure o laboratório e comece.');
  };
  const repeat=()=>{
    const summary=summarizeRun(game);
    if(!summary)return;
    setPlaying(false);lastLabPrompt.current=null;setOutcomeOpen(false);setPreviousRun(summary);
    setGame(repeatSeed(game));setSelected(game.origin);setLabOpen(true);
    setNotice('Mesma seed e atributos iniciais. Reconfigure se desejar e inicie.');
  };
  // Autosave é independente do save manual; nunca destrói o histórico anterior.
  useEffect(()=>{
    if(game.phase==='setup' || game.day===0)return;
    // Captura ciclos de decisão inclusive quando a simulação está acelerada.
    if(game.day!==1 && game.day%10!==0 && game.phase==='running')return;
    const task=window.setTimeout(()=>{void attemptAutosave(game);},120);
    return ()=>window.clearTimeout(task);
  },[game,attemptAutosave]);
  useEffect(()=>{
    const persist=()=>{const current=gameRef.current;if(current.phase!=='setup' && current.day>0)attemptAutosave(current);};
    window.addEventListener('pagehide',persist);
    const visibility=()=>{if(document.visibilityState==='hidden')persist();};
    document.addEventListener('visibilitychange',visibility);
    return ()=>{window.removeEventListener('pagehide',persist);document.removeEventListener('visibilitychange',visibility);};
  },[attemptAutosave]);
  // Heartbeat periódico: a aba ativa conserva a concessão enquanto está aberta.
  useEffect(()=>{
    const timer=window.setInterval(()=>{
      const current=gameRef.current;
      if(current.day>0 && current.phase!=='setup')void attemptAutosave(current);
    },15000);
    return ()=>window.clearInterval(timer);
  },[attemptAutosave]);
  // Um takeover em outra aba pausa esta sessão sem alterar os saves.
  useEffect(()=>{
    const handleStorage=(event:StorageEvent)=>{
      if(event.key!==AUTOSAVE_OWNER_KEY)return;
      const owner=parseAutosaveOwner(event.newValue);
      if(owner && owner.owner!==autosaveSession.current && owner.expiresAt>Date.now()){
        setPlaying(false);
        setAutosaveConflict(true);
        setAutosaveFailure('Outra aba assumiu o autosave. Esta sessão foi pausada para proteger o progresso.');
      }
    };
    window.addEventListener('storage',handleStorage);
    return ()=>window.removeEventListener('storage',handleStorage);
  },[]);
  const save=()=>{
    const result=writeSave(gameStorage(),'manual',game);
    setNotice(result.status==='ok'?'Save manual gravado. Cópia anterior preservada quando existente.':
      result.status==='backup-failed'?'Não foi possível proteger o save anterior. Nenhum save foi sobrescrito.':
      'Falha ao salvar. Verifique o espaço e as permissões do navegador.');
  };
  const applyLoaded=(restored:GameState,source:string)=>{
    if(game.phase!=='setup' && game.day>0 && !window.confirm(`Substituir a partida atual pelo ${source}? Exporte-a antes, se desejar preservar.`))return;
    setPlaying(false);lastLabPrompt.current=null;setLabOpen(false);setOutcomeOpen(false);
    setPreviousRun(null);setDecisionFeedback('');setGame(restored);setSelected(restored.origin);
    setNotice(`${source} restaurado. Simulação pausada no dia ${restored.day}.`);
  };
  const load=(slot:SaveSlot)=>{
    const result=readSave(gameStorage(),slot);
    if(result.status==='ok')applyLoaded(result.game,slot==='manual'?'save manual':slot==='automatico'?'autosave':'backup manual');
    else setNotice(result.status==='missing'?'Nenhuma partida encontrada neste slot.':
      result.status==='invalid'?'Save inválido ou corrompido. Tente o backup ou o autosave.':'Armazenamento indisponível neste navegador.');
  };
  const exportSave=()=>{
    const blob=new Blob([JSON.stringify(game,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`project-zero-seed-${game.seed}-dia-${game.day}.json`;
    document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    setNotice('Arquivo JSON exportado. Guarde-o para recuperar em outro navegador.');
  };
  const importSave=async(file:File|undefined)=>{
    if(!file)return;
    if(file.size>MAX_IMPORT_BYTES){setNotice('Arquivo grande demais para ser um save válido (máximo 2,5 MB).');return;}
    try {
      const restored=parseGameJson(await file.text());
      if(restored.status!=='ok'){setNotice('Arquivo inválido. Nenhuma partida foi substituída.');return;}
      applyLoaded(restored.game,'arquivo JSON');
    }catch {setNotice('Não foi possível ler o arquivo. Nenhuma partida foi alterada.');}
  };
  const news=game.news.filter(item=>newsTab==='all'||item.category===newsTab).slice(0,6);

  return <div className={`app immersion-root ${motion?'effects-on':'effects-off'}`}>
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Icon name="globe"/></div><div className="brand-word"><strong>PROJECT<span> ZERO</span></strong><small>GLOBAL STRATEGY SIMULATOR</small></div></div>
      <div className="topcenter"><span className="top-label">OPERAÇÃO</span><b>OBSERVATÓRIO MUNDIAL</b><span className="header-separator"/><span className="build-label">ALPHA <span>0.11.0</span></span></div>
      <div className="topright"><div className="immersion-settings" role="group" aria-label="Preferências de imersão"><button type="button" className="immersion-toggle" aria-pressed={sound} onClick={toggleSound} title={sound?'Desligar efeitos sonoros':'Ativar efeitos sonoros (requer clique)'}>{sound?'♪ SOM ON':'♪ SOM OFF'}</button>{sound&&<button type="button" className="immersion-toggle audio-test" onClick={testSound} title="Reativar áudio e reproduzir teste de som">♪ TESTAR SOM</button>}<button type="button" className="immersion-toggle" aria-pressed={motion} onClick={toggleMotion} title={systemReduced?'Movimento reduzido pelo sistema':'Alternar animações'}>{motion?'✦ EFEITOS ON':'✦ EFEITOS OFF'}</button>{sound&&<span className="audio-status" role="status" aria-live="polite">{soundStatus==='ready'?'SINAL ENVIADO':soundStatus==='needs-click'?'TESTE O ÁUDIO':soundStatus==='blocked'?'ÁUDIO BLOQUEADO':soundStatus==='unavailable'?'ÁUDIO INDISPONÍVEL':''}</span>}</div><button type="button" className="help-button" onClick={()=>{setPlaying(false);setTourOpen(true);}} aria-label="Abrir tutorial de como jogar">? COMO JOGAR</button><span className="server-dot"/><span>SIMULAÇÃO LOCAL</span><span className="top-date">SEED #{game.seed}</span></div>
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
            <div className="small-label">MODO DE JOGO</div>
            <label className="field-wrap mode-field"><select value={game.mode} disabled={started} aria-label="Dificuldade do cenário" onChange={event=>setGame(g=>changeMode(g,event.target.value as GameMode))}>
              {(['exploracao','equilibrado','desafio','classico'] as GameMode[]).map(mode=><option key={mode} value={mode}>{MODES[mode].title}</option>)}
            </select><span className="field-chevron">⌄</span></label>
            <p className="mode-hint">{MODES[game.mode].description} · Meta científica: {MODES[game.mode].researchGoal}%.</p>
            <div className={`guide-card guide-${guidance.tone}`} aria-live="polite"><span className="guide-kicker">◈ SEU PRÓXIMO PASSO</span><strong>{guidance.title}</strong><p>{guidance.description}</p>{guidance.action!=='none'&&<button type="button" onClick={guidedAction}>{guidance.actionLabel} ↗</button>}</div>
            <div className="seed-row"><span>SEED DO CENÁRIO</span><span>#{game.seed}</span></div>
            <button className="lab-launch" onClick={openLab} type="button"><span className="lab-launch-icon">⬡</span><span><strong>LABORATÓRIO ZERO</strong><small>{game.agent.name||'PROTOCOLO SEM NOME'} · {game.agent.purchased.length} MELHORIAS</small></span><span className="lab-launch-arrow">↗</span></button>
            {game.agent.points>0&&<button className="lab-alert lab-alert-button" type="button" onClick={openLab}>◆ {ended?`${game.agent.points} pontos não utilizados · partida encerrada`:`${game.agent.points} pontos · CLIQUE PARA EVOLUIR`}</button>}
            {!started?<button className="primary-btn" onClick={begin} type="button"><Icon name="play"/> INICIAR SIMULAÇÃO <span>↗</span></button>:<button className="outline-btn full-width" onClick={reset} type="button"><Icon name="reset"/> NOVA PARTIDA</button>}
            {ended&&<div className="outcome-box"><strong>{game.phase==='contained'?'CONTENÇÃO CIENTÍFICA':'LIMITE CRÍTICO ATINGIDO'}</strong><span>Simulação encerrada no dia {game.day}.</span><button type="button" className="outline-btn" onClick={()=>setOutcomeOpen(true)}>VER RELATÓRIO FINAL ↗</button></div>}
          </div>
          <div className="panel-heading secondary"><span className="heading-square"/> CONTROLES RÁPIDOS <span className="panel-number">02</span></div>
          <div className="quick-panel"><button onClick={save} type="button"><Icon name="save"/> Salvar partida <span>⌘</span></button><button onClick={()=>load('manual')} type="button"><Icon name="upload"/> Carregar partida <span>↗</span></button><button onClick={()=>load('automatico')} type="button"><Icon name="upload"/> Recuperar sessão <span>↶</span></button>
            <button onClick={()=>load('backup')} type="button"><Icon name="upload"/> Recuperar backup <span>↶</span></button>
            <button onClick={exportSave} type="button"><Icon name="save"/> Exportar arquivo JSON <span>↓</span></button>
            <button onClick={()=>importRef.current?.click()} type="button"><Icon name="upload"/> Importar arquivo JSON <span>↑</span></button>
            <input ref={importRef} className="file-import-hidden" type="file" accept=".json,application/json" aria-label="Selecionar save JSON para importar" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';await importSave(file);}} />
            <button onClick={reset} type="button"><Icon name="reset"/> Reiniciar cenário <span>↺</span></button></div>
          <div className="sidebar-note"><span className="note-mark">!</span><p>Protótipo estratégico. Todas as estatísticas, decisões e conexões são abstrações de gameplay.</p></div>
        </aside>

        <main className="mainstage">
          <WorldMap game={game} selected={selected} onSelect={selectCountry} effectsEnabled={motion}/>
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
            {autosaveFailure&&<div className="autosave-alert" role="alert"><div><strong>Autosave não confirmado</strong><p>{autosaveFailure} A partida continua jogável, mas o progresso recente pode não estar protegido.</p><small>{lastAutosave?.seed===game.seed?`Última gravação confirmada nesta aba: dia ${lastAutosave.day}.`:'Nenhuma gravação automática confirmada nesta sessão.'}</small></div><div className="autosave-actions"><button type="button" disabled={game.phase==='setup'||game.day===0} onClick={()=>{void attemptAutosave(game);}}>TENTAR NOVAMENTE</button>{autosaveConflict&&<button type="button" disabled={game.phase==='setup'||game.day===0} onClick={()=>{if(window.confirm('Outra aba está usando o autosave. Assumir nesta aba pode substituir o checkpoint anterior. Exporte o progresso antes se quiser preservá-lo. Continuar?'))void attemptAutosave(game,true);}}>ASSUMIR NESTA ABA</button>}<button type="button" onClick={exportSave}>EXPORTAR JSON</button></div></div>}
            {moment&&<div className={`immersion-moment moment-${moment.cue}`} key={`${moment.day}-${moment.cue}`} role="status" aria-live="polite"><span className="moment-icon" aria-hidden="true">{moment.cue==='event'?'◈':moment.cue==='evolution'?'✦':'◆'}</span><div><strong>{moment.title}</strong><small>{moment.detail}</small></div><span className="moment-day">DIA {moment.day}</span></div>}
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
      <footer className="page-footer"><span>PROJECT ZERO <b>/</b> EXPERIMENTO DE ESTRATÉGIA</span><span>SIMULAÇÃO TOTALMENTE FICTÍCIA · NÃO REPRESENTA PREVISÕES REAIS</span><span>V0.11 — IMERSÃO E ACABAMENTO</span></footer>
    </div>
    {tourOpen&&<Onboarding onClose={closeTour} onLaboratory={openLab}/>}
    {outcomeOpen&&ended&&<GameOutcome game={game} previous={previousRun} onClose={()=>setOutcomeOpen(false)} onRepeat={repeat} onNew={newAfterOutcome}/>}
    {labOpen&&<Laboratory game={game} selected={selected} onSelect={selectCountry} onTactic={useTactic} feedback={decisionFeedback} onClose={()=>setLabOpen(false)} onName={name=>setGame(g=>setAgentName(g,name))} onAttribute={(id:AttributeId,delta:-1|1)=>setGame(g=>adjustAttribute(g,id,delta))} onPurchase={purchase}/>}
  </div>;
}
