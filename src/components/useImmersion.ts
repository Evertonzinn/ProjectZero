import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_IMMERSION, effectiveMotion, IMMERSION_KEY, parsePreferences } from '../engine/immersion';
import type { Cue, ImmersionPreferences } from '../engine/immersion';

const SOUND: Record<Cue,{notes: number[];duration:number;wave:OscillatorType}> = {
  start:{notes:[330,440],duration:.11,wave:'sine'},
  upgrade:{notes:[440,587,740],duration:.11,wave:'sine'},
  tactic:{notes:[392,440],duration:.09,wave:'triangle'},
  alert:{notes:[294,220],duration:.13,wave:'triangle'},
  event:{notes:[350,466],duration:.10,wave:'sine'},
  evolution:{notes:[392,523],duration:.10,wave:'sine'},
  victory:{notes:[440,554,659],duration:.16,wave:'sine'},
  contained:{notes:[370,330,262],duration:.16,wave:'sine'},
};
function initialPreferences(): ImmersionPreferences {
  try { return parsePreferences(window.localStorage.getItem(IMMERSION_KEY)); }
  catch { return {...DEFAULT_IMMERSION}; }
}
export function useImmersion() {
  const [preferences,setPreferences]=useState(initialPreferences);
  const [systemReduced,setSystemReduced]=useState(()=>typeof window!=='undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);
  const context=useRef<AudioContext|null>(null);
  const lastCue=useRef(0);
  const soundRef=useRef(preferences.sound); soundRef.current=preferences.sound;
  useEffect(()=>{
    try {window.localStorage.setItem(IMMERSION_KEY,JSON.stringify(preferences));} catch {/* Preferências continuam disponíveis durante a sessão */}
  },[preferences]);
  useEffect(()=>{
    const query=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if(!query)return;
    const changed=()=>setSystemReduced(query.matches);
    query.addEventListener?.('change',changed);
    return ()=>query.removeEventListener?.('change',changed);
  },[]);
  useEffect(()=>()=>{const current=context.current; if(current){void current.close().catch(()=>{});context.current=null;}},[]);
  const cue=useCallback((kind:Cue,fromGesture=false)=>{
    if(!soundRef.current)return;
    const clock=Date.now();if(clock-lastCue.current<180&&!fromGesture)return;
    lastCue.current=clock;
    try {
      const Ctor=window.AudioContext;
      if(!Ctor)return;
      const audio=context.current??new Ctor();context.current=audio;
      // Nunca forçar retomada de áudio a partir de timer: exige gesto do usuário.
      if(audio.state==='suspended'){
        if(!fromGesture)return;
        void audio.resume().catch(()=>{});
      }
      if(audio.state==='closed')return;
      const spec=SOUND[kind],begin=audio.currentTime+.012;
      spec.notes.forEach((freq,i)=>{
        const start=begin+i*spec.duration*.82;
        const oscillator=audio.createOscillator(),gain=audio.createGain();
        oscillator.type=spec.wave; oscillator.frequency.value=freq;
        gain.gain.setValueAtTime(.0001,start);
        gain.gain.exponentialRampToValueAtTime(.038,start+.018);
        gain.gain.exponentialRampToValueAtTime(.0001,start+spec.duration);
        oscillator.connect(gain);gain.connect(audio.destination);
        oscillator.start(start);oscillator.stop(start+spec.duration+.01);
      });
    } catch {/* WebAudio é opcional; falha de som não pode interromper o jogo */}
  },[]);
  const toggleSound=useCallback(()=>{
    const enabled=!soundRef.current;
    soundRef.current=enabled;
    setPreferences(p=>({...p,sound:enabled}));
    if(enabled)cue('start',true); // Requer gesto explícito; sem áudio automático por padrão.
  },[cue]);
  const toggleMotion=useCallback(()=>setPreferences(p=>({...p,motion:!p.motion})),[]);
  return {sound:preferences.sound,motion:effectiveMotion(preferences.motion,systemReduced),motionPreference:preferences.motion,systemReduced,toggleSound,toggleMotion,cue};
}
