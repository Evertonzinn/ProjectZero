import type { HistoryEntry } from '../engine/simulation';

export function TrendChart({history}:{history:HistoryEntry[]}) {
  const entries=history.length>1?history:[{day:0,affected:0,research:0},{day:1,affected:0,research:0}];
  const max=Math.max(1,...entries.map(x=>x.affected));
  const width=700, height=120;
  const coord=(x:HistoryEntry,i:number)=>`${(i/(entries.length-1))*width},${height-8-(x.affected/max)*(height-24)}`;
  const points=entries.map(coord).join(' ');
  return <div className="trend-shell">
    <div className="trend-heading"><span>EVOLUÇÃO DO CENÁRIO</span><span>ÚLTIMOS {entries.length-1} DIAS</span></div>
    <svg className="trend-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Gráfico de impactados acumulados por dia">
      <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a6e86b" stopOpacity=".25"/><stop offset="1" stopColor="#a6e86b" stopOpacity=".015"/></linearGradient></defs>
      {[25,60,95].map(y=><line key={y} x1="0" x2="700" y1={y} y2={y} stroke="#728594" strokeDasharray="3 7" opacity=".22"/>)}
      <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#trendFill)"/>
      <polyline points={points} stroke="#b5ed70" strokeWidth="2.5" fill="none" vectorEffect="non-scaling-stroke"/>
      <circle cx={width} cy={Number(points.split(' ').at(-1)?.split(',')[1])||height-8} r="4" fill="#d5ff9b"/>
    </svg>
  </div>;
}
