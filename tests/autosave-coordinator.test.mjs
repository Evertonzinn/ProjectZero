import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,advanceDay} from '../.engine-build/engine/simulation.js';
import {SAVE_KEYS,readSave,writeSave} from '../.engine-build/engine/persistence.js';
import {AUTOSAVE_OWNER_KEY,AUTOSAVE_LEASE_MS,saveAutosaveWithLease,parseAutosaveOwner,coordinatedAutosave} from '../.engine-build/engine/autosaveCoordinator.js';
function storage(){const m=new Map();return {m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v)};}
function game(seed=1,days=12){let g=startGame(createGame('BRA',seed));for(let i=0;i<days;i++)g=advanceDay(g);return g;}
test('PZ-03: apenas a aba dona escreve; não sobrescreve autosave ao detectar concorrente',()=>{
 const s=storage(),a=game(9,10),b=game(8,30);
 assert.equal(saveAutosaveWithLease(s,a,'A',false,1000).status,'ok');
 const checkpoint=s.getItem(SAVE_KEYS.automatico);
 assert.equal(saveAutosaveWithLease(s,b,'B',false,1001).status,'conflict');
 assert.equal(s.getItem(SAVE_KEYS.automatico),checkpoint);
 assert.equal(readSave(s,'automatico').game.seed,9);
});
test('PZ-03: a aba titular pode atualizar e renova a concessão',()=>{
 const s=storage();saveAutosaveWithLease(s,game(9,10),'A',false,1000);
 assert.equal(saveAutosaveWithLease(s,game(9,20),'A',false,3000).status,'ok');
 assert.deepEqual(parseAutosaveOwner(s.getItem(AUTOSAVE_OWNER_KEY)),{owner:'A',expiresAt:3000+AUTOSAVE_LEASE_MS});
 assert.equal(readSave(s,'automatico').game.day,20);
});
test('PZ-03: quando o antigo dono fecha, concessão expira e próxima aba assume',()=>{
 const s=storage();saveAutosaveWithLease(s,game(9,10),'A',false,1000);
 const future=1000+AUTOSAVE_LEASE_MS+1;
 assert.equal(saveAutosaveWithLease(s,game(8,12),'B',false,future).status,'ok');
 assert.equal(saveAutosaveWithLease(s,game(9,21),'A',false,future+1).status,'conflict');
 assert.equal(readSave(s,'automatico').game.seed,8);
});
test('PZ-03: tomada de controle explícita bloqueia a aba antiga',()=>{
 const s=storage();saveAutosaveWithLease(s,game(9,10),'A',false,1000);
 assert.equal(saveAutosaveWithLease(s,game(8,10),'B',true,1500).status,'ok');
 assert.equal(saveAutosaveWithLease(s,game(9,20),'A',false,1501).status,'conflict');
 assert.equal(readSave(s,'automatico').game.seed,8);
});
test('PZ-03: metadados corrompidos ou id inválido falham sem destruir saves',()=>{
 const s=storage(),g=game();writeSave(s,'automatico',g);const old=s.getItem(SAVE_KEYS.automatico);
 s.setItem(AUTOSAVE_OWNER_KEY,'{');
 assert.equal(saveAutosaveWithLease(s,g,'A').status,'conflict');
 assert.equal(saveAutosaveWithLease(s,g,'').status,'invalid');
 assert.equal(s.getItem(SAVE_KEYS.automatico),old);
});
test('PZ-03: falha de armazenamento não propaga exceção nem apaga save manual',()=>{
 const g=game(),s=storage();writeSave(s,'manual',g);
 const broken={getItem:s.getItem,setItem:(key,value)=>{if(key===AUTOSAVE_OWNER_KEY)throw Error('quota');s.setItem(key,value);}};
 assert.equal(saveAutosaveWithLease(broken,g,'A').status,'unavailable');
 assert.equal(readSave(s,'manual').game.seed,g.seed);
});
test('PZ-03: mantém chaves antigas e reusa autosave legado sem metadados',()=>{
 const s=storage(),old=game(2),updated=game(3);
 writeSave(s,'automatico',old);
 assert.equal(saveAutosaveWithLease(s,updated,'A',false,123).status,'ok');
 assert.equal(readSave(s,'automatico').game.seed,3);
 assert.equal(SAVE_KEYS.manual,'project-zero-save-v1');
});
test('PZ-03: Web Locks serializa duas tentativas concorrentes',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 let previous=Promise.resolve();
 const locks={request:(_name,callback)=>{const current=previous.then(()=>callback());previous=current.then(()=>undefined,()=>undefined);return current;}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks}});
 try {
   const s=storage();
   const results=await Promise.all([coordinatedAutosave(s,game(10),'A'),coordinatedAutosave(s,game(11),'B')]);
   assert.deepEqual(results.map(r=>r.status),['ok','conflict']);
   assert.equal(readSave(s,'automatico').game.seed,10);
 } finally {
   if(original)Object.defineProperty(globalThis,'navigator',original);
   else delete globalThis.navigator;
 }
});
