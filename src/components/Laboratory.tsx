import { useEffect, useRef } from 'react';
import { ATTRIBUTE_BUDGET, ATTRIBUTE_IDS, ATTRIBUTE_MAX, ATTRIBUTES, UPGRADES, freeAttributePoints } from '../engine/laboratory';
import type { AttributeId, UpgradeId } from '../engine/laboratory';
import { availableUpgrade, getLabModifiers } from '../engine/simulation';
import type { GameState } from '../engine/simulation';

const pct=(n:number)=>`${Math.round((n-1)*100)>=0?'+':''}${Math.round((n-1)*100)}%`;
interface Props {
  game: GameState;
  onClose: () => void;
  onName: (name: string) => void;
  onAttribute: (id: AttributeId, delta:-1|1) => void;
  onPurchase: (id: UpgradeId) => void;
}

export function Laboratory({game,onClose,onName,onAttribute,onPurchase}:Props) {
  const closeRef=useRef<HTMLButtonElement>(null);
  const setup=game.phase==='setup';
  const free=freeAttributePoints(game.agent.attributes);
  const modifiers=getLabModifiers(game);
  useEffect(()=>{
    closeRef.current?.focus();
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[]);
  return <div className="lab-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="lab-modal" role="dialog" aria-modal="true" aria-labelledby="labTitle">
      <header className="lab-header">
        <div className="lab-heading"><div className="lab-glyph">⬡</div><div><span className="lab-eyebrow">PROJECT ZERO / MÓDULO 02</span><h2 id="labTitle">Laboratório <em>Zero</em></h2><p>Configure seu protocolo ficcional e escolha como o cenário evolui.</p></div></div>
        <button className="lab-close" ref={closeRef} type="button" aria-label="Fechar laboratório" onClick={onClose}>✕</button>
      </header>
      <div className="lab-body">
        <div className="lab-config">
          <div className="lab-section-heading"><div><span>01 / CONFIGURAÇÃO</span><h3>Atributos de origem</h3></div><span className="lab-chip">{setup?'EDITÁVEL':'BLOQUEADO'}</span></div>
          <label className="lab-name-label" htmlFor="agentName">IDENTIFICADOR DO PROTOCOLO</label>
          <input id="agentName" className="lab-name" maxLength={28} value={game.agent.name} disabled={!setup} onChange={e=>onName(e.target.value)} placeholder="Nome do protocolo"/>
          <div className="lab-budget"><div><span>ORÇAMENTO INICIAL</span><strong>{free}<small> / {ATTRIBUTE_BUDGET} livres</small></strong></div><div className="lab-budget-meter">{Array.from({length:ATTRIBUTE_BUDGET},(_,i)=><i key={i} className={i<ATTRIBUTE_BUDGET-free?'filled':''}/>)}</div></div>
          <div className="lab-attributes">{ATTRIBUTE_IDS.map(id=>{
            const def=ATTRIBUTES[id],value=game.agent.attributes[id];
            return <div className="lab-attribute" key={id}>
              <div className="lab-attribute-head"><div><span className={`lab-dot ${def.color}`}/><strong>{def.title}</strong></div><span>NÍVEL {value}/{ATTRIBUTE_MAX}</span></div>
              <p>{def.description}</p>
              <div className="lab-attribute-controls"><button type="button" aria-label={`Diminuir ${def.title}`} disabled={!setup||value===0} onClick={()=>onAttribute(id,-1)}>−</button><div className="lab-level-meter">{Array.from({length:ATTRIBUTE_MAX},(_,i)=><i className={i<value?def.color:''} key={i}/>)}</div><button type="button" aria-label={`Aumentar ${def.title}`} disabled={!setup||value===ATTRIBUTE_MAX||free===0} onClick={()=>onAttribute(id,1)}>+</button></div>
              <small>{def.impact}</small>
            </div>;
          })}</div>
          <div className="lab-feedback"><span>RESULTADO DOS MODIFICADORES</span><div><span>Expansão</span><b>{pct(modifiers.growthFactor)}</b></div><div><span>Conexões</span><b>{pct(modifiers.networkFactor)}</b></div><div><span>Limiar de reação</span><b>{pct(modifiers.signalFactor)}</b></div><div><span>Pesquisa mundial</span><b>{pct(modifiers.scienceFactor)}</b></div><small>Comparados aos parâmetros neutros do motor. Efeitos são aplicados a partir do próximo dia.</small></div>
        </div>
        <div className="lab-evolutions">
          <div className="lab-section-heading"><div><span>02 / EVOLUÇÃO</span><h3>Árvore de melhorias</h3></div><div className="lab-points"><span>PONTOS DISPONÍVEIS</span><strong>{game.agent.points.toString().padStart(2,'0')}</strong></div></div>
          <div className="lab-callout"><span>◈</span><p>Ganhe <b>2 pontos a cada 10 dias</b>. Melhorias custam pontos, exigem níveis mínimos e algumas escolhas bloqueiam seus caminhos opostos.</p></div>
          <div className="lab-upgrades">{UPGRADES.map((up,i)=>{
            const available=availableUpgrade(game,up.id),owned=game.agent.purchased.includes(up.id);
            return <article className={`lab-upgrade ${owned?'owned':''}`} key={up.id}>
              <div className="lab-upgrade-head"><span className="lab-upgrade-symbol">{String(i+1).padStart(2,'0')}</span><span className="lab-upgrade-cost">{up.cost} PT</span></div>
              <h4>{up.title}</h4><p>{up.description}</p>
              <div className="lab-upgrade-effect">↑ {up.effect}</div>
              {up.tradeoff&&<div className="lab-upgrade-tradeoff">↔ {up.tradeoff}</div>}
              <div className="lab-upgrade-requirement">REQUISITO: {ATTRIBUTES[up.requires].title.toUpperCase()} {up.minLevel}+</div>
              <button className={owned?'lab-buy purchased':'lab-buy'} type="button" disabled={!available.ok} onClick={()=>onPurchase(up.id)}>{owned?'✓ ATIVADA':available.ok?'ATIVAR MELHORIA':available.reason.toUpperCase()}</button>
            </article>;
          })}</div>
        </div>
      </div>
      <footer className="lab-footer"><span>SIMULAÇÃO FICTÍCIA · ATRIBUTOS ABSTRATOS DE GAMEPLAY</span><button className="lab-done" type="button" onClick={onClose}>{setup?'VOLTAR AO MAPA':'APLICAR E VOLTAR'} →</button></footer>
    </section>
  </div>;
}
