import React from 'react';

interface DimensionDetailProps {
  suite: string;
  result: {
    id: string;
    configName: string;
    suites: Array<{
      suite: string;
      aggregated: Record<string, { mean: number; stddev: number; min: number; max: number; count: number }>;
      cases: Array<{
        caseId: string;
        metrics: Array<{ name: string; value: number; type: string; details?: string }>;
        error?: string;
      }>;
    }>;
  };
  onClose: () => void;
}

const DimensionDetail: React.FC<DimensionDetailProps> = ({ suite, result, onClose }) => {
  const suiteData = result.suites.find((s) => s.suite === suite);
  if (!suiteData) {
    return (
      <div className="dimension-detail">
        <button className="detail-close" onClick={onClose}>Close</button>
        <p>No data for suite: {suite}</p>
      </div>
    );
  }

  return (
    <div className="dimension-detail">
      <div className="detail-header">
        <h3>{suite} — {result.configName}</h3>
        <button className="detail-close" onClick={onClose}>Close</button>
      </div>

      <div className="detail-aggregated">
        <h4>Aggregated Metrics</h4>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Mean</th>
              <th>StdDev</th>
              <th>Min</th>
              <th>Max</th>
              <th>N</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(suiteData.aggregated).map(([name, agg]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{(agg.mean * 100).toFixed(1)}%</td>
                <td>{(agg.stddev * 100).toFixed(1)}%</td>
                <td>{(agg.min * 100).toFixed(1)}%</td>
                <td>{(agg.max * 100).toFixed(1)}%</td>
                <td>{agg.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="detail-cases">
        <h4>Individual Cases</h4>
        {suiteData.cases.map((c) => (
          <div key={c.caseId} className={`detail-case ${c.error ? 'error' : ''}`}>
            <div className="case-header">
              <strong>{c.caseId}</strong>
              {c.error && <span className="case-error"> {c.error}</span>}
            </div>
            {c.metrics.length > 0 && (
              <div className="case-metrics">
                {c.metrics.map((m, i) => (
                  <div key={i} className={`case-metric ${m.type}`}>
                    <span className="metric-label">{m.name}:</span>
                    <span className="metric-value">{(m.value * 100).toFixed(1)}%</span>
                    <span className="metric-type">[{m.type}]</span>
                    {m.details && <div className="metric-details">{m.details}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DimensionDetail;
