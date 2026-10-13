import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, startGame, advanceDay, restoreGame} from '../.engine-build/engine/simulation.js';
import {SAVE_KEYS, readSave, writeSave, parseGameJson, MAX_IMPORT_BYTES} from '../.engine-build/engine/persistence.js';

function storage(initial = {}) {
 const values=new Map(Object.entries(initial));
 return {values,getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>{values.set(k,v)}};
}
function run(){let g=startGame(createGame('BRA',1337));for(let i=0;i<11;i++)g=advanceDay(g);return g;}

test('manual: mantém chave legada e backup válido anterior',()=>{
 const st=storage();const first=run();const next=advanceDay(first);
 assert.deepEqual(writeSave(st,'manual',first),{status:'ok'});
 assert.equal(st.values.get(SAVE_KEYS.backup),undefined);
 assert.equal(writeSave(st,'manual',next).status,'ok');
 assert.equal(readSave(st,'manual').game.day,next.day);
 assert.equal(readSave(st,'backup').game.day,first.day);
});
test('autosave separado não sobrescreve manual e pode ser recuperado',()=>{
 const st=storage();const first=run();
 writeSave(st,'manual',first);writeSave(st,'automatico',advanceDay(first));
 assert.equal(readSave(st,'manual').game.day,11);
 assert.equal(readSave(st,'automatico').game.day,12);
});
test('save corrupto nunca é silenciosamente aceito',()=>{
 const st=storage({[SAVE_KEYS.manual]:'{not json'});
 assert.equal(readSave(st,'manual').status,'invalid');
 assert.equal(readSave(st,'automatico').status,'missing');
 assert.equal(parseGameJson('null').status,'invalid');
 assert.equal(parseGameJson('"anything"').status,'invalid');
});
test('storage indisponível devolve status sem lançar exceção',()=>{
 const down={getItem(){throw Error('private')},setItem(){throw Error('private')}};
 assert.equal(readSave(down,'manual').status,'unavailable');
 assert.equal(writeSave(down,'automatico',run()).status,'unavailable');
});
test('falha no backup impede sobrescrever manual',()=>{
 const first=run(),next=advanceDay(first),raw=JSON.stringify(first);
 const st={getItem:k=>k===SAVE_KEYS.manual?raw:null,setItem(){throw Error('quota')}};
 assert.equal(writeSave(st,'manual',next).status,'backup-failed');
 assert.equal(st.getItem(SAVE_KEYS.manual),raw);
});
test('falha na gravação preserva último save manual',()=>{
 const first=run(),old=JSON.stringify(first);const st={getItem:k=>k===SAVE_KEYS.manual?old:null,setItem:(key)=>{if(key===SAVE_KEYS.manual)throw Error('quota')}};
 assert.equal(writeSave(st,'manual',advanceDay(first)).status,'unavailable');
 assert.equal(st.getItem(SAVE_KEYS.manual),old);
});
test('import/export JSON reproduz estado determinístico',()=>{
 const first=run();const restored=parseGameJson(JSON.stringify(first));
 assert.equal(restored.status,'ok');assert.deepEqual(restored.game,first);
 assert.deepEqual(advanceDay(restored.game),advanceDay(first));
 assert.equal(restoreGame(restored.game).day,first.day);
});
test('limite de arquivo protege parser; payload futuro incompatível é rejeitado',()=>{
 assert.equal(parseGameJson('x'.repeat(MAX_IMPORT_BYTES+1)).status,'invalid');
 assert.equal(parseGameJson(JSON.stringify({...run(),version:99})).status,'invalid');
});
test('autosave grava fase encerrada e restaura sem alterar o resultado',()=>{
 let g=run();for(let i=0;i<400&&g.phase==='running';i++)g=advanceDay(g);
 const st=storage();assert.equal(writeSave(st,'automatico',g).status,'ok');
 const x=readSave(st,'automatico');assert.equal(x.status,'ok');assert.equal(x.game.phase,g.phase);
});
