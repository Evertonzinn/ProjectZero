/** Audio local opcional. Apenas gestos explícitos desbloqueiam o contexto. */
import type { Cue } from './immersion.js';

export type AudioPlayback = 'scheduled' | 'blocked' | 'unavailable' | 'error';
export type AudioContextConstructor = new () => AudioContext;

const SOUNDS: Record<Cue,{notes: readonly number[];duration:number;wave:OscillatorType}> = {
  start:{notes:[330,440],duration:.19,wave:'sine'},
  upgrade:{notes:[440,587,740],duration:.16,wave:'sine'},
  tactic:{notes:[392,440],duration:.17,wave:'triangle'},
  alert:{notes:[294,220],duration:.20,wave:'triangle'},
  event:{notes:[350,466],duration:.18,wave:'sine'},
  evolution:{notes:[392,523],duration:.18,wave:'sine'},
  victory:{notes:[440,554,659],duration:.22,wave:'sine'},
  contained:{notes:[370,330,262],duration:.22,wave:'sine'},
};

/** O construtor é injetável para testar o comportamento sem um navegador real. */
function contextIsRunning(context:AudioContext):boolean {return context.state==='running';}

export function createAudioPlayer(getConstructor:()=>AudioContextConstructor|undefined) {
  let context:AudioContext|null=null;
  let closed=false;
  return {
    async play(kind:Cue, gesture=false):Promise<AudioPlayback> {
      if(closed)return 'unavailable';
      try {
        // O navegador pode bloquear a criação ou retomada sem gesto do usuário.
        if(!context || context.state==='closed') {
          if(!gesture)return 'blocked';
          const Constructor=getConstructor();
          if(!Constructor)return 'unavailable';
          context=new Constructor();
        }
        const audio=context;
        if(audio.state!=='running') {
          if(!gesture)return 'blocked';
          // Invocado diretamente no handler do clique, antes de qualquer await.
          await audio.resume();
          if(!contextIsRunning(audio))return 'blocked';
        }
        const spec=SOUNDS[kind];
        const begin=audio.currentTime+0.035;
        for(let i=0;i<spec.notes.length;i++) {
          const start=begin+i*spec.duration*0.9;
          const oscillator=audio.createOscillator();
          const gain=audio.createGain();
          oscillator.type=spec.wave;
          oscillator.frequency.value=spec.notes[i];
          gain.gain.setValueAtTime(0.0001,start);
          gain.gain.exponentialRampToValueAtTime(0.085,start+0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001,start+spec.duration);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start(start);
          oscillator.stop(start+spec.duration+0.015);
        }
        // Agendado não implica som perceptível: dispositivo/volume exigem teste manual.
        return 'scheduled';
      } catch {
        return 'error';
      }
    },
    getState():AudioContextState|'uninitialized' {
      return context?.state??'uninitialized';
    },
    close():void {
      closed=true;
      const old=context;
      context=null;
      if(old && old.state!=='closed')void old.close().catch(()=>{});
    },
  };
}