/** Comparação reproduzível de regras originais e revisadas. Sem bibliotecas externas. */
import {writeFileSync, mkdirSync} from 'node:fs';
import {benchmarkBots} from './benchmark-bots.mjs';

const original=benchmarkBots({ruleset:'legado'});
const revised=benchmarkBots({ruleset:'revisado'});
if(original.total!==1344||revised.total!==1344)throw Error('Amostragem incompleta');
const key=row=>`${row.modo}/${row.estrategia}`;
const older=new Map(original.rows.map(row=>[key(row),row]));
const comparison=revised.rows.map(row=>({
  ...row,
  vitorias_antes_pct:older.get(key(row)).vit_player_pct,
  delta_vitorias_pp:+(row.vit_player_pct-older.get(key(row)).vit_player_pct).toFixed(1),
  dias_antes:older.get(key(row)).dias_medios,
}));
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=['classico','exploracao','equilibrado','desafio'].map(mode=>{
  const rs=comparison.filter(row=>row.modo===mode);
  return `<section><h2>${escapeHtml(mode.toUpperCase())}</h2><div class="scroll"><table><thead><tr><th>Estratégia</th><th>Vitórias antes</th><th>Vitórias revisadas</th><th>Variação</th><th>Dias médios</th><th>Ações táticas</th></tr></thead><tbody>${rs.map(r=>`<tr><td>${escapeHtml(r.estrategia)}</td><td>${r.vitorias_antes_pct}%</td><td><strong>${r.vit_player_pct}%</strong></td><td>${r.delta_vitorias_pp>0?'+':''}${r.delta_vitorias_pp} p.p.</td><td>${r.dias_medios}</td><td>${r.taticas_medias}</td></tr>`).join('')}</tbody></table></div></section>`;
}).join('');
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Project Zero v0.9.1 — Auditoria comparativa</title><style>:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif;background:#0b141d;color:#dfebe7}body{max-width:1100px;margin:auto;padding:26px 18px}h1{font-size:32px;line-height:1.15;color:#c5ed95}.eyebrow{font-weight:750;letter-spacing:2px;color:#94b7a0;font-size:11px}h2{font-size:17px;letter-spacing:1.5px;color:#c9e2d4;margin:0 0 17px}p{color:#aec3bf;line-height:1.7}section{background:#13252f;border:1px solid #395451;padding:20px;margin:22px 0}.scroll{overflow:auto}table{width:100%;border-collapse:collapse;min-width:650px}th,td{border-bottom:1px solid #2a434c;padding:12px;text-align:left;font-size:12px}th{background:#1a3038;color:#b1c5d0}strong{color:#c9f69a}.metric{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.metric div{border:1px solid #466650;background:#1d393b;padding:15px}.metric b{font-size:28px;display:block;color:#c9f69a}.metric span{font-size:12px;color:#aac5bd}@media(max-width:600px){.metric{grid-template-columns:1fr}h1{font-size:26px}}</style></head><body><div class="eyebrow">PROJECT ZERO / AUDITORIA DETERMINÍSTICA</div><h1>v0.9.1 · Rebalanceamento estratégico</h1><p>Uma comparação lado a lado do conjunto de regras original (v0.9) e do revisado (v0.9.1). Cada cenário é idêntico: mesmas seeds, país de origem, modo e política de bot. Apenas os coeficientes do conjunto de regras mudam.</p><div class="metric"><div><b>2.688</b><span>partidas comparadas</span></div><div><b>7</b><span>estratégias por modo</span></div><div><b>48</b><span>cenários por estratégia/modo</span></div></div>${sections}<section><h2>Escopo e limitações</h2><p>Amostra fixa: 16 seeds × 3 origens × 7 políticas × 4 modos × 2 conjuntos de regras. Os bots usam ações válidas e nenhuma informação futura. A dificuldade Clássico conserva os parâmetros legados nos dois conjuntos.</p><p>Uma taxa observada de vitórias não é uma probabilidade garantida. Perfis diferentes utilizam atributos distintos, exceto Economizador, Concentrado e Adaptativo, que compartilham a configuração inicial.</p><p>As partidas antigas migradas continuam no conjunto Legado. O custo progressivo e a reação científica só afetam novas partidas no conjunto Revisado. Não há modelo epidemiológico real.</p></section></body></html>`;
mkdirSync('reports',{recursive:true});
writeFileSync('reports/benchmark-comparativo-v091.json',JSON.stringify({original:{...original, different:original.different},revisado:{...revised,different:revised.different},comparison},null,2));
writeFileSync('reports/balanceamento-v091.html',html);
console.log(`Comparativo: ${original.total+revised.total} partidas, ${comparison.length} linhas, arquivo reports/balanceamento-v091.html`);
console.table(comparison.filter(row=>row.modo==='desafio').map(x=>({bot:x.estrategia,antes:x.vitorias_antes_pct,depois:x.vit_player_pct,delta:x.delta_vitorias_pp})));
