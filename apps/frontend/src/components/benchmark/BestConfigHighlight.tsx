import React from 'react';
import ConfigBadge from './ConfigBadge';

interface BestConfigHighlightProps {
  results: Array<{
    id: string;
    configName: string;
    target: any;
    suites: Array<{
      suite: string;
      aggregated: Record<string, { mean: number }>;
    }>;
  }>;
}

const DIMENSION_LABELS: Record<string, string> = {
  'fact-extraction': 'Extraction de faits',
  'insight-extraction': 'Extraction d\'insights',
  'recommendation-extraction': 'Recommandations',
  'output-formulation': 'Formulation d\'outputs',
  'dedup': 'Déduplication',
  'impact-check': 'Vérification d\'impact',
  'update-proposal': 'Propositions de mise à jour',
};

const BestConfigHighlight: React.FC<BestConfigHighlightProps> = ({ results }) => {
  if (results.length < 2) return null;

  const allSuites = new Set<string>();
  for (const r of results) {
    for (const s of r.suites) allSuites.add(s.suite);
  }

  const highlights = Array.from(allSuites).map((suite) => {
    let bestResult: (typeof results)[0] | null = null;
    let bestScore = -1;

    for (const r of results) {
      const s = r.suites.find((s) => s.suite === suite);
      if (!s) continue;
      const metrics = Object.values(s.aggregated);
      const avg = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.mean, 0) / metrics.length : 0;
      if (avg > bestScore) {
        bestScore = avg;
        bestResult = r;
      }
    }

    return { suite, bestResult, bestScore };
  }).filter((h) => h.bestResult);

  return (
    <div className="best-config-highlight">
      <h4>Meilleure config par dimension</h4>
      <div className="highlight-grid">
        {highlights.map((h) => (
          <div key={h.suite} className="highlight-card">
            <div className="highlight-dimension">{DIMENSION_LABELS[h.suite] || h.suite}</div>
            <div className="highlight-score">{(h.bestScore * 100).toFixed(1)}%</div>
            <div className="highlight-config">
              <ConfigBadge target={h.bestResult!.target} compact />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BestConfigHighlight;
