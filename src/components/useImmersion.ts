import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_IMMERSION, effectiveMotion, IMMERSION_KEY, parsePreferences } from '../engine/immersion';
import type { Cue, ImmersionPreferences } from '../engine/immersion';
import {createAudioPlayer} from '../engine/audioPlayer';
import type { AudioPlayback } from '../engine/audioPlayer';

type SoundStatus = 'off' | 'needs-click' | 'ready' | 'blocked' | 'unavailable';
function initialPreferences(): ImmersionPreferences {
  try { return parsePreferences(window.localStorage.getItem(IMMERSION_KEY)); }
  catch { return {...DEFAULT_IMMERSION}; }
}
function contextConstructor() {
  const audioWindow=window as Window & {webkitAudioContext?:typeof AudioContext};
  return audioWindow.AudioContext || audioWindow.webkitAudioContext;
}
export function useImmersion() {
  const [preferences,setPreferences]=useState(initialPreferences);
  const [systemReduced,setSystemReduced]=useState(()=>typeof window!=='undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);
  const [soundStatus,setSoundStatus]=useState<SoundStatus>(preferences.sound?'needs-click':'off');
  const player=useRef<ReturnType<typeof createAudioPlayer>|null>(null);
  const lastCue=useRef(0);
  const soundRef=useRef(preferences.sound);soundRef.current=preferences.sound;
  const getPlayer=useCallback(()=>{
    if(!player.current)player.current=createAudioPlayer(contextConstructor);
    return player.current;
  },[]);
  useEffect(()=>{
    try {window.localStorage.setItem(IMMERSION_KEY,JSON.stringify(preferences));}
    catch {/* O jogo continua mesmo sem storage */}
  },[preferences]);
  useEffect(()=>{
    const query=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if(!query)return;
    const changed=()=>setSystemReduced(query.matches);
    query.addEventListener?.('change',changed);
    return ()=>query.removeEventListener?.('change',changed);
  },[]);
  useEffect(()=>()=>{player.current?.close();player.current=null;},[]);
  const updateStatus=useCallback((result:AudioPlayback)=>{
    if(!soundRef.current)return;
    setSoundStatus(result==='scheduled'?'ready':result==='unavailable'?'unavailable':'blocked');
  },[]);
  const cue=useCallback((kind:Cue,fromGesture=false)=>{
    if(!soundRef.current)return;
    const now=Date.now();
    if(!fromGesture && now-lastCue.current<180)return;
    lastCue.current=now;
    void getPlayer().play(kind,fromGesture).then(updateStatus);
  },[getPlayer,updateStatus]);
  const toggleSound=useCallback(()=>{
    const enabled=!soundRef.current;
    soundRef.current=enabled;
    setPreferences(p=>({...p,sound:enabled}));
    if(enabled){setSoundStatus('needs-click');cue('start',true);}
    else setSoundStatus('off');
  },[cue]);
  const testSound=useCallback(()=>{
    if(!soundRef.current)return;
    // Botão próprio para desbloquear após reload, sem desligar a preferência.
    cue('upgrade',true);
  },[cue]);
  const toggleMotion=useCallback(()=>setPreferences(p=>({...p,motion:!p.motion})),[]);
  return {sound:preferences.sound,soundStatus,testSound,motion:effectiveMotion(preferences.motion,systemReduced),systemReduced,toggleSound,toggleMotion,cue};
}