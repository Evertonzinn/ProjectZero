"""Monta um preview HTML sem servidor nem dependências, reaproveitando o motor TS compilado."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent
css=(root/'src/styles/app.css').read_text()
engine=(root/'.engine-build/engine/simulation.js').read_text()
countries=(root/'.engine-build/data/countries.js').read_text()
lab=(root/'.engine-build/engine/laboratory.js').read_text().replace('export ','')
intel=(root/'.engine-build/engine/intelligence.js').read_text().replace('export ','')
events=(root/'.engine-build/engine/events.js').read_text().replace('export ','')
tactics=(root/'.engine-build/engine/tactics.js').read_text().replace('export ','')
outcome=(root/'.engine-build/engine/outcome.js').read_text().replace('export ','')
outcome=re.sub(r'^import .*?;\n','',outcome,flags=re.M)
engine=re.sub(r'^import .*?;\n','',engine,flags=re.M)
engine=engine.replace('export ','')
countries=countries.replace('export ','')
world=(root/'src/data/world.json').read_text()
html=r'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#080d16"><title>Project Zero — Economia de Evolução (prévia offline)</title>
<style>%%CSS%%
.preview-hint{padding:10px 16px;margin-bottom:15px;border:1px solid #395044;color:#d7eaaa;background:#13201b;font-size:11px;line-height:1.5}.preview-hint b{color:#dfff95}.map-overlay{position:absolute;left:16px;bottom:16px;width:290px;max-width:70%;pointer-events:none;border:1px solid #485c45;background:#12202be8;padding:14px;display:grid;gap:6px}.map-overlay>small{font-size:10px;font-weight:750;color:#bfe77e;letter-spacing:1px}.map-overlay>strong{font-size:15px;color:#ecf6eb}.map-overlay>span{font-size:10px;color:#9db3b6}.map-viewport{height:clamp(350px,38vw,570px)}.preview-status{font-size:10px;color:#96adac}.preview-status strong{color:#c8eca3}.country-playable{cursor:pointer}.map-svg-tooltip{position:absolute;top:16px;left:16px;border:1px solid #3b5647;color:#e2f5d7;background:#182b32dd;padding:8px 12px;font-size:12px;font-weight:700;display:none}.radar-btn{height:35px;background:#132332;color:#badab4;border:1px solid #365040;padding:0 12px;font-size:10px;font-weight:750}.radar-btn:hover{background:#284139}.country-metrics{display:grid;gap:12px}.region-box{display:flex;flex-direction:column;gap:6px;border-bottom:1px solid #263845;padding-bottom:12px}.region-box>span{font-size:9px;color:#829aa9;letter-spacing:1px;font-weight:720}.region-box>strong{font-size:21px;color:#ebf5ef}.region-box>strong.hot{color:#f5a487}.attr{margin:10px 0}.attr header{display:flex;justify-content:space-between;color:#a8bdc2;font-size:10px;font-weight:720}.bar-bg{margin-top:7px;height:5px;background:#263946}.bar-progress{height:100%;background:#bce77a}.nation-title{font-size:21px;color:#f0f8f3;margin:7px 0 17px}.nation-title span{font-size:25px}.empty-news{min-height:60px}.chart-container{min-height:160px}.trend-svg{height:145px}.playback-title{display:flex}.news-list{max-height:185px}.quick-panel>button{font-size:12px}.status-summary{margin-bottom:10px;display:flex;justify-content:space-between;color:#97adb4;font-size:10px}.status-summary b{color:#b9e984}.scenario-panel .field-wrap{margin-bottom:13px}.country-attrs{display:block}.right-sidebar .panel-heading{padding:0 14px}@media(max-width:1080px){.right-sidebar .country-panel{display:block}.right-sidebar .country-attrs{display:block}}@media(max-width:730px){.page-body{padding-top:12px}.preview-hint{font-size:10px}.map-viewport{height:215px}.map-overlay{max-width:55%;padding:7px;bottom:7px;left:7px}.map-overlay>strong{font-size:11px}.map-overlay>span{display:none}.playback-title{display:flex}}
</style></head>
<body><div class="app"><header class="topbar"><div class="brand"><div class="brand-mark">◎</div><div class="brand-word"><strong>PROJECT<span> ZERO</span></strong><small>GLOBAL STRATEGY SIMULATOR</small></div></div><div class="topcenter"><span class="top-label">OPERAÇÃO</span><b>OBSERVATÓRIO MUNDIAL</b><span class="header-separator"></span><span class="build-label">ALPHA <span>0.6.0</span></span></div><div class="topright"><span class="server-dot"></span>EXECUÇÃO LOCAL</div></header>
<div class="page-body"><div class="preview-hint"><b>PRÉVIA INTERATIVA OFFLINE</b> — Clique em um país, escolha a origem e pressione INICIAR. Este arquivo funciona sem internet, sem servidor e sem npm. Governos decidem de forma autônoma; acompanhe as crises, a corrida científica e os acontecimentos com causas e efeitos persistentes. O projeto React/TypeScript está no ZIP.</div>
<div class="eyebrow-row"><span>PAINEL DE OPERAÇÕES <b>/</b> MAPA GLOBAL</span><span class="scenario-id">CENÁRIO <b>ZERO / 001</b></span></div>
<section class="headline"><div><h1>O mundo é seu tabuleiro<span class="headline-dot">.</span></h1><p>Dezoito nações, reações globais e consequências em cadeia.</p></div><div class="day-highlight"><span>DIA</span><strong id="headingDay">000</strong><div class="status-meta" id="headingStatus">AGUARDANDO</div></div></section>
<section class="kpi-row"><div class="kpi"><div class="kpi-heading"><span>POPULAÇÃO SIMULADA</span><span class="kpi-symbol">◈</span></div><strong id="kpiPopulation">—</strong><span class="kpi-foot">18 PAÍSES</span></div><div class="kpi"><div class="kpi-heading"><span>POPULAÇÃO IMPACTADA</span><span class="kpi-symbol orange">◉</span></div><strong id="kpiAffected">0</strong><span class="kpi-foot" id="kpiPct">0% DA POPULAÇÃO</span></div><div class="kpi"><div class="kpi-heading"><span>PAÍSES EM CRISE</span><span class="kpi-symbol blue">◎</span></div><strong id="kpiCountries">00 / 18</strong><span class="kpi-foot">REGIÕES MONITORADAS</span></div><div class="kpi"><div class="kpi-heading"><span>RESPOSTA CIENTÍFICA</span><span class="kpi-symbol green">⬡</span></div><strong id="kpiScience">0%</strong><div class="bar-track"><div class="bar-fill" id="scienceBar" style="width:0%"></div></div></div></section>
<div class="workspace"><aside class="sidebar left-sidebar"><div class="panel-heading"><span class="heading-square"></span> CONTROLE DO CENÁRIO <span class="panel-number">01</span></div><div class="scenario-panel"><div class="small-label">PROTOCOLO ATUAL</div><div class="scenario-badge"><span class="tiny-glow"></span> ZERO — SIMULAÇÃO</div><p>Defina o território onde o evento fictício começa e acompanhe as consequências.</p><div class="fine-divider"></div><div class="small-label">PAÍS DE ORIGEM</div><label class="field-wrap"><span class="flag" id="selectFlag">🇧🇷</span><select id="originSelect" aria-label="Escolher país de origem"></select><span class="field-chevron">⌄</span></label><div class="seed-row"><span>SEED DO CENÁRIO</span><span id="seedLabel">—</span></div><button id="openLabBtn" type="button" class="lab-launch"><span class="lab-launch-icon">⬡</span><span><strong>LABORATÓRIO ZERO</strong><small id="labLaunchDetail">PROTOCOLO ZERO · 0 MELHORIAS</small></span><span class="lab-launch-arrow">↗</span></button><button id="labAlert" type="button" class="lab-alert lab-alert-button" style="display:none"></button><button id="startBtn" class="primary-btn" type="button">▶ &nbsp; INICIAR SIMULAÇÃO ↗</button><div id="gameEnd" class="outcome-box" style="display:none"></div></div>
<div class="panel-heading secondary"><span class="heading-square"></span> CONTROLES RÁPIDOS <span class="panel-number">02</span></div><div class="quick-panel"><button type="button" id="saveBtn">◫ &nbsp; Salvar partida</button><button type="button" id="loadBtn">⇧ &nbsp; Carregar partida</button><button type="button" id="resetBtn">↺ &nbsp; Reiniciar cenário</button></div><div class="sidebar-note"><span class="note-mark">!</span><p>Parâmetros abstratos de gameplay. Sem representação de epidemiologia real.</p></div></aside>
<main class="mainstage"><div class="map-shell"><div class="map-topline"><span class="led-dot"></span> VISUALIZAÇÃO GLOBAL <span class="map-topline-right">18 NAÇÕES · MALHA ABSTRATA</span></div><div class="map-viewport"><svg class="world-svg" id="worldSvg" viewBox="0 0 1600 720" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa interativo do mundo; clique em um dos 18 países destacados"></svg><div class="map-controls"><button type="button" id="zoomIn" title="Zoom +">+</button><button type="button" id="zoomOut" title="Zoom −">−</button><button type="button" id="zoomReset" title="Centralizar">⌖</button></div><div class="map-coordinate" id="zoomLabel">ZOOM 1× · ARRASTE PARA EXPLORAR</div><div class="map-svg-tooltip" id="hoverLabel"></div><div class="map-overlay" id="mapOverlay"><small>01 / ESCOLHA A ORIGEM</small><strong>Clique em um país para começar</strong><span>Depois inicie no painel lateral.</span></div></div><div class="map-footer"><div class="map-legend"><span class="legend-dot base"></span> Inativo <span class="legend-dot low"></span> Inicial <span class="legend-dot medium"></span> Expansão <span class="legend-dot high"></span> Elevado</div><div class="map-footer-right">VISUALIZAÇÃO FICTÍCIA</div></div></div>
<div class="playback"><div class="playback-title"><span>CONTROLE TEMPORAL</span><strong id="timeLabel">DIA 000</strong></div><div class="playback-buttons"><button type="button" id="openLabQuick" class="lab-quick">⬡ LABORATÓRIO</button><button type="button" class="round-play" id="playBtn" aria-label="Pausar ou continuar">▶</button><button type="button" class="step-btn" id="stepBtn">⏭ &nbsp; PRÓXIMO DIA</button><span class="playback-separator"></span><span class="speed-caption">VELOCIDADE</span><div class="speed-group" id="speedGroup"><button type="button" data-speed="1" class="active">1×</button><button type="button" data-speed="5">5×</button><button type="button" data-speed="20">20×</button></div></div><div class="notification" id="notice" role="status" style="display:none"></div></div>
<div class="bottom-panels"><div class="trend-shell chart-container"><div class="trend-heading"><span>EVOLUÇÃO DO CENÁRIO</span><span id="trendCaption">00 DIAS</span></div><svg id="trendSvg" class="trend-svg" viewBox="0 0 700 120" preserveAspectRatio="none" role="img" aria-label="Evolução da crise no período"></svg></div><div class="news-shell"><div class="news-header"><span>BOLETIM GLOBAL</span><span id="newsCount" class="news-total">0 EVENTOS</span></div><div class="news-tabs" id="newsTabs"><button type="button" data-tab="all" class="active">TODOS</button><button type="button" data-tab="alerta">ALERTAS</button><button type="button" data-tab="pesquisa">CIÊNCIA</button><button type="button" data-tab="evento">EVENTOS</button></div><div class="news-list" id="newsList"></div></div></div>
<section class="intel-shell"><header class="intel-heading"><div><span class="intel-kicker">MÓDULO 03 / WORLD INTELLIGENCE</span><h2>Corrida científica <em>&amp; diplomacia</em></h2><p>Dezoito governos autônomos. Estratégias, decisões e custos observáveis.</p></div><span class="intel-live">● &nbsp; ANÁLISE ATIVA</span></header>
<div class="intel-summary"><div><small>LÍDER ATUAL</small><strong id="intelLeader">—</strong></div><div><small>CANAIS DE COOPERAÇÃO</small><strong id="intelCoop">00</strong></div><div><small>GOVERNOS MOBILIZADOS</small><strong id="intelMobilized">00</strong></div></div>
<div class="intel-leader-header"><span>CLASSIFICAÇÃO DE PESQUISA</span><span>PROGRESSO / 100%</span></div><div class="intel-ranking" id="intelRanking"></div><div class="intel-legend">◈ Clique na classificação para inspecionar o governo no painel regional.</div></section>
<section class="events-shell" aria-label="Crônicas globais e eventos causais">
<header class="events-heading"><div><span class="intel-kicker">MÓDULO 04 / GLOBAL EVENTS</span><h2>Crônicas <em>do mundo</em></h2><p>Gatilhos verificáveis, efeitos persistentes e desdobramentos por país.</p></div><div class="events-counter"><strong id="eventsActive">00</strong><span>EM CURSO</span></div></header>
<div class="events-controls"><span id="eventsTotal">0 REGISTROS</span><div id="eventsFilter"><button type="button" data-event-filter="all" class="active">TODOS</button><button type="button" data-event-filter="active">ATIVOS</button><button type="button" data-event-filter="country">PAÍS ATUAL</button></div></div>
<div id="eventsList" class="events-timeline"></div><footer class="events-footer">Impactos permanentes ficam no país. Modificadores temporários expiram automaticamente.</footer>
</section></main>
<aside class="sidebar right-sidebar"><div class="panel-heading"><span class="heading-square"></span> INTELIGÊNCIA REGIONAL <span class="panel-number">03</span></div><div class="country-panel"><div class="small-label">TERRITÓRIO SELECIONADO</div><h2 class="nation-title" id="nationTitle">—</h2><div id="nationDetail"></div></div><div class="model-note"><div class="model-title">MODELO DE MUNDO</div><p>Os 18 países estão ligados por uma rede ficcional. Selecione um para ver seu perfil e sua resposta.</p><div class="model-stat">18 <span>NAÇÕES</span><span class="slash">/</span> 01 <span>CENÁRIO</span></div></div></aside></div>
<footer class="page-footer"><span>PROJECT ZERO <b>/</b> EXPERIMENTO DE ESTRATÉGIA</span><span>SIMULAÇÃO FICTÍCIA · SEM VALOR PREDITIVO</span><span>V0.6.0 — ECONOMIA DE EVOLUÇÃO</span></footer></div></div>

<div id="labBackdrop" class="lab-backdrop" style="display:none" aria-hidden="true">
<section class="lab-modal" role="dialog" aria-modal="true" aria-labelledby="labTitle">
<header class="lab-header"><div class="lab-heading"><div class="lab-glyph">⬡</div><div><span class="lab-eyebrow">PROJECT ZERO / MÓDULO 02</span><h2 id="labTitle">Laboratório <em>Zero</em></h2><p>Configure seu protocolo e escolha como o cenário evolui.</p></div></div><button class="lab-close" id="labClose" type="button" aria-label="Fechar laboratório">✕</button></header>
<div class="lab-body"><div class="lab-config"><div class="lab-section-heading"><div><span>01 / CONFIGURAÇÃO</span><h3>Atributos de origem</h3></div><span class="lab-chip" id="labMode">EDITÁVEL</span></div>
<label class="lab-name-label" for="labAgentName">IDENTIFICADOR DO PROTOCOLO</label><input id="labAgentName" class="lab-name" maxlength="28" placeholder="Nome do protocolo">
<div class="lab-budget"><div><span>ORÇAMENTO INICIAL</span><strong id="labFree">2<small> / 8 livres</small></strong></div><div class="lab-budget-meter" id="labBudgetMeter"></div></div>
<div class="lab-attributes" id="labAttributes"></div><div class="lab-feedback"><span>RESULTADO DOS MODIFICADORES</span><div><span>Expansão</span><b id="labGrowth">—</b></div><div><span>Conexões</span><b id="labNetwork">—</b></div><div><span>Limiar de reação</span><b id="labSignal">—</b></div><div><span>Pesquisa mundial</span><b id="labScience">—</b></div><small>Efeitos passam a valer no próximo dia de simulação.</small></div></div>
<div class="lab-evolutions"><div class="lab-section-heading"><div><span>02 / EVOLUÇÃO</span><h3>Árvore de melhorias</h3></div><div class="lab-points"><span id="labPointsLabel">PONTOS DISPONÍVEIS</span><strong id="labPoints">00</strong></div></div>
<div class="lab-callout"><span>◈</span><p id="labNotice">Ganhe 2 pontos a cada 10 dias.</p></div><div class="lab-eligibility" id="labEligibility" aria-live="polite"></div>
<div class="lab-upgrades" id="labUpgrades"></div>
<div class="lab-tactics" aria-label="Ações táticas repetíveis"><div class="lab-tactics-header"><div><span>03 / DECISÕES TÁTICAS</span><h3>Aplicar pontos no mapa</h3></div><span>USOS REPETÍVEIS</span></div>
<p>As melhorias acima são únicas. Estas operações podem ser utilizadas várias vezes, respeitando o saldo e os limites do país escolhido.</p>
<label for="tacticTarget">TERRITÓRIO ALVO</label><select id="tacticTarget"></select><span class="lab-target-note" id="tacticTargetLabel"></span>
<div class="lab-tactic-grid" id="tacticGrid"></div><small class="lab-spending" id="tacticSpent"></small></div>
</div></div>
<footer class="lab-footer"><span>SIMULAÇÃO FICTÍCIA · ATRIBUTOS ABSTRATOS DE GAMEPLAY</span><button type="button" class="lab-done" id="labDone">VOLTAR AO MAPA →</button></footer></section></div>
<script>
'use strict';
const worldData=%%WORLD%%;
%%COUNTRIES%%
%%LAB_MODULE%%
%%INTEL_MODULE%%
%%EVENTS_MODULE%%
%%TACTICS_MODULE%%
%%ENGINE%%
%%OUTCOME_MODULE%%
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=n=>new Intl.NumberFormat('pt-BR').format(n);
const pct=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n)+'%';
const point=pos=>[(pos[0]+180)/360*1600,(85-pos[1])/145*720];
const ns='http://www.w3.org/2000/svg';
let game=createGame('BRA',Math.floor(Date.now()%2000000000));
let selected='BRA', playing=false, speed=1, timer=null, tab='all', eventFilter='all', zoom=1, center=[800,360], pointer=null, dragging=false, previousRun=null, seenOutcome=null, lastEvolutionPrompt=null;
const paths=new Map(),nodes=new Map(),links=[];
for(const c of COUNTRIES){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;$('originSelect').appendChild(option);}
function svgEl(tag,props){const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(props||{}))el.setAttribute(k,v);return el;}
function initMap(){
  const svg=$('worldSvg');
  const defs=svgEl('defs');const grad=svgEl('radialGradient',{id:'seaGradient'});grad.appendChild(svgEl('stop',{offset:'0','stop-color':'#142939'}));grad.appendChild(svgEl('stop',{offset:'1','stop-color':'#0a1523'}));defs.appendChild(grad);svg.appendChild(defs);
  svg.appendChild(svgEl('rect',{width:1600,height:720,fill:'url(#seaGradient)'}));
  for(let i=1;i<12;i++)svg.appendChild(svgEl('path',{d:`M${i*133.33} 0V720`,stroke:'#789bab','stroke-opacity':.11,'stroke-dasharray':'3 8'}));
  for(let i=1;i<7;i++)svg.appendChild(svgEl('path',{d:`M0 ${i*102.86}H1600`,stroke:'#789bab','stroke-opacity':.11,'stroke-dasharray':'3 8'}));
  for(const shape of worldData){const playable=COUNTRY_BY_ID[shape.id],path=svgEl('path',{d:shape.d,'fill-rule':'evenodd',class:'country '+(playable?'country-playable':'country-inactive')});
    if(playable){path.dataset.id=shape.id;path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label','Selecionar '+playable.name);path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCountry(shape.id);}});}
    const title=svgEl('title');title.textContent=playable?playable.name:shape.name;path.appendChild(title);svg.appendChild(path);if(playable)paths.set(shape.id,path);
  }
  const lineLayer=svgEl('g',{'pointer-events':'none','fill':'none','stroke-dasharray':'5 8'});svg.appendChild(lineLayer);
  for(const c of COUNTRIES)for(const to of c.links)if(c.id<to&&COUNTRY_BY_ID[to]){const a=point(c.position),b=point(COUNTRY_BY_ID[to].position),m=[(a[0]+b[0])/2,(a[1]+b[1])/2-Math.min(90,Math.abs(a[0]-b[0])*.12)];const path=svgEl('path',{d:`M${a[0]},${a[1]}Q${m[0]},${m[1]} ${b[0]},${b[1]}`,stroke:'#608ea8','stroke-width':1,'stroke-opacity':.13});lineLayer.appendChild(path);links.push({from:c.id,to,path});}
  const markerLayer=svgEl('g',{'pointer-events':'none'});svg.appendChild(markerLayer);
  for(const c of COUNTRIES){const [x,y]=point(c.position);const g=svgEl('g',{transform:`translate(${x} ${y})`}),halo=svgEl('circle',{r:11,fill:'none',stroke:'#ef9b72','stroke-width':1,'stroke-opacity':.0}),ring=svgEl('circle',{r:16,fill:'none',stroke:'#b7ef77','stroke-width':1.4,'stroke-dasharray':'3 4','stroke-opacity':0}),eventRing=svgEl('circle',{r:22,fill:'none',stroke:'#89d3ec','stroke-width':1.7,'stroke-dasharray':'4 5','stroke-opacity':0}),dot=svgEl('circle',{r:3.5,fill:'#89bacb',stroke:'#0b1a29','stroke-width':1.5});g.append(halo,eventRing,ring,dot);markerLayer.appendChild(g);nodes.set(c.id,{g,halo,eventRing,ring,dot});}
  svg.addEventListener('click',e=>{if(dragging){dragging=false;return;}const id=e.target.dataset.id;if(id)selectCountry(id);});
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer={x:e.clientX,y:e.clientY,cx:center[0],cy:center[1]};svg.setPointerCapture(e.pointerId);dragging=false;});
  svg.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(dx,dy)>4){dragging=true;const r=svg.getBoundingClientRect(),w=1600/zoom,h=720/zoom;center=[Math.max(w/2,Math.min(1600-w/2,pointer.cx-dx*w/r.width)),Math.max(h/2,Math.min(720-h/2,pointer.cy-dy*h/r.height))];setView();}});
  svg.addEventListener('pointerup',e=>{pointer=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);});svg.addEventListener('pointercancel',()=>{pointer=null;});
  svg.addEventListener('mouseover',e=>{const c=COUNTRY_BY_ID[e.target.dataset.id];if(c){$('hoverLabel').style.display='block';$('hoverLabel').textContent=c.flag+' '+c.name;}});
  svg.addEventListener('mouseout',e=>{if(e.target.dataset.id)$('hoverLabel').style.display='none';});
}
function setView(){const w=1600/zoom,h=720/zoom;center=[Math.max(w/2,Math.min(1600-w/2,center[0])),Math.max(h/2,Math.min(720-h/2,center[1]))];$('worldSvg').setAttribute('viewBox',`${center[0]-w/2} ${center[1]-h/2} ${w} ${h}`);$('zoomLabel').textContent='ZOOM '+zoom.toFixed(1)+'× · ARRASTE PARA EXPLORAR';}
function selectCountry(id){if(!COUNTRY_BY_ID[id])return;selected=id;if(game.phase==='setup')game=changeOrigin(game,id);render();}
const policies={normal:'Monitoramento',atencao:'Alerta preventivo',restricoes:'Restrições',emergencia:'Emergência'};
function render(){
 const stats=getWorldStats(game),country=COUNTRY_BY_ID[selected],s=game.countries[selected],started=game.phase!=='setup',ended=!['setup','running'].includes(game.phase);
 $('kpiPopulation').textContent=pct(stats.population/1e9).replace('%',' bi');$('kpiAffected').textContent=fmt(stats.affected);$('kpiPct').textContent=pct(stats.affectedPct)+' DA POPULAÇÃO';$('kpiCountries').textContent=String(stats.activeCountries).padStart(2,'0')+' / 18';$('kpiScience').textContent=pct(stats.research);$('scienceBar').style.width=stats.research+'%';
 $('headingDay').textContent=String(game.day).padStart(3,'0');$('timeLabel').textContent='DIA '+String(game.day).padStart(3,'0');$('headingStatus').textContent=ended?'ENCERRADO':playing?'EM EXECUÇÃO':started?'PAUSADO':'AGUARDANDO';
 $('labLaunchDetail').textContent=(game.agent.name||'SEM NOME')+' · '+game.agent.purchased.length+' MELHORIAS';$('labAlert').style.display=game.agent.points>0?'block':'none';$('labAlert').textContent='◆ '+game.agent.points+(ended?' pontos não utilizados · partida encerrada':' pontos · CLIQUE PARA EVOLUIR');
 $('seedLabel').textContent='#'+game.seed;$('originSelect').value=game.origin;$('originSelect').disabled=started;$('selectFlag').textContent=COUNTRY_BY_ID[game.origin].flag;
 $('startBtn').style.display=started?'none':'flex';$('playBtn').disabled=!started||ended;$('stepBtn').disabled=!started||ended;$('playBtn').textContent=playing?'Ⅱ':'▶';$('mapOverlay').style.display=started?'none':'grid';
 $('gameEnd').style.display=ended?'grid':'none';$('gameEnd').innerHTML=ended?`<strong>${game.phase==='contained'?'CONTENÇÃO CIENTÍFICA':'LIMITE CRÍTICO ATINGIDO'}</strong><span>Encerrado no dia ${game.day}</span><button class="outline-btn" type="button" data-outcome-action="open">VER RELATÓRIO FINAL ↗</button>`:'';
 if(ended&&seenOutcome!==game.seed+':'+game.day){seenOutcome=game.seed+':'+game.day;showOutcome(true);}
 $('nationTitle').innerHTML=`<span>${country.flag}</span> ${country.name}`;
 const attrs=[['CONECTIVIDADE',country.connectivity,'#75cbda'],['CIÊNCIA',country.science,'#b8eb73'],['ECONOMIA',country.economy,'#e9b078']];
 $('nationDetail').innerHTML=`<div class="country-metrics"><div class="region-box"><span>POPULAÇÃO SIMULADA</span><strong>${fmt(country.population)}</strong></div><div class="region-box"><span>IMPACTADOS (${pct(s.affected/country.population*100)})</span><strong class="hot">${fmt(s.affected)}</strong></div><div class="region-box"><span>NOVOS IMPACTOS / DIA</span><strong>${fmt(s.newlyAffected)}</strong></div></div><div class="country-attrs">${attrs.map(([label,value,color])=>`<div class="attr"><header><span>${label}</span><b>${value}/100</b></header><div class="bar-bg"><div class="bar-progress" style="width:${value}%;background:${color}"></div></div></div>`).join('')}</div><div class="country-policy"><span class="small-label">POSIÇÃO DO GOVERNO</span><div class="policy-status policy-${s.policy}">◈ &nbsp; ${policies[s.policy]}</div></div><div class="country-research"><div><span class="small-label">PESQUISA LOCAL</span><strong>${pct(s.research)}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${s.research}%"></div></div></div>
<div class="gov-detail"><div class="gov-caption">INTELIGÊNCIA DE GOVERNO <b>AI RULES / V0.4</b></div>
<div class="gov-doctrine"><small>PERFIL DE GOVERNO</small><strong>${esc(DOCTRINES[COUNTRY_DOCTRINE[selected]].label)}</strong><span>${esc(DOCTRINES[COUNTRY_DOCTRINE[selected]].description)}</span></div>
<div class="gov-current"><small>DECISÃO ATUAL · ATÉ O DIA ${s.government.until}</small><strong>${esc(ACTIONS[s.government.action].label)}</strong><span>${esc(ACTIONS[s.government.action].description)}</span></div>
<div class="gov-reason"><span>POR QUE ESSA DECISÃO?</span><p>${esc(s.government.reason)}</p></div>
${s.government.partner?`<div class="gov-partner">↗ CANAL CIENTÍFICO: ${esc(COUNTRY_BY_ID[s.government.partner].name)}</div>`:''}
${game.globalEvents.filter(e=>e.countryId===selected && game.day<e.expiresDay).map(e=>`<div class="gov-active-events"><strong>◈ EVENTO ATIVO</strong><span>${esc(e.title)} · até o dia ${e.expiresDay}</span></div>`).join('')}
<div class="gov-indicators">${[['PRESSÃO SOCIAL',s.government.pressure],['ORÇAMENTO',s.government.budget],['ESTABILIDADE',s.government.stability]].map(([key,val])=>`<div class="gov-metric"><div><span>${key}</span><b>${Math.round(val)}/100</b></div><div class="gov-meter"><i style="width:${val}%"></i></div></div>`).join('')}</div><span class="gov-disclaimer">Parâmetros e reações fictícios, exclusivos deste jogo.</span></div>`;
 for(const c of COUNTRIES){const state=game.countries[c.id],ratio=state.affected/c.population,level=ratio===0?0:ratio<.0005?1:ratio<.01?2:ratio<.075?3:4,p=paths.get(c.id),node=nodes.get(c.id);p.setAttribute('class','country country-playable '+(level?'level-'+level:'')+(selected===c.id?' country-selected':''));node.halo.setAttribute('stroke-opacity',state.affected>0?'.8':'0');node.ring.setAttribute('stroke-opacity',selected===c.id?'1':'0');node.eventRing.setAttribute('stroke-opacity',game.globalEvents.some(e=>e.countryId===c.id&&game.day<e.expiresDay)?'.92':'0');node.dot.setAttribute('fill',state.affected?'#ffa781':selected===c.id?'#c9f98b':'#89bacb');node.dot.setAttribute('r',selected===c.id?'5.6':'3.5');}
 for(const link of links){const active=game.countries[link.from].affected>0&&game.countries[link.to].affected>0;link.path.setAttribute('stroke',active?'#f0a16f':'#608ea8');link.path.setAttribute('stroke-opacity',active?'.55':'.13');}
 $('intelLeader').textContent=COUNTRY_BY_ID[stats.leader].flag+' '+COUNTRY_BY_ID[stats.leader].name;
 $('intelCoop').textContent=String(stats.cooperating).padStart(2,'0');
 $('intelMobilized').textContent=String(stats.mobilized).padStart(2,'0');
 $('intelRanking').innerHTML=[...COUNTRIES].sort((a,b)=>game.countries[b.id].research-game.countries[a.id].research||b.science-a.science).slice(0,5).map((c,i)=>`<button type="button" class="intel-rank ${selected===c.id?'intel-current':''}" data-country="${c.id}"><span class="intel-position">${String(i+1).padStart(2,'0')}</span><span class="intel-rank-name">${c.flag} ${esc(c.name)}<small>${esc(DOCTRINES[COUNTRY_DOCTRINE[c.id]].label)}</small></span><span class="intel-rank-bar"><i style="width:${game.countries[c.id].research}%"></i></span><strong>${pct(game.countries[c.id].research)}</strong></button>`).join('');
 renderGlobalEvents();
 $('newsCount').textContent=game.news.length+' EVENTOS';const news=game.news.filter(n=>tab==='all'||n.category===tab).slice(0,6);$('newsList').innerHTML=news.length?news.map(n=>`<div class="news-item"><span class="news-symbol news-${n.category}">●</span><div><span class="news-tag">${esc(n.category.toUpperCase())} · DIA ${n.day}</span><p>${esc(n.text)}</p></div></div>`).join(''):'<div class="empty-news">Sem eventos. Inicie a simulação para acompanhar as notícias.</div>';
 const arr=game.history,max=Math.max(1,...arr.map(h=>h.affected)),pts=arr.length>1?arr.map((h,i)=>(i/(arr.length-1)*700).toFixed(1)+','+(112-h.affected/max*96).toFixed(1)).join(' '):'0,112 700,112';$('trendSvg').innerHTML=`<defs><linearGradient id="trendBg" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b2ee77" stop-opacity=".25"/><stop offset="1" stop-color="#b2ee77" stop-opacity=".01"/></linearGradient></defs><path d="M0 25H700M0 60H700M0 95H700" stroke="#738e99" stroke-dasharray="3 7" stroke-opacity=".2"/><polygon points="0,120 ${pts} 700,120" fill="url(#trendBg)"/><polyline points="${pts}" fill="none" stroke="#b8ed73" stroke-width="2.5"/>`; $('trendCaption').textContent=game.day+' DIAS';
}
function renderGlobalEvents(){
 const active=game.globalEvents.filter(e=>game.day<e.expiresDay);
 $('eventsActive').textContent=String(active.length).padStart(2,'0');
 $('eventsTotal').textContent=game.globalEvents.length+' REGISTROS · '+game.globalEvents.filter(e=>e.kind==='descoberta_cientifica').length+' DESCOBERTAS';
 const eligible=game.globalEvents.filter(e=>eventFilter==='all'||eventFilter==='active'&&game.day<e.expiresDay||eventFilter==='country'&&e.countryId===selected).slice(0,9);
 const labels={crise_economica:'ECONOMIA',instabilidade_politica:'POLÍTICA',descoberta_cientifica:'CIÊNCIA',ruptura_diplomatica:'DIPLOMACIA'};
 $('eventsList').innerHTML=eligible.length?eligible.map(e=>{
  const ongoing=game.day<e.expiresDay, c=COUNTRY_BY_ID[e.countryId];
  return `<article class="world-event event-${e.kind}"><div class="event-side"><span class="event-day">DIA ${String(e.day).padStart(3,'0')}</span><span class="event-type event-type-${e.kind}">${labels[e.kind]}</span></div><div class="event-detail"><div class="event-title-row"><h3>${esc(e.title)}</h3><span class="${ongoing?'event-active':'event-resolved'}">${ongoing?'ATIVO · '+(e.expiresDay-game.day)+'D':'ENCERRADO'}</span></div><button class="event-country" data-country="${e.countryId}" type="button">${esc(c.flag)} ${esc(c.name)} ↗</button><p class="event-cause"><b>GATILHO</b> ${esc(e.cause)}</p><p class="event-consequence"><b>EFEITO</b> ${esc(e.consequence)}</p></div></article>`;
 }).join(''):'<div class="events-empty">'+(eventFilter==='country'?'Sem eventos para o país selecionado.':eventFilter==='active'?'Nenhum efeito temporário ativo.':'Nenhum evento ainda. Avance os dias e observe as decisões dos governos.')+'</div>';
}
function message(s){$('notice').textContent=s;$('notice').style.display='block';}
function promptEvolution(){
 if(game.phase!=='running'||game.day===0||game.day%10!==0||game.agent.points<2)return;
 const key=game.seed+':'+game.origin+':'+game.day;
 if(lastEvolutionPrompt===key)return;
 lastEvolutionPrompt=key;playing=false;restartTimer();message('Dia '+game.day+': +2 pontos. Escolha uma melhoria ou ação tática.');toggleLab(true);
}
function restartTimer(){if(timer)clearInterval(timer);timer=null;if(!playing||game.phase!=='running')return;timer=setInterval(()=>{game=advanceDay(game);if(game.phase!=='running'){playing=false;restartTimer();}render();promptEvolution();},speed===1?850:speed===5?170:50);}
$('startBtn').onclick=()=>{game=startGame(game);playing=true;restartTimer();message('Simulação iniciada.');render();};
$('playBtn').onclick=()=>{if(game.phase!=='running')return;playing=!playing;restartTimer();render();};
$('stepBtn').onclick=()=>{if(game.phase!=='running')return;playing=false;restartTimer();game=advanceDay(game);render();promptEvolution();};
$('resetBtn').onclick=()=>{if(game.phase!=='setup'&&!confirm('Descartar o progresso não salvo?'))return;playing=false;restartTimer();previousRun=null;seenOutcome=null;lastEvolutionPrompt=null;showOutcome(false);game=createGame(selected,Math.floor(Date.now()%2000000000));message('Novo cenário pronto.');render();};
$('saveBtn').onclick=()=>{try{localStorage.setItem('project-zero-save-v1',JSON.stringify(game));message('Partida salva no navegador.');}catch{message('Falha ao salvar neste navegador.');}};
$('loadBtn').onclick=()=>{try{const stored=localStorage.getItem('project-zero-save-v1');if(!stored){message('Nenhuma partida salva.');return;}const parsed=JSON.parse(stored);const restored=restoreGame(parsed);if(!restored){message('Save incompatível.');return;}playing=false;restartTimer();previousRun=null;seenOutcome=null;lastEvolutionPrompt=null;showOutcome(false);game=restored;selected=game.origin;message('Partida restaurada.');render();}catch{message('Não foi possível carregar.');}};
$('originSelect').onchange=e=>selectCountry(e.target.value);
$('intelRanking').onclick=e=>{const btn=e.target.closest('[data-country]');if(btn)selectCountry(btn.dataset.country);};
$('speedGroup').onclick=e=>{const btn=e.target.closest('[data-speed]');if(!btn)return;speed=Number(btn.dataset.speed);for(const b of $('speedGroup').querySelectorAll('button'))b.classList.toggle('active',b===btn);restartTimer();};
$('newsTabs').onclick=e=>{const btn=e.target.closest('[data-tab]');if(!btn)return;tab=btn.dataset.tab;for(const b of $('newsTabs').querySelectorAll('button'))b.classList.toggle('active',b===btn);render();};
$('eventsFilter').onclick=e=>{const btn=e.target.closest('[data-event-filter]');if(!btn)return;eventFilter=btn.dataset.eventFilter;for(const b of $('eventsFilter').querySelectorAll('button'))b.classList.toggle('active',b===btn);render();};
$('eventsList').onclick=e=>{const btn=e.target.closest('[data-country]');if(btn)selectCountry(btn.dataset.country);};
$('zoomIn').onclick=()=>{zoom=Math.min(3.4,zoom+.4);setView();};$('zoomOut').onclick=()=>{zoom=Math.max(1,zoom-.4);setView();};$('zoomReset').onclick=()=>{zoom=1;center=[800,360];setView();};

let labVisible=false;
const ratio=n=>((n-1)*100>=0?'+':'')+Math.round((n-1)*100)+'%';
function renderLab(){
  const setup=game.phase==='setup',a=game.agent.attributes,free=freeAttributePoints(a),mod=getLabModifiers(game);
  $('labMode').textContent=setup?'EDITÁVEL':'BLOQUEADO';$('labAgentName').value=game.agent.name;$('labAgentName').disabled=!setup;
  $('labPoints').textContent=String(game.agent.points).padStart(2,'0');$('labFree').innerHTML=free+'<small> / 8 livres</small>';
 $('labPointsLabel').textContent=game.phase==='running'?'PONTOS DISPONÍVEIS':setup?'PONTOS FUTUROS':'SALDO FINAL (BLOQUEADO)';
 $('labNotice').textContent=setup?'Distribua os 8 pontos iniciais antes de começar. Os pontos de evolução começam no dia 10.':game.phase==='running'?'O relógio pausa a cada 10 dias para você gastar 2 pontos; use também as ações repetíveis abaixo.':'A partida terminou. O saldo é histórico. Repita a mesma seed para tentar outra estratégia.';
  $('labBudgetMeter').innerHTML=Array.from({length:ATTRIBUTE_BUDGET},(_,i)=>'<i class="'+(i<ATTRIBUTE_BUDGET-free?'filled':'')+'"></i>').join('');
  $('labGrowth').textContent=ratio(mod.growthFactor);$('labNetwork').textContent=ratio(mod.networkFactor);$('labSignal').textContent=ratio(mod.signalFactor);$('labScience').textContent=ratio(mod.scienceFactor);
  $('labAttributes').innerHTML=ATTRIBUTE_IDS.map(id=>{const d=ATTRIBUTES[id],n=a[id];return `<div class="lab-attribute"><div class="lab-attribute-head"><div><span class="lab-dot ${d.color}"></span><strong>${esc(d.title)}</strong></div><span>NÍVEL ${n}/${ATTRIBUTE_MAX}</span></div><p>${esc(d.description)}</p><div class="lab-attribute-controls"><button type="button" data-attr="${id}" data-delta="-1" aria-label="Diminuir ${esc(d.title)}" ${!setup||n===0?'disabled':''}>−</button><div class="lab-level-meter">${Array.from({length:ATTRIBUTE_MAX},(_,i)=>'<i class="'+(i<n?d.color:'')+'"></i>').join('')}</div><button type="button" data-attr="${id}" data-delta="1" aria-label="Aumentar ${esc(d.title)}" ${!setup||n===ATTRIBUTE_MAX||!free?'disabled':''}>+</button></div><small>${esc(d.impact)}</small></div>`;}).join('');
  $('labUpgrades').innerHTML=UPGRADES.map((up,i)=>{const check=availableUpgrade(game,up.id),owned=game.agent.purchased.includes(up.id);return `<article class="lab-upgrade ${owned?'owned':check.ok?'lab-available':''}"><div class="lab-upgrade-head"><span class="lab-upgrade-symbol">${String(i+1).padStart(2,'0')}</span><span class="lab-upgrade-cost">${up.cost} PT</span></div><h4>${esc(up.title)}</h4><p>${esc(up.description)}</p><div class="lab-upgrade-effect">↑ ${esc(up.effect)}</div>${up.tradeoff?`<div class="lab-upgrade-tradeoff">↔ ${esc(up.tradeoff)}</div>`:''}<div class="lab-upgrade-requirement">REQUISITO: ${esc(ATTRIBUTES[up.requires].title.toUpperCase())} ${up.minLevel}+</div><button type="button" class="lab-buy ${owned?'purchased':''}" data-upgrade="${up.id}" ${!check.ok?'disabled':''}>${owned?'✓ ATIVADA':check.ok?'ATIVAR MELHORIA':esc(check.reason.toUpperCase())}</button></article>`;}).join('');
  $('labEligibility').style.display=game.phase==='running'?'block':'none';
  $('labEligibility').textContent='◈ '+UPGRADES.filter(u=>availableUpgrade(game,u.id).ok).length+' melhorias e '+TACTICS.filter(t=>availableTactic(game,t.id,selected).ok).length+' ações táticas disponíveis agora.';
  $('tacticTarget').innerHTML=COUNTRIES.map(c=>`<option value="${c.id}">${esc(c.flag)} ${esc(c.name)}</option>`).join('');
  $('tacticTarget').value=selected;$('tacticTarget').disabled=game.phase!=='running';
  $('tacticTargetLabel').textContent=COUNTRY_BY_ID[selected].flag+' '+COUNTRY_BY_ID[selected].name+' · '+(game.countries[selected].affected>0?'Em atividade':'Sem atividade');
  $('tacticSpent').textContent='Total gasto em ações: '+game.agent.spentTactics+' PT. Regras fictícias.';
  $('tacticGrid').innerHTML=TACTICS.map(t=>{const check=availableTactic(game,t.id,selected);return `<article class="lab-tactic"><div class="lab-tactic-title"><strong>${esc(t.title)}</strong><span>${t.cost} PT</span></div><p>${esc(t.description)}</p><small>${esc(t.effect)}</small><button type="button" data-tactic="${t.id}" ${!check.ok?'disabled':''}>${check.ok?'APLICAR AGORA':esc(check.reason.toUpperCase())}</button></article>`;}).join('');
}
function toggleLab(show){labVisible=show;if(show){playing=false;restartTimer();renderLab();}$('labBackdrop').style.display=show?'flex':'none';$('labBackdrop').setAttribute('aria-hidden',show?'false':'true');if(show)$('labClose').focus();render();}
$('labAlert').onclick=()=>toggleLab(true);$('openLabBtn').onclick=()=>toggleLab(true);$('openLabQuick').onclick=()=>toggleLab(true);$('labClose').onclick=()=>toggleLab(false);$('labDone').onclick=()=>toggleLab(false);
$('labBackdrop').onmousedown=e=>{if(e.target===$('labBackdrop'))toggleLab(false);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&labVisible)toggleLab(false);});
$('labAgentName').oninput=e=>{game=setAgentName(game,e.target.value);};
$('labAttributes').onclick=e=>{const btn=e.target.closest('[data-attr]');if(!btn||btn.disabled)return;game=adjustAttribute(game,btn.dataset.attr,Number(btn.dataset.delta));renderLab();};
$('labUpgrades').onclick=e=>{const btn=e.target.closest('[data-upgrade]');if(!btn||btn.disabled)return;game=buyUpgrade(game,btn.dataset.upgrade);renderLab();render();};
$('tacticTarget').onchange=e=>{if(game.phase!=='running'||!COUNTRY_BY_ID[e.target.value])return;selected=e.target.value;renderLab();render();};
$('tacticGrid').onclick=e=>{const btn=e.target.closest('[data-tactic]');if(!btn||btn.disabled)return;game=applyTactic(game,btn.dataset.tactic,selected);renderLab();render();};

const resultBackdrop=document.createElement('div');
resultBackdrop.id='resultBackdrop';resultBackdrop.className='result-backdrop';resultBackdrop.style.display='none';document.body.appendChild(resultBackdrop);
function showOutcome(visible){
 if(!visible){resultBackdrop.style.display='none';resultBackdrop.innerHTML='';return;}
 const current=summarizeRun(game);if(!current)return;
 const milestones=buildMilestones(game),victory=current.outcome==='overwhelmed',same=comparableRuns(previousRun,current);
 resultBackdrop.innerHTML=`<section class="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
 <header class="result-topline"><span>PROJECT ZERO / RELATÓRIO DE MISSÃO <b>V0.6</b></span><button class="result-close" type="button" data-outcome-action="close" aria-label="Fechar resultado">✕</button></header>
 <div class="result-hero ${victory?'result-success':'result-containment'}"><span class="result-eyebrow">CENÁRIO ENCERRADO · DIA ${current.day} · SEED #${current.seed}</span><h2 id="result-title">${victory?'Limite crítico atingido.':'Contenção científica concluída.'}</h2><p>${victory?'O cenário ultrapassou 70% de impacto antes da conclusão da pesquisa científica.':'A pesquisa global alcançou 100% antes que o cenário atingisse o limite crítico.'}</p><span class="result-origin">${COUNTRY_BY_ID[current.origin].flag} Origem: ${esc(COUNTRY_BY_ID[current.origin].name)}</span></div>
 <div class="result-scroll"><div class="result-kpis"><div><span>DIAS DE PARTIDA</span><strong>${current.day}</strong></div><div><span>POPULAÇÃO IMPACTADA</span><strong>${pct(current.affectedPct)}</strong></div><div><span>PESQUISA GLOBAL</span><strong>${pct(current.research)}</strong></div><div><span>EVOLUÇÕES / GASTO TÁTICO</span><strong>${current.upgrades} / ${current.tacticsSpent} PT</strong></div></div>
 <div class="result-section-title"><h3>Marcos da partida</h3><span>${milestones.length} registros calculados</span></div><ol class="result-milestones">${milestones.map(m=>`<li class="result-milestone-${m.category}"><span>DIA ${String(m.day).padStart(3,'0')}</span><b>${esc(m.label)}</b></li>`).join('')}</ol>
 <div class="result-compare"><div class="result-section-title"><h3>Comparar estratégias</h3><span>${same?'MESMA SEED E CONFIGURAÇÃO':'AGUARDANDO REPARTIDA COMPARÁVEL'}</span></div>${same&&previousRun?`<div class="result-comparison-grid"><div><span>DIAS ATÉ O DESFECHO</span><b>${previousRun.day} → ${current.day}</b><small>${current.day-previousRun.day>=0?'+':''}${current.day-previousRun.day} dias</small></div><div><span>POPULAÇÃO IMPACTADA</span><b>${pct(previousRun.affectedPct)} → ${pct(current.affectedPct)}</b><small>${pct(current.affectedPct-previousRun.affectedPct)} de diferença</small></div><div><span>RESULTADO</span><b>${previousRun.outcome===current.outcome?'Mesmo desfecho':'Desfecho diferente'}</b></div></div>`:'<p>Repita a mesma seed, país e atributos iniciais. As escolhas de melhorias poderão mudar o resultado da próxima tentativa.</p>'}</div>
 <p class="result-disclaimer">Cronologia baseada nos marcos e eventos que permanecem no histórico limitado. Repetir a seed não reproduz automaticamente as decisões anteriores. Simulação inteiramente fictícia.</p></div>
 <footer class="result-actions"><button type="button" class="result-secondary" data-outcome-action="close">EXPLORAR MAPA</button><button type="button" class="result-secondary" data-outcome-action="new">NOVA SEED</button><button type="button" class="result-primary" data-outcome-action="repeat">↻ REPETIR MESMA SEED</button></footer></section>`;
 resultBackdrop.style.display='flex';resultBackdrop.querySelector('.result-close').focus();
}
resultBackdrop.onclick=e=>{
 const btn=e.target.closest('[data-outcome-action]');
 if(!btn){if(e.target===resultBackdrop)showOutcome(false);return;}
 const action=btn.dataset.outcomeAction;
 if(action==='close'){showOutcome(false);return;}
 if(action==='new'){
  playing=false;restartTimer();previousRun=null;seenOutcome=null;lastEvolutionPrompt=null;showOutcome(false);game=createGame(game.origin,Math.floor(Date.now()%2000000000));selected=game.origin;message('Nova seed pronta.');render();return;
 }
 if(action==='repeat'){
  const result=summarizeRun(game);if(!result)return;
  playing=false;restartTimer();previousRun=result;seenOutcome=null;lastEvolutionPrompt=null;game=repeatSeed(game);selected=game.origin;showOutcome(false);render();toggleLab(true);
 }
};
$('gameEnd').onclick=e=>{if(e.target.closest('[data-outcome-action="open"]'))showOutcome(true);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&resultBackdrop.style.display==='flex')showOutcome(false);});

initMap();render();
</script></body></html>'''
html=html.replace('%%CSS%%',css).replace('%%COUNTRIES%%',countries).replace('%%LAB_MODULE%%',lab).replace('%%INTEL_MODULE%%',intel).replace('%%EVENTS_MODULE%%',events).replace('%%TACTICS_MODULE%%',tactics).replace('%%ENGINE%%',engine).replace('%%OUTCOME_MODULE%%',outcome).replace('%%WORLD%%',world)
out=root/'preview-offline.html';out.write_text(html,encoding='utf-8')
print(out, out.stat().st_size,'bytes')
