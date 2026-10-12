import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import world from '../data/world.json';
import { COUNTRIES, COUNTRY_BY_ID } from '../data/countries';
import type { GameState } from '../engine/simulation';

const WIDTH=1600;
const HEIGHT=720;
const xy=([lon,lat]: readonly [number,number]): [number,number] => [((lon+180)/360)*WIDTH, ((85-lat)/145)*HEIGHT];
const clamp = (value:number,min:number,max:number)=>Math.max(min,Math.min(value,max));
const originMarker='M-5,0L0,-8L5,0L0,8Z';

export interface WorldMapProps {
  game: GameState;
  selected: string;
  onSelect: (id:string)=>void;
}

export function WorldMap({game,selected,onSelect}:WorldMapProps) {
  const [zoom,setZoom]=useState(1);
  const [center,setCenter]=useState<[number,number]>([WIDTH/2,HEIGHT/2]);
  const [hovered,setHovered]=useState<string|null>(null);
  const mapRef=useRef<SVGSVGElement>(null);
  const drag=useRef<{x:number;y:number;cx:number;cy:number;distance:number}|null>(null);
  const suppressClick=useRef(false);
  const viewW=WIDTH/zoom;
  const viewH=HEIGHT/zoom;
  const x=clamp(center[0]-viewW/2,0,WIDTH-viewW);
  const y=clamp(center[1]-viewH/2,0,HEIGHT-viewH);

  const zoomTo=(newZoom:number)=> {
    const z=clamp(newZoom,1,3.4);
    setZoom(z);
    setCenter([clamp(center[0],WIDTH/(2*z),WIDTH-WIDTH/(2*z)),clamp(center[1],HEIGHT/(2*z),HEIGHT-HEIGHT/(2*z))]);
  };
  const onPointerDown=(e:PointerEvent<SVGSVGElement>)=> {
    if(e.button!==0) return;
    drag.current={x:e.clientX,y:e.clientY,cx:center[0],cy:center[1],distance:0};
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove=(e:PointerEvent<SVGSVGElement>)=>{
    const d=drag.current;
    const bounds=mapRef.current?.getBoundingClientRect();
    if(!d || !bounds) return;
    d.distance=Math.max(d.distance,Math.hypot(e.clientX-d.x,e.clientY-d.y));
    if(d.distance>4) {
      setCenter([
        clamp(d.cx-(e.clientX-d.x)*viewW/bounds.width,viewW/2,WIDTH-viewW/2),
        clamp(d.cy-(e.clientY-d.y)*viewH/bounds.height,viewH/2,HEIGHT-viewH/2),
      ]);
    }
  };
  const onPointerUp=(e:PointerEvent<SVGSVGElement>)=>{
    if(drag.current?.distance && drag.current.distance>4) suppressClick.current=true;
    drag.current=null;
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const showCountry=(id:string)=>{
    if(suppressClick.current){suppressClick.current=false;return;}
    onSelect(id);
  };
  const lines=COUNTRIES.flatMap(country=>country.links.filter(id=>country.id<id && COUNTRY_BY_ID[id]).map(id=>[country.id,id] as const));

  return (
    <div className="map-shell">
      <div className="map-topline"><span className="led-dot"/> VISUALIZAÇÃO GLOBAL <span className="map-topline-right">18 REGIÕES MONITORADAS · MALHA ABSTRATA</span></div>
      <div className="map-viewport">
        <svg
          ref={mapRef}
          className="world-svg"
          viewBox={`${x} ${y} ${viewW} ${viewH}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={e=>{if(suppressClick.current){suppressClick.current=false;e.stopPropagation();}}}
          role="img"
          aria-label="Mapa do mundo, países monitorados clicáveis"
        >
          <defs>
            <radialGradient id="oceanLight"><stop stopColor="#132636"/><stop offset="1" stopColor="#0a1523"/></radialGradient>
            <pattern id="seaNoise" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 0H40M0 0V40" fill="none" stroke="#84a9ba" strokeOpacity=".085" strokeWidth=".55"/></pattern>
            <filter id="glow"><feGaussianBlur stdDeviation="6"/></filter>
          </defs>
          <rect width="1600" height="720" fill="url(#oceanLight)"/>
          <rect width="1600" height="720" fill="url(#seaNoise)"/>
          <g className="meridians" stroke="#6f94a7" strokeOpacity=".10" strokeDasharray="3 8" fill="none">
            {Array.from({length:11},(_,i)=><path key={`v${i}`} d={`M${(i+1)*133.33} 0V720`}/>)}
            {Array.from({length:6},(_,i)=><path key={`h${i}`} d={`M0 ${(i+1)*102.86}H1600`}/>)}
          </g>
          <g>
            {world.map(country=>{
              const playable=COUNTRY_BY_ID[country.id];
              const st=playable && game.countries[country.id];
              const intensity=st && playable ? st.affected/playable.population : 0;
              const level=intensity===0?0:intensity<.0005?1:intensity<.01?2:intensity<.075?3:4;
              return <path
                key={`${country.id}-${country.name}`}
                d={country.d}
                fillRule="evenodd"
                className={`country ${playable?'country-playable':'country-inactive'} ${level?`level-${level}`:''} ${selected===country.id?'country-selected':''}`}
                onMouseEnter={()=>{if(playable)setHovered(country.id);}}
                onMouseLeave={()=>setHovered(null)}
                onClick={playable?()=>showCountry(country.id):undefined}
                onKeyDown={playable?(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(country.id);}}:undefined}
                tabIndex={playable?0:undefined}
                role={playable?'button':undefined}
                aria-label={playable?`Selecionar ${playable.name}`:undefined}
              ><title>{playable?`${playable.name} — clique para detalhes`:country.name}</title></path>;
            })}
          </g>
          <g className="network-links" pointerEvents="none" fill="none" strokeDasharray="5 8">
            {lines.map(([from,to])=>{
              const a=xy(COUNTRY_BY_ID[from].position);
              const b=xy(COUNTRY_BY_ID[to].position);
              const active=game.countries[from].affected>0 && game.countries[to].affected>0;
              const midX=(a[0]+b[0])/2;
              const midY=(a[1]+b[1])/2-Math.min(90,Math.abs(a[0]-b[0])*.12);
              return <path key={`${from}-${to}`} d={`M${a[0]},${a[1]}Q${midX},${midY} ${b[0]},${b[1]}`} stroke={active?'#e7a56e':'#5b91ab'} strokeWidth={active?1.7:.75} opacity={active?.62:.15}/>;
            })}
          </g>
          <g pointerEvents="none">
            {COUNTRIES.map(country=>{
              const st=game.countries[country.id];
              const [px,py]=xy(country.position);
              const active=st.affected>0;
              const chosen=selected===country.id;
              const worldEvent=game.globalEvents.some(e=>e.countryId===country.id&&game.day<e.expiresDay);
              return <g key={country.id} transform={`translate(${px} ${py})`}>
                {active&&<circle r={16} fill="#eb7d67" opacity=".28" filter="url(#glow)"/>}
                {active&&<circle r={10} fill="none" stroke="#ff9e80" strokeOpacity=".6" strokeWidth=".9" className="map-pulse"/>}
                {worldEvent&&<circle r={22} fill="none" stroke="#89d3ec" opacity=".92" strokeWidth="1.7" strokeDasharray="4 5"/>}
                {chosen&&<circle r={16} fill="none" stroke="#b7f56b" strokeWidth="1.4" strokeDasharray="3 4"/>}
                <circle r={chosen?5.4:active?4.3:3.2} fill={active?'#ffa07e':chosen?'#baf675':'#7fb7d1'} stroke="#0d1a26" strokeWidth="1.6"/>
                {game.origin===country.id&&<path d={originMarker} fill="none" stroke="#caff80" opacity=".95" strokeWidth="1.4" transform="translate(0,-14) scale(.75)"/>}
              </g>;
            })}
          </g>
          <g pointerEvents="none" fontFamily="monospace" fontSize="13" letterSpacing="1.5" fill="#7491a5" opacity=".72">
            <text x="150" y="240">PACÍFICO</text><text x="640" y="390">ATLÂNTICO</text><text x="1165" y="560">ÍNDICO</text>
          </g>
        </svg>
        <div className="map-controls" aria-label="Controles de zoom">
          <button type="button" onClick={()=>zoomTo(zoom+.4)} aria-label="Aproximar">+</button>
          <button type="button" onClick={()=>zoomTo(zoom-.4)} aria-label="Afastar">−</button>
          <button type="button" onClick={()=>{setZoom(1);setCenter([800,360]);}} aria-label="Recentralizar" title="Visão global">⌖</button>
        </div>
        <div className="map-coordinate">ZOOM {zoom.toFixed(1)}× <span>·</span> ARRASTE PARA EXPLORAR</div>
        {hovered && <div className="hover-chip">{COUNTRY_BY_ID[hovered].flag} {COUNTRY_BY_ID[hovered].name}</div>}
        {game.phase==='setup'&&<div className="map-intro"><span className="map-intro-index">01 / ESCOLHA A ORIGEM</span><strong>Clique em um país para começar</strong><span>Depois, inicie a simulação no painel lateral.</span></div>}
      </div>
      <div className="map-footer">
        <div className="map-legend"><span className="legend-dot base"/> Sem atividade <span className="legend-dot low"/> Sinal inicial <span className="legend-dot medium"/> Expansão <span className="legend-dot high"/> Crise elevada</div>
        <div className="map-footer-right">MAPA VETORIAL · NÃO EPIDEMIOLÓGICO</div>
      </div>
    </div>
  );
}
