import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';

interface SuggestionGap {
  latest: { label: string; value: number };
  reference: { label: string; value: number };
  delta: number;
}

interface Suggestion {
  type: string;
  title?: string;
  message: string;
  detail?: string;
  gap?: SuggestionGap | null;
  suggestedConfig?: any;
}

interface SuggestionsPanelProps {
  onApplySuggestion: (config: any) => void;
  refreshKey?: number;
}

const TARGET_LABELS: Record<string, string> = {
  provider: 'Provider',
  model: 'Model',
  tempExtraction: 'Temp extraction',
  tempDedup: 'Temp dedup',
  tempImpact: 'Temp impact',
  tempProposal: 'Temp proposal',
  embeddingsModel: 'Embeddings model',
  dedupThreshold: 'Dedup threshold',
};

const ConfigPreview: React.FC<{ config: any }> = ({ config }) => {
  if (!config) return null;

  const target = config.target || config.baseTarget;
  const matrix = config.matrix;

  if (!target) return null;

  const entries = Object.entries(TARGET_LABELS)
    .filter(([key]) => target[key] != null && target[key] !== '')
    .map(([key, label]) => {
      const matrixValues = matrix?.[key];
      const isMatrixParam = Array.isArray(matrixValues);
      return { key, label, value: target[key], matrixValues: isMatrixParam ? matrixValues : null };
    });

  if (entries.length === 0) return null;

  return (
    <div className="suggestion-config-preview">
      <div className="suggestion-config-title">Proposed test parameters</div>
      <div className="suggestion-config-grid">
        {entries.map(({ key, label, value, matrixValues }) => (
          <div key={key} className="suggestion-config-row">
            <span className="suggestion-config-label">{label}</span>
            {matrixValues ? (
              <span className="suggestion-config-value matrix">
                {matrixValues.map((v: any, i: number) => (
                  <span key={i} className="suggestion-config-matrix-val">{String(v)}</span>
                ))}
              </span>
            ) : (
              <span className="suggestion-config-value">{String(value)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const GapBar: React.FC<{ gap: SuggestionGap }> = ({ gap }) => {
  const maxVal = Math.max(gap.latest.value, gap.reference.value, 0.01);
  const latestPct = (gap.latest.value / maxVal) * 100;
  const refPct = (gap.reference.value / maxVal) * 100;
  const pct = (v: number) => (v * 100).toFixed(1);
  const isPositive = gap.reference.value > gap.latest.value;

  return (
    <div className="suggestion-gap">
      <div className="suggestion-gap-row">
        <span className="suggestion-gap-label">{gap.latest.label}</span>
        <div className="suggestion-gap-bar-track">
          <div className="suggestion-gap-bar latest" style={{ width: `${latestPct}%` }} />
        </div>
        <span className="suggestion-gap-value">{pct(gap.latest.value)}%</span>
      </div>
      <div className="suggestion-gap-row">
        <span className="suggestion-gap-label">{gap.reference.label}</span>
        <div className="suggestion-gap-bar-track">
          <div className="suggestion-gap-bar reference" style={{ width: `${refPct}%` }} />
        </div>
        <span className="suggestion-gap-value">{pct(gap.reference.value)}%</span>
      </div>
      <div className={`suggestion-gap-delta ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '+' : ''}{pct(gap.delta)} pts gap
      </div>
    </div>
  );
};

const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({ onApplySuggestion, refreshKey }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/benchmark/suggestions`)
      .then((res) => res.json())
      .then((data) => {
        setSuggestions(data.suggestions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <div className="suggestions-loading">Analyzing results...</div>;
  if (suggestions.length === 0) return <div className="suggestions-empty">No suggestions yet. Run benchmarks to get improvement recommendations.</div>;

  const typeIcons: Record<string, string> = {
    low_score: '!',
    best_config: '*',
    model_comparison: 'M',
    temperature_sweet_spot: 'T',
    neighborhood_exploration: '~',
    regression: 'R',
    suite_declining: 'D',
    provider_comparison: 'P',
  };

  return (
    <div className="suggestions-panel">
      <h4>Suggestions d'amelioration</h4>
      <p className="suggestions-subtitle">
        Based on analysis of your {suggestions.length > 0 ? 'latest' : ''} benchmarks. Click a suggestion for details.
      </p>
      <div className="suggestions-list">
        {suggestions.map((s, i) => {
          const isExpanded = expandedIndex === i;
          return (
            <div
              key={i}
              className={`suggestion-card ${s.type} ${isExpanded ? 'expanded' : ''}`}
              onClick={() => setExpandedIndex(isExpanded ? null : i)}
            >
              <div className="suggestion-icon">{typeIcons[s.type] || '?'}</div>
              <div className="suggestion-content">
                {s.title && <div className="suggestion-title">{s.title}</div>}
                <div className="suggestion-message">{s.message}</div>

                {isExpanded && s.gap && <GapBar gap={s.gap} />}

                {isExpanded && s.detail && (
                  <div className="suggestion-detail">{s.detail}</div>
                )}

                {isExpanded && s.suggestedConfig && (
                  <ConfigPreview config={s.suggestedConfig} />
                )}

                {s.suggestedConfig && (
                  <button
                    className="suggestion-apply"
                    onClick={(e) => { e.stopPropagation(); onApplySuggestion(s.suggestedConfig); }}
                  >
                    Test this config
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestionsPanel;
