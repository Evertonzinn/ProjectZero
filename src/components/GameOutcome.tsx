import { useEffect, useRef } from 'react';
import { buildMilestones, comparableRuns, summarizeRun } from '../engine/outcome';
import type { RunSummary } from '../engine/outcome';
import { COUNTRY_BY_ID } from '../data/countries';
import type { GameState } from '../engine/simulation';
import { MODES } from '../engine/balance';
import { getLabModifiers } from '../engine/simulation';

const format=(n:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n);

interface Props {
  game:GameState;
  previous:RunSummary|null;
  onClose:()=>void;
  onRepeat:()=>void;
  onNew:()=>void;
}

export function GameOutcome({game,previous,onClose,onRepeat,onNew}:Props) {
  const closeRef=useRef<HTMLButtonElement>(null);
  const current=summarizeRun(game);
  useEffect(()=>{
    closeRef.current?.focus();
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[onClose]);
  if (!current) return null;
  const victory=current.outcome==='overwhelmed';
  const comparable=comparableRuns(previous,current);
  const timeline=buildMilestones(game);
  const modifiers=getLabModifiers(game);
  return <div className="result-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <header className="result-topline"><span>PROJECT ZERO / RELATÓRIO DE MISSÃO <b>V0.7</b></span><button ref={closeRef} className="result-close" type="button" onClick={onClose} aria-label="Fechar resultado">✕</button></header>
      <div className={`result-hero ${victory?'result-success':'result-containment'}`}>
        <span className="result-eyebrow">CENÁRIO ENCERRADO · DIA {current.day} · SEED #{current.seed}</span>
        <h2 id="result-title">{victory?'Limite crítico atingido.':'Contenção científica concluída.'}</h2>
        <p>{victory?'O cenário ultrapassou 70% de impacto antes da conclusão da pesquisa científica.':`A pesquisa global atingiu a meta de ${current.researchGoal}% antes que o cenário alcançasse o limite crítico.`}</p>
        <span className="result-origin">{COUNTRY_BY_ID[current.origin].flag} Origem: {COUNTRY_BY_ID[current.origin].name} · {MODES[current.mode].title}</span>
      </div>
      <div className="result-scroll">
        <div className="result-kpis">
          <div><span>DIAS DE PARTIDA</span><strong>{current.day}</strong></div>
          <div><span>POPULAÇÃO IMPACTADA</span><strong>{format(current.affectedPct)}%</strong></div>
          <div><span>PESQUISA GLOBAL</span><strong>{format(current.research)}%</strong></div>
          <div><span>EVOLUÇÕES / PONTOS TÁTICOS</span><strong>{current.upgrades} / {current.tacticsSpent} PT</strong></div>
        </div>
        <div className="result-section-title"><h3>Diagnóstico estratégico</h3><span>MODO: {MODES[current.mode].title.toUpperCase()}</span></div>
        <div className="result-kpis strategy-kpis">
          <div><span>EXPANSÃO BASE</span><strong>×{(modifiers.growthFactor*MODES[current.mode].growth).toFixed(2)}</strong></div>
          <div><span>CONEXÕES</span><strong>×{(modifiers.networkFactor*MODES[current.mode].network).toFixed(2)}</strong></div>
          <div><span>META DE PESQUISA</span><strong>{current.researchGoal}%</strong></div>
          <div><span>PONTOS NÃO GASTOS</span><strong>{game.agent.points}</strong></div>
        </div>
        <p className="result-disclaimer">Multiplicadores de gameplay fictícios: descrevem os parâmetros ao fim da partida, não uma previsão de probabilidades.</p>
        <div className="result-section-title"><h3>Marcos da partida</h3><span>{timeline.length} registros calculados</span></div>
        <ol className="result-milestones">
          {timeline.map((mark,i)=><li key={`${mark.day}-${mark.category}-${i}`} className={`result-milestone-${mark.category}`}><span>DIA {String(mark.day).padStart(3,'0')}</span><b>{mark.label}</b></li>)}
        </ol>
        <div className="result-compare">
          <div className="result-section-title"><h3>Comparar estratégias</h3><span>{comparable?'MESMA SEED E CONFIGURAÇÃO':'AGUARDANDO REPARTIDA COMPARÁVEL'}</span></div>
          {comparable && previous ? <div className="result-comparison-grid">
            <div><span>DIAS ATÉ O DESFECHO</span><b>{previous.day} → {current.day}</b><small>{current.day-previous.day>0?'+':''}{current.day-previous.day} dias</small></div>
            <div><span>POPULAÇÃO IMPACTADA</span><b>{format(previous.affectedPct)}% → {format(current.affectedPct)}%</b><small>{format(current.affectedPct-previous.affectedPct)} p.p.</small></div>
            <div><span>RESULTADO</span><b>{previous.outcome===current.outcome?'Mesmo desfecho':'Desfecho diferente'}</b></div>
          </div>:<p>Repita a mesma seed, o mesmo modo, o mesmo país e os mesmos atributos iniciais. Suas compras e decisões durante a nova partida poderão mudar o resultado. A comparação aparece após a conclusão da próxima tentativa.</p>}
        </div>
        <p className="result-disclaimer">A cronologia reúne limiares registrados e eventos ainda preservados no histórico limitado da partida. Repetir a seed inicia uma nova partida; não reproduz automaticamente decisões anteriores. Simulação inteiramente fictícia.</p>
      </div>
      <footer className="result-actions">
        <button className="result-secondary" type="button" onClick={onClose}>EXPLORAR MAPA</button>
        <button className="result-secondary" type="button" onClick={onNew}>NOVA SEED</button>
        <button className="result-primary" type="button" onClick={onRepeat}>↻ REPETIR MESMA SEED</button>
      </footer>
    </section>
  </div>;
}
