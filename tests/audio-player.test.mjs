import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudioPlayer} from '../.engine-build/engine/audioPlayer.js';

function fakeContext({fails=false,remainsSuspended=false}={}) {
  const records={resume:0,oscillators:[],gains:[],starts:[]};
  class MockContext {
    state='suspended';currentTime=10;destination={};
    async resume() {records.resume++;if(fails)throw new Error('Blocked');if(!remainsSuspended)this.state='running';}
    async close(){this.state='closed';}
    createOscillator(){const osc={frequency:{value:0},type:'sine',connect(){},start(t){records.starts.push(t);},stop(){}};records.oscillators.push(osc);return osc;}
    createGain(){const gain={gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};records.gains.push(gain);return gain;}
  }
  return {MockContext,records};
}

test('PZ-04: nunca inicializa o AudioContext sem gesto explícito',async()=>{
 const {MockContext,records}=fakeContext();let constructors=0;
 const player=createAudioPlayer(()=>{constructors++;return MockContext;});
 assert.equal(await player.play('event'),'blocked');
 assert.equal(constructors,0);assert.equal(records.starts.length,0);
});
test('PZ-04: aguarda resume antes de agendar tons audíveis',async()=>{
 const {MockContext,records}=fakeContext();const player=createAudioPlayer(()=>MockContext);
 assert.equal(await player.play('start',true),'scheduled');
 assert.equal(records.resume,1);assert.equal(records.starts.length,2);
 assert.equal(player.getState(),'running');
 assert.equal(await player.play('upgrade'),'scheduled');
 assert.equal(records.resume,1);assert.equal(records.starts.length,5);
});
test('PZ-04: áudio persistido após reload requer novo gesto para destravar',async()=>{
 const {MockContext,records}=fakeContext();const player=createAudioPlayer(()=>MockContext);
 assert.equal(await player.play('alert',false),'blocked');
 assert.equal(await player.play('start',true),'scheduled');
 assert.equal(await player.play('event',false),'scheduled');
 assert.equal(records.starts.length,4);
});
test('PZ-04: recusa tocar se resume falha ou permanece suspenso',async()=>{
 for(const spec of [{fails:true},{remainsSuspended:true}]) {
   const {MockContext,records}=fakeContext(spec);const player=createAudioPlayer(()=>MockContext);
   assert.equal(await player.play('start',true),spec.fails?'error':'blocked');
   assert.equal(records.starts.length,0);
 }
});
test('PZ-04: ausência de API e fechamento são falhas seguras',async()=>{
 const player=createAudioPlayer(()=>undefined);
 assert.equal(await player.play('start',true),'unavailable');
 player.close();assert.equal(await player.play('start',true),'unavailable');
});
test('PZ-04: o sinal é agendado somente após a Promise resolver',async()=>{
 let complete;const {MockContext,records}=fakeContext();
 MockContext.prototype.resume=function(){records.resume++;return new Promise(resolve=>{complete=()=>{this.state='running';resolve();};});};
 const player=createAudioPlayer(()=>MockContext);
 const pending=player.play('start',true);
 assert.equal(records.starts.length,0);
 complete();assert.equal(await pending,'scheduled');
 assert.equal(records.starts.length,2);
});