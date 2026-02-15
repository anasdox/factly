import React from 'react';

interface ComparisonEntry {
  metric: string;
  values: Array<{
    configName: string;
    id: string;
    value: number;
  }>;
  bestConfigName: string;
}

interface MetricComparisonTableProps {
  entries: ComparisonEntry[];
  configs: Array<{ name: string; id: string }>;
}

const MetricComparisonTable: React.FC<MetricComparisonTableProps> = ({ entries, configs }) => {
  if (entries.length === 0 || configs.length === 0) {
    return <div className="comparison-empty">No comparison data</div>;
  }

  // Group by suite
  const bySuite: Record<string, ComparisonEntry[]> = {};
  for (const entry of entries) {
    const suite = entry.metric.split('/')[0];
    if (!bySuite[suite]) bySuite[suite] = [];
    bySuite[suite].push(entry);
  }

  return (
    <div className="metric-comparison-table">
      {Object.entries(bySuite).map(([suite, suiteEntries]) => (
        <div key={suite} className="comparison-suite">
          <h4 className="comparison-suite-title">{suite}</h4>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                {configs.map((c) => (
                  <th key={c.id}>{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suiteEntries.map((entry) => {
                const metricName = entry.metric.split('/')[1];
                return (
                  <tr key={entry.metric}>
                    <td className="metric-name">{metricName}</td>
                    {entry.values.map((v) => (
                      <td
                        key={v.id}
                        className={`metric-value ${v.configName === entry.bestConfigName ? 'best' : ''}`}
                      >
                        {(v.value * 100).toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default MetricComparisonTable;
