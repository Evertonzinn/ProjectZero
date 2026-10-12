import { useEffect, useRef, useState } from 'react';
import { TUTORIAL_STEPS } from '../engine/guide';

interface Props { onClose:()=>void; onLaboratory:()=>void }

export function Onboarding({onClose,onLaboratory}:Props) {
  const [step,setStep]=useState(0);
  const first=useRef<HTMLButtonElement>(null);
  const modal=useRef<HTMLElement>(null);
  const item=TUTORIAL_STEPS[step];
  useEffect(()=>{
    first.current?.focus();
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape')onClose();
      if(e.key==='Tab' && modal.current){
        const focusables=Array.from(modal.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        if(!focusables.length)return;
        const start=focusables[0],end=focusables[focusables.length-1];
        if(e.shiftKey && document.activeElement===start){e.preventDefault();end.focus();}
        else if(!e.shiftKey && document.activeElement===end){e.preventDefault();start.focus();}
      }
    };
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[onClose]);
  return <div className="tour-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="tour-modal" ref={modal} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description">
      <div className="tour-top"><span>PROJECT ZERO / GUIA DO COMANDANTE</span><button type="button" aria-label="Fechar tutorial" ref={first} onClick={onClose}>✕</button></div>
      <div className="tour-content"><span className="tour-eyebrow">{item.caption}</span><h2 id="tour-title">{item.title}<span>.</span></h2><p id="tour-description">{item.text}</p>
        <div className="tour-progress" aria-label={`Etapa ${step+1} de ${TUTORIAL_STEPS.length}`}>{TUTORIAL_STEPS.map((entry,i)=><button type="button" key={entry.caption} className={step===i?'active':''} onClick={()=>setStep(i)} aria-label={`Ir para etapa ${i+1}`} aria-current={i===step?'step':undefined}/>)}</div>
        <div className="tour-counter">{String(step+1).padStart(2,'0')} / {String(TUTORIAL_STEPS.length).padStart(2,'0')}</div>
      </div>
      <div className="tour-actions"><button type="button" className="tour-secondary" onClick={onClose}>PULAR GUIA</button>{step>0&&<button type="button" className="tour-secondary" onClick={()=>setStep(i=>i-1)}>VOLTAR</button>}
        {step<TUTORIAL_STEPS.length-1?<button type="button" className="tour-primary" onClick={()=>setStep(i=>i+1)}>PRÓXIMO PASSO →</button>:<button type="button" className="tour-primary" onClick={()=>{onClose();onLaboratory();}}>ABRIR LABORATÓRIO →</button>}
      </div>
    </section>
  </div>;
}
