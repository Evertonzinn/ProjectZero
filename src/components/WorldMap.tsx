import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import world from '../data/world.json';
import { COUNTRIES, COUNTRY_BY_ID, ROUTES, project, type CountryId } from '../data/countries';
import type { GameState } from '../simulation/engine';

type Feature = { id: string; name: string; continent: string; path: string; x: number; y: number };
type Camera = { zoom: number; centerX: number; centerY: number };
type HoverState = { id: CountryId; x: number; y: number };

const features = world as Feature[];
const reachable = new Set<string>(COUNTRIES.map((c) => c.id));

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function constrain(camera: Camera): Camera {
  return {
    ...camera,
    centerX: clamp(camera.centerX, 600 / camera.zoom, 1200 - 600 / camera.zoom),
    centerY: clamp(camera.centerY, 300 / camera.zoom, 600 - 300 / camera.zoom),
  };
}

function createRoutePath(from: CountryId, to: CountryId): string {
  const a = COUNTRY_BY_ID[from];
  const b = COUNTRY_BY_ID[to];
  const [x1, y1] = project(a.lon, a.lat);
  const [x2, y2] = project(b.lon, b.lat);
  const curvature = Math.min(105, 13 + Math.abs(x2 - x1) * 0.18);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${((x1 + x2) / 2).toFixed(1)} ${((y1 + y2) / 2 - curvature).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

const renderedRoutes = ROUTES.map((route, index) => ({ ...route, path: createRoutePath(route.from, route.to), index }));

export default function WorldMap({ state, selected, onSelect }: { state: GameState; selected: CountryId; onSelect: (id: CountryId) => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<null | { startX: number; startY: number; centerX: number; centerY: number; id: CountryId | null; moved: boolean }>(null);
  const [camera, setCamera] = useState<Camera>({ zoom: 1, centerX: 600, centerY: 300 });
  const [hover, setHover] = useState<HoverState | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);

  const viewBox = useMemo(() => {
    const w = 1200 / camera.zoom;
    const h = 600 / camera.zoom;
    return `${camera.centerX - w / 2} ${camera.centerY - h / 2} ${w} ${h}`;
  }, [camera]);

  function zoom(amount: number) {
    setCamera((c) => constrain({ ...c, zoom: clamp(c.zoom * amount, 1, 4) }));
  }

  function onWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    zoom(event.deltaY < 0 ? 1.13 : 1 / 1.13);
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const element = event.target as Element;
    const id = element.closest('[data-country]')?.getAttribute('data-country') as CountryId | null;
    dragRef.current = { startX: event.clientX, startY: event.clientY, centerX: camera.centerX, centerY: camera.centerY, id, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (rect && hover) {
      setHover((h) => h ? { ...h, x: clamp(event.clientX - rect.left, 80, rect.width - 80), y: clamp(event.clientY - rect.top, 45, rect.height - 28) } : h);
    }
    const drag = dragRef.current;
    if (!drag || !svgRef.current) return;
    const diffX = event.clientX - drag.startX;
    const diffY = event.clientY - drag.startY;
    if (Math.hypot(diffX, diffY) > 5) drag.moved = true;
    if (!drag.moved) return;
    setDragging(true);
    const renderedWidth = svgRef.current.getBoundingClientRect().width;
    const factor = (1200 / camera.zoom) / renderedWidth;
    setCamera((current) => constrain({ ...current, centerX: drag.centerX - diffX * factor, centerY: drag.centerY - diffY * factor }));
  }

  function onPointerUp(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (drag && !drag.moved && drag.id && reachable.has(drag.id)) onSelect(drag.id);
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function cancelDrag() { dragRef.current = null; setDragging(false); }
  const exposureOf = (id: CountryId) => state.countries[id]?.exposure ?? 0;

  return (
    <section className="map-panel" aria-label="Mapa-múndi interativo do Project Zero">
      <div className="map-header">
        <div className="map-location"><span className="signal-dot" /> <span>WORLD SIMULATION</span><span className="map-slash">/</span> <strong>VISÃO GLOBAL</strong></div>
        <div className="map-header-right"><span className="live-label">{state.status === 'running' ? '● EM EXECUÇÃO' : state.status === 'setup' ? '○ PRONTO PARA INICIAR' : '◉ SIMULAÇÃO PARADA'}</span><span className="map-day">DIA <b>{String(state.day).padStart(3, '0')}</b></span></div>
      </div>
      <div className="map-frame" ref={frameRef}>
        <div className="map-corner map-corner-tl" /><div className="map-corner map-corner-tr" /><div className="map-corner map-corner-bl" /><div className="map-corner map-corner-br" />
        <div className="map-top-hint"><span className="square-glyph">⌗</span> SETOR 01 <span className="map-hint-sep">•</span> PROJEÇÃO GLOBAL</div>
        <svg
          ref={svgRef} className={`world-svg ${dragging ? 'is-dragging' : ''}`} viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet" role="group" aria-label="Países selecionáveis do mundo"
          onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={cancelDrag} onPointerLeave={() => setHover(null)}
        >
          <defs>
            <radialGradient id="ocean-gradient"><stop offset="0%" stopColor="#102b38" /><stop offset="100%" stopColor="#071621" /></radialGradient>
            <pattern id="map-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#51819a" strokeWidth="0.6" opacity="0.17" /></pattern>
            <filter id="light-bloom" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="4.5" /></filter>
          </defs>
          <rect width="1200" height="600" fill="url(#ocean-gradient)" />
          <rect width="1200" height="600" fill="url(#map-grid)" />
          {Array.from({ length: 7 }, (_, i) => <line key={`lat-${i}`} x1="0" x2="1200" y1={i * 100} y2={i * 100} stroke="#346078" strokeDasharray="2 14" opacity="0.24" />)}
          {features.map((feature) => {
            const playable = reachable.has(feature.id);
            const id = feature.id as CountryId;
            const level = playable ? exposureOf(id) : 0;
            const isSelected = selected === feature.id;
            const isHovered = hover?.id === feature.id;
            const fill = level >= 65 ? '#c45a47' : level >= 30 ? '#a76a47' : level > 0 ? '#52797b' : isSelected ? '#367882' : playable ? '#234150' : '#18313d';
            return <path
              key={feature.id} d={feature.path} fill={fill}
              fillRule="evenodd" stroke={isSelected || isHovered ? '#a5f4df' : '#486779'}
              strokeWidth={isSelected ? 1.8 : isHovered ? 1.15 : 0.75}
              strokeOpacity={playable ? 0.8 : 0.39}
              opacity={playable ? 1 : 0.74}
              className={playable ? 'country-hitbox' : 'country-muted'}
              data-country={playable ? feature.id : undefined}
              role={playable ? 'button' : undefined}
              tabIndex={playable ? 0 : undefined}
              aria-label={playable ? `Selecionar ${COUNTRY_BY_ID[id].name}` : undefined}
              aria-pressed={playable ? isSelected : undefined}
              onKeyDown={playable ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(id); } } : undefined}
              onFocus={playable ? () => setHover({ id, x: 180, y: 70 }) : undefined}
              onBlur={playable ? () => setHover(null) : undefined}
              onPointerEnter={playable ? (event) => {
                const rect = frameRef.current?.getBoundingClientRect();
                if (!rect) return;
                setHover({ id, x: clamp(event.clientX - rect.left, 80, rect.width - 80), y: clamp(event.clientY - rect.top, 45, rect.height - 28) });
              } : undefined}
              onPointerLeave={playable ? () => { if (!dragRef.current) setHover(null); } : undefined}
            />;
          })}
          {showRoutes && renderedRoutes.map((route) => {
            const active = exposureOf(route.from) > 0 || exposureOf(route.to) > 0;
            const connection = exposureOf(route.from) > 0 && exposureOf(route.to) > 0;
            if (!active && ![0, 6, 10, 18, 20, 25, 30].includes(route.index)) return null;
            return <g key={`${route.from}-${route.to}`} pointerEvents="none">
              <path d={route.path} fill="none" stroke={connection ? '#ffad77' : active ? '#72d5be' : '#2a7b83'} strokeWidth={active ? 1.4 : 0.85} strokeDasharray={route.mode === 'sea' ? '3 5' : '4 7'} opacity={active ? 0.7 : 0.25} />
              {active && <circle r={connection ? 2.7 : 2.1} fill={connection ? '#ffc19b' : '#b7fff1'}>
                <animateMotion path={route.path} dur={`${(7 + route.index % 6) / (connection ? 1.3 : 1)}s`} repeatCount="indefinite" begin={`${-(route.index % 6)}s`} />
              </circle>}
            </g>;
          })}
          {COUNTRIES.map((country) => {
            const [x, y] = project(country.lon, country.lat);
            const infected = exposureOf(country.id) > 0;
            const isSelected = country.id === selected;
            return <g key={country.id} pointerEvents="none">
              {infected && <circle cx={x} cy={y} r={7 + Math.min(9, exposureOf(country.id) / 10)} fill="#f7a86f" opacity="0.2" filter="url(#light-bloom)" />}
              {infected && <circle cx={x} cy={y} r="8" fill="none" stroke="#ffb17c" strokeWidth="0.9" opacity="0.65" className="map-pulse" />}
              {isSelected && <><circle cx={x} cy={y} r="13.5" fill="none" stroke="#a8f8e1" strokeWidth="1" strokeDasharray="3 4" /><circle cx={x} cy={y} r="19" fill="none" stroke="#84d5c9" strokeWidth="0.5" opacity="0.32" /></>}
              <circle cx={x} cy={y} r={isSelected ? 4.8 : infected ? 3.6 : 2.15} fill={infected ? '#ffc092' : isSelected ? '#e1fff4' : '#6b9fac'} stroke="#102f3c" strokeWidth="1.2" />
            </g>;
          })}
        </svg>
        {hover && <div className="map-tooltip" style={{ left: hover.x, top: hover.y }} role="status">
          <strong>{COUNTRY_BY_ID[hover.id].flag} {COUNTRY_BY_ID[hover.id].name}</strong>
          <span>Atividade: {exposureOf(hover.id).toFixed(1)}%</span>
          <small>Selecionar país ↗</small>
        </div>}
        <div className="map-compass"><span>N</span><span className="compass-cross">✥</span><span>S</span></div>
        <div className="map-bottom-ui">
          <div className="map-legend"><span><i className="legend-dot legend-idle" /> NÃO ATINGIDO</span><span><i className="legend-dot legend-affected" /> EM EXPANSÃO</span><span><i className="legend-dot legend-critical" /> ATIVIDADE ELEVADA</span></div>
          <div className="map-zoom-controls">
            <button type="button" onClick={() => setShowRoutes((prev) => !prev)} className={showRoutes ? 'toggle-routes is-on' : 'toggle-routes'} aria-pressed={showRoutes} title="Mostrar ou ocultar rotas">ROTAS {showRoutes ? 'ON' : 'OFF'}</button>
            <button type="button" onClick={() => zoom(1.35)} aria-label="Aproximar mapa" title="Aproximar">+</button>
            <button type="button" onClick={() => zoom(1 / 1.35)} aria-label="Afastar mapa" title="Afastar">−</button>
            <button type="button" onClick={() => setCamera({ zoom: 1, centerX: 600, centerY: 300 })} aria-label="Recentralizar mapa" title="Recentralizar">⌖</button>
          </div>
        </div>
      </div>
      <div className="map-footer"><span>⌘ CLIQUE PARA SELECIONAR <span className="foot-divider">/</span> ARRASTE PARA NAVEGAR <span className="foot-divider">/</span> SCROLL PARA ZOOM</span><span>20 PAÍSES ATIVOS <span className="foot-divider">·</span> 177 TERRITÓRIOS NO MAPA</span></div>
    </section>
  );
}
