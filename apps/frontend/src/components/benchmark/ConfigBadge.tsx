import React from 'react';

interface ConfigBadgeProps {
  target: {
    provider?: string;
    model?: string;
    tempExtraction?: number;
    tempDedup?: number;
    tempImpact?: number;
    tempProposal?: number;
    embeddingsModel?: string;
    dedupThreshold?: number;
  };
  compact?: boolean;
}

const ConfigBadge: React.FC<ConfigBadgeProps> = ({ target, compact }) => {
  if (!target) return null;

  if (compact) {
    return (
      <span className="config-badge-compact">
        <span className="config-tag model">{target.model || 'unknown'}</span>
        <span className="config-tag temp">t={target.tempExtraction}</span>
      </span>
    );
  }

  return (
    <div className="config-badge">
      <span className="config-tag provider">{target.provider}</span>
      <span className="config-tag model">{target.model}</span>
      <span className="config-tag temp">ext={target.tempExtraction}</span>
      <span className="config-tag temp">ded={target.tempDedup}</span>
      <span className="config-tag temp">imp={target.tempImpact}</span>
      <span className="config-tag temp">prop={target.tempProposal}</span>
      {target.embeddingsModel && (
        <span className="config-tag emb">{target.embeddingsModel}</span>
      )}
      {target.dedupThreshold !== undefined && (
        <span className="config-tag threshold">thr={target.dedupThreshold}</span>
      )}
    </div>
  );
};

export default ConfigBadge;
