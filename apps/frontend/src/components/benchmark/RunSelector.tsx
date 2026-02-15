import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import ConfigBadge from './ConfigBadge';

interface BenchmarkRunSummary {
  id: string;
  timestamp: string;
  configName: string;
  target: any;
  overallScore: number;
  suitesCount: number;
  totalLatencyMs: number;
  status?: 'error' | 'success';
  errorRate?: number;
}

interface RunSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  refreshKey?: number;
  onDelete?: (id: string) => void;
}

const RunSelector: React.FC<RunSelectorProps> = ({ selectedIds, onSelectionChange, refreshKey, onDelete }) => {
  const [runs, setRuns] = useState<BenchmarkRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [filterModel, setFilterModel] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/benchmark/results`)
      .then((res) => res.json())
      .then((data) => {
        setRuns(data.results || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  const models = Array.from(new Set(runs.map((r) => r.target?.model).filter(Boolean)));

  const filtered = runs
    .filter((r) => !filterModel || r.target?.model === filterModel)
    .sort((a, b) => {
      if (sortBy === 'score') return b.overallScore - a.overallScore;
      return b.timestamp.localeCompare(a.timestamp);
    });

  const toggleSelection = (run: BenchmarkRunSummary) => {
    if (run.status === 'error') return;
    const id = run.id;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this benchmark result?')) return;
    fetch(`${API_URL}/benchmark/results/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then(() => {
        setRuns((prev) => prev.filter((r) => r.id !== id));
        if (onDelete) onDelete(id);
      })
      .catch(() => {});
  };

  if (loading) return <div className="benchmark-loading">Loading runs...</div>;

  return (
    <div className="run-selector">
      <div className="run-selector-controls">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="date">Sort by date</option>
          <option value="score">Sort by score</option>
        </select>
        <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)}>
          <option value="">All models</option>
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className="run-count">{filtered.length} runs</span>
      </div>

      <div className="run-list">
        {filtered.length === 0 && (
          <div className="run-list-empty">No benchmark runs found. Run a benchmark first.</div>
        )}
        {filtered.map((run) => {
          const isError = run.status === 'error';
          return (
            <div
              key={run.id}
              className={`run-item ${selectedIds.includes(run.id) ? 'selected' : ''} ${isError ? 'error' : ''}`}
              onClick={() => toggleSelection(run)}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(run.id)}
                onChange={() => toggleSelection(run)}
                disabled={isError}
              />
              <div className="run-info">
                <div className="run-name">
                  {run.configName}
                  {isError && <span className="run-error-badge">Error</span>}
                </div>
                <div className="run-meta">
                  {new Date(run.timestamp).toLocaleString()} | {run.suitesCount} suites | {(run.totalLatencyMs / 1000).toFixed(1)}s
                </div>
                <ConfigBadge target={run.target} compact />
              </div>
              <div className="run-score">
                <span className={`score-value ${run.overallScore >= 0.7 ? 'good' : run.overallScore >= 0.4 ? 'medium' : 'low'}`}>
                  {(run.overallScore * 100).toFixed(1)}%
                </span>
              </div>
              <button
                className="run-delete-btn"
                title="Delete"
                onClick={(e) => handleDelete(e, run.id)}
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RunSelector;
