import React from 'react';

interface HistoryPoint {
  timestamp: string;
  configName: string;
  score: number;
}

interface HistoryChartProps {
  points: HistoryPoint[];
  title?: string;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ points, title }) => {
  if (points.length === 0) {
    return <div className="history-empty">No history data</div>;
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minScore = Math.min(...points.map((p) => p.score));
  const maxScore = Math.max(...points.map((p) => p.score));
  const range = maxScore - minScore || 0.1;

  const getX = (i: number) => padding.left + (i / Math.max(points.length - 1, 1)) * chartW;
  const getY = (score: number) => padding.top + chartH - ((score - minScore) / range) * chartH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.score)}`)
    .join(' ');

  return (
    <div className="history-chart">
      {title && <h4>{title}</h4>}
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const val = minScore + frac * range;
          const y = getY(val);
          return (
            <g key={frac}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y}
                stroke="var(--border-color)" strokeWidth="0.5" opacity="0.3" />
              <text x={padding.left - 5} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-color)">
                {(val * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Line */}
        <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="2" />

        {/* Points with tooltips */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(p.score)} r="4" fill="#4f46e5" />
            <title>{`${p.configName}\n${new Date(p.timestamp).toLocaleDateString()}\n${(p.score * 100).toFixed(1)}%`}</title>
          </g>
        ))}

        {/* X-axis labels (show every Nth) */}
        {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 5)) === 0).map((p, i, arr) => {
          const origIndex = points.indexOf(p);
          return (
            <text key={origIndex} x={getX(origIndex)} y={height - 5} textAnchor="middle" fontSize="8" fill="var(--text-color)">
              {new Date(p.timestamp).toLocaleDateString()}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default HistoryChart;
