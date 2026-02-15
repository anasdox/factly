import React from 'react';

interface RadarDataPoint {
  dimension: string;
  [configName: string]: string | number;
}

interface ScoreRadarChartProps {
  results: Array<{
    id: string;
    configName: string;
    suites: Array<{
      suite: string;
      aggregated: Record<string, { mean: number }>;
    }>;
  }>;
}

const COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

const DIMENSION_LABELS: Record<string, string> = {
  'fact-extraction': 'Facts',
  'insight-extraction': 'Insights',
  'recommendation-extraction': 'Recommandations',
  'output-formulation': 'Outputs',
  'dedup': 'Déduplication',
  'impact-check': 'Impact',
  'update-proposal': 'Mise à jour',
};

const ScoreRadarChart: React.FC<ScoreRadarChartProps> = ({ results }) => {
  if (results.length === 0) {
    return <div className="radar-empty">Select runs to compare</div>;
  }

  // Get all dimensions
  const dimensions = new Set<string>();
  for (const r of results) {
    for (const s of r.suites) {
      dimensions.add(s.suite);
    }
  }
  const dimArray = Array.from(dimensions);

  // SVG radar chart
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const levels = 5;

  const angleStep = (2 * Math.PI) / dimArray.length;
  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: cx + radius * value * Math.cos(angle),
      y: cy + radius * value * Math.sin(angle),
    };
  };

  // Grid circles
  const gridCircles = Array.from({ length: levels }, (_, i) => {
    const r = (radius * (i + 1)) / levels;
    return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-color)" strokeWidth="0.5" opacity="0.4" />;
  });

  // Grid lines (spokes)
  const spokes = dimArray.map((_, i) => {
    const p = getPoint(i, 1);
    return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border-color)" strokeWidth="0.5" opacity="0.4" />;
  });

  // Labels
  const labels = dimArray.map((dim, i) => {
    const p = getPoint(i, 1.18);
    return (
      <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
        fontSize="10" fill="var(--text-color)">
        {DIMENSION_LABELS[dim] || dim}
      </text>
    );
  });

  // Data polygons
  const polygons = results.map((result, ri) => {
    const points = dimArray.map((dim, di) => {
      const suite = result.suites.find((s) => s.suite === dim);
      if (!suite) return getPoint(di, 0);
      const metrics = Object.values(suite.aggregated);
      const avg = metrics.length > 0 ? metrics.reduce((s, m) => s + m.mean, 0) / metrics.length : 0;
      return getPoint(di, avg);
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    const color = COLORS[ri % COLORS.length];

    return (
      <g key={result.id}>
        <path d={pathD} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}
      </g>
    );
  });

  return (
    <div className="score-radar-chart">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {gridCircles}
        {spokes}
        {polygons}
        {labels}
      </svg>
      <div className="radar-legend">
        {results.map((r, i) => (
          <div key={r.id} className="radar-legend-item">
            <span className="radar-legend-color" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span>{r.configName}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoreRadarChart;
