import React from 'react';

interface BenchmarkProgressProps {
  status: {
    state: 'pending' | 'running' | 'completed' | 'failed';
    currentSuite?: string;
    currentCase?: string;
    completedSuites: number;
    totalSuites: number;
    completedCases: number;
    totalCases: number;
    totalRuns?: number;
    completedRuns?: number;
    currentRunLabel?: string;
    partialScores?: Record<string, number>;
  } | null;
  onCancel?: () => void;
}

const BenchmarkProgress: React.FC<BenchmarkProgressProps> = ({ status, onCancel }) => {
  if (!status) return null;

  const progress = status.totalSuites > 0 ? status.completedSuites / status.totalSuites : 0;

  return (
    <div className={`benchmark-progress ${status.state}`}>
      <div className="progress-header">
        <span className="progress-state">{status.state}</span>
        {status.currentSuite && (
          <span className="progress-current">
            {status.currentSuite} {status.currentCase ? `/ ${status.currentCase}` : ''}
          </span>
        )}
      </div>

      {status.totalRuns != null && status.totalRuns > 1 && (
        <div className="progress-run-label">
          Run {(status.completedRuns || 0) + 1}/{status.totalRuns}
          {status.currentRunLabel ? `: ${status.currentRunLabel}` : ''}
        </div>
      )}

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress * 100}%` }} />
        <span className="progress-text">
          {status.completedSuites}/{status.totalSuites} suites ({(progress * 100).toFixed(0)}%)
        </span>
      </div>

      {status.partialScores && Object.keys(status.partialScores).length > 0 && (
        <div className="progress-scores">
          {Object.entries(status.partialScores).map(([suite, score]) => (
            <span key={suite} className="progress-score-tag">
              {suite}: {(score * 100).toFixed(1)}%
            </span>
          ))}
        </div>
      )}

      {status.state === 'running' && onCancel && (
        <button className="progress-cancel" onClick={onCancel}>Cancel</button>
      )}
    </div>
  );
};

export default BenchmarkProgress;
