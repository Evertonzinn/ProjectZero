import { useEffect, useRef } from 'react';
import { ATTRIBUTE_BUDGET, ATTRIBUTE_IDS, ATTRIBUTE_MAX, ATTRIBUTES, UPGRADES, freeAttributePoints } from '../engine/laboratory';
import type { AttributeId, UpgradeId } from '../engine/laboratory';
import { availableTactic, availableUpgrade, getLabModifiers, getTacticCost } from '../engine/simulation';
import { TACTICS } from '../engine/tactics';
import type { TacticId } from '../engine/tactics';
import { COUNTRIES, COUNTRY_BY_ID } from '../data/countries';
import type { GameState } from '../engine/simulation';

const pct=(n:number)=>`${Math.round((n-1)*100)>=0?'+':''}${Math.round((n-1)*100)}%`;
interface Props {
  game: GameState;
  feedback: string;
  selected: string;
  onSelect: (id: string) => void;
  onTactic: (id:TacticId,countryId:string) => void;
  onClose: () => void;
  onName: (name: string) => void;
  onAttribute: (id: AttributeId, delta:-1|1) => void;
  onPurchase: (id: UpgradeId) => void;
}

export function Laboratory({game,feedback,selected,onSelect,onTactic,onClose,onName,onAttribute,onPurchase}:Props) {
  const closeRef=useRef<HTMLButtonElement>(null);
  const setup=game.phase==='setup';
  const free=freeAttributePoints(game.agent.attributes);
  const modifiers=getLabModifiers(game);
  const affordableUpgrades=UPGRADES.filter(u=>availableUpgrade(game,u.id).ok).length;
  const affordableTactics=TACTICS.filter(t=>availableTactic(game,t.id,selected).ok).length;
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
          <div className="lab-section-heading"><div><span>02 / EVOLUÇÃO</span><h3>Árvore de melhorias</h3></div><div className="lab-points"><span>{game.phase==='running'?'PONTOS DISPONÍVEIS':game.phase==='setup'?'PONTOS FUTUROS':'SALDO FINAL (BLOQUEADO)'}</span><strong>{game.agent.points.toString().padStart(2,'0')}</strong></div></div>
          <div className="lab-callout"><span>◈</span><p>{game.phase==='running'?<>Ganhe <b>2 pontos a cada 10 dias</b>. O relógio pausa automaticamente para permitir decisões. Compre melhorias uma vez ou invista em ações táticas repetíveis. No conjunto revisado, melhorias também aceleram a pesquisa global; confira os modificadores após comprar.</>:game.phase==='setup'?<>Distribua os <b>8 pontos iniciais</b> à esquerda. Os pontos de evolução começam no dia 10; depois, o jogo pausa para você utilizá-los.</>:<>A partida foi encerrada. <b>Os pontos restantes são históricos</b> e não podem ser gastos. Use Repetir mesma seed para tentar outra estratégia.</>}</p></div>
          {feedback&&<div className="lab-decision-feedback" role="status" aria-live="polite">{feedback}</div>}
          {game.phase==='running'&&<div className="lab-eligibility" role="status">◈ {affordableUpgrades} melhorias e {affordableTactics} ações táticas disponíveis agora. Selecione as opções habilitadas.</div>}
          <div className="lab-upgrades">{UPGRADES.map((up,i)=>{
            const available=availableUpgrade(game,up.id),owned=game.agent.purchased.includes(up.id);
            return <article className={`lab-upgrade ${owned?'owned':available.ok?'lab-available':''}`} key={up.id}>
              <div className="lab-upgrade-head"><span className="lab-upgrade-symbol">{String(i+1).padStart(2,'0')}</span><span className="lab-upgrade-cost">{up.cost} PT</span></div>
              <h4>{up.title}</h4><p>{up.description}</p>
              <div className="lab-upgrade-effect">↑ {game.ruleset==='revisado'?'Efeitos revisados; confira os multiplicadores após ativar':up.effect}</div>
              {(up.tradeoff||game.ruleset==='revisado')&&<div className="lab-upgrade-tradeoff">↔ {game.ruleset==='revisado'?'Pesquisa global responde às evoluções adquiridas':up.tradeoff}</div>}
              <div className="lab-upgrade-requirement">REQUISITO: {ATTRIBUTES[up.requires].title.toUpperCase()} {up.minLevel}+</div>
              <button className={owned?'lab-buy purchased':'lab-buy'} type="button" disabled={!available.ok} onClick={()=>onPurchase(up.id)}>{owned?'✓ ATIVADA':available.ok?'ATIVAR MELHORIA':available.reason.toUpperCase()}</button>
            </article>;
          })}</div>
          <div className="lab-tactics" aria-label="Ações táticas repetíveis">
            <div className="lab-tactics-header"><div><span>03 / DECISÕES TÁTICAS</span><h3>Aplicar pontos no mapa</h3></div><span>CUSTO PROGRESSIVO · REGRAS {game.ruleset==='revisado'?'REVISADAS':'LEGADAS'}</span></div>
            <p>As melhorias acima são únicas. As operações abaixo podem ser repetidas enquanto houver pontos. No conjunto revisado, cada duas utilizações de uma ação aumentam seu custo em 2 PT. Suas consequências são aplicadas somente ao território escolhido e ficam registradas no boletim.</p>
            <label htmlFor="tactic-target">TERRITÓRIO ALVO</label>
            <select id="tactic-target" value={selected} onChange={event=>onSelect(event.target.value)} disabled={game.phase!=='running'}>
              {COUNTRIES.map(country=><option key={country.id} value={country.id}>{country.flag} {country.name}</option>)}
            </select>
            <span className="lab-target-note">{COUNTRY_BY_ID[selected].flag} {COUNTRY_BY_ID[selected].name} · {game.countries[selected].affected>0?'Em atividade':'Ainda sem atividade'}</span>
            <div className="lab-tactic-grid">{TACTICS.map(tactic=>{
              const available=availableTactic(game,tactic.id,selected);
              return <article className="lab-tactic" key={tactic.id}>
                <div className="lab-tactic-title"><strong>{tactic.title}</strong><span>{getTacticCost(game,tactic.id)} PT</span></div>
                <p>{tactic.description}</p><small>{tactic.id==='pulso' && game.ruleset==='revisado'?'+0,3 ponto percentual no território (limitado ao restante)':tactic.effect}</small>
                <button type="button" disabled={!available.ok} onClick={()=>onTactic(tactic.id,selected)}>{available.ok?'APLICAR AGORA':available.reason.toUpperCase()}</button>
              </article>;
            })}</div>
            <small className="lab-spending">Total gasto em ações táticas: {game.agent.spentTactics} PT. Regras inteiramente fictícias.</small>
          </div>
        </div>
      </div>
      <footer className="lab-footer"><span>SIMULAÇÃO FICTÍCIA · ATRIBUTOS ABSTRATOS DE GAMEPLAY</span><button className="lab-done" type="button" onClick={onClose}>{setup?'VOLTAR AO MAPA':game.phase==='running'?'RETOMAR NO MAPA':'FECHAR LABORATÓRIO'} →</button></footer>
    </section>
  </div>;
}
