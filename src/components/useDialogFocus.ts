import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Captura o foco no diálogo, fecha com Esc e devolve o foco ao controle de origem. */
export function useDialogFocus<T extends HTMLElement>(ref: RefObject<T|null>, onClose: ()=>void) {
  const closeRef = useRef(onClose);
  closeRef.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const modal=ref.current;
    const items=()=>Array.from(modal?.querySelectorAll<HTMLElement>(FOCUSABLE)??[])
      .filter(el=>el.getClientRects().length>0);
    (items()[0]??modal)?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape') {event.preventDefault();closeRef.current();return;}
      if(event.key!=='Tab'||!modal)return;
      const tabbable=items();
      if(!tabbable.length) {event.preventDefault();modal.focus();return;}
      const first=tabbable[0],last=tabbable[tabbable.length-1];
      if(event.shiftKey && (document.activeElement===first || !modal.contains(document.activeElement))) {event.preventDefault();last.focus();}
      else if(!event.shiftKey && (document.activeElement===last || !modal.contains(document.activeElement))) {event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',onKey);
    return ()=>{document.removeEventListener('keydown',onKey); if(previous?.isConnected)previous.focus();};
  },[ref]);
}
