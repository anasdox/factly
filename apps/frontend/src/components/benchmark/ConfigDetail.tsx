import React from 'react';

interface ConfigDetailProps {
  result: {
    id?: string;
    timestamp?: string;
    config?: {
      name?: string;
      description?: string;
      suites?: string[];
      runsPerCase?: number;
      matching?: { method?: string; threshold?: number; embeddingsModel?: string };
      timeoutMs?: number;
      evaluator?: { provider?: string; model?: string };
    };
    target?: {
      provider?: string;
      model?: string;
      tempExtraction?: number;
      tempDedup?: number;
      tempImpact?: number;
      tempProposal?: number;
      embeddingsModel?: string;
      dedupThreshold?: number;
    };
    overallScore?: number;
    totalLatencyMs?: number;
    cost?: { estimatedUsd?: number; tokens?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } };
  };
}

const ConfigDetail: React.FC<ConfigDetailProps> = ({ result }) => {
  if (!result) return null;

  const { config, target } = result;

  const rows: Array<{ label: string; value: string; section: string }> = [];

  // Target / LLM parameters
  if (target?.provider) rows.push({ section: 'LLM', label: 'Provider', value: target.provider });
  if (target?.model) rows.push({ section: 'LLM', label: 'Model', value: target.model });
  if (target?.tempExtraction != null) rows.push({ section: 'Temperatures', label: 'Extraction', value: String(target.tempExtraction) });
  if (target?.tempDedup != null) rows.push({ section: 'Temperatures', label: 'Dedup', value: String(target.tempDedup) });
  if (target?.tempImpact != null) rows.push({ section: 'Temperatures', label: 'Impact', value: String(target.tempImpact) });
  if (target?.tempProposal != null) rows.push({ section: 'Temperatures', label: 'Proposal', value: String(target.tempProposal) });
  if (target?.embeddingsModel) rows.push({ section: 'LLM', label: 'Embeddings model', value: target.embeddingsModel });
  if (target?.dedupThreshold != null) rows.push({ section: 'LLM', label: 'Dedup threshold', value: String(target.dedupThreshold) });

  // Config parameters
  if (config?.suites && config.suites.length > 0) rows.push({ section: 'Config', label: 'Suites', value: config.suites.join(', ') });
  if (config?.runsPerCase != null) rows.push({ section: 'Config', label: 'Runs per case', value: String(config.runsPerCase) });
  if (config?.timeoutMs != null) rows.push({ section: 'Config', label: 'Timeout', value: `${(config.timeoutMs / 1000).toFixed(0)}s` });

  // Matching
  if (config?.matching) {
    rows.push({ section: 'Matching', label: 'Method', value: config.matching.method || 'string' });
    if (config.matching.threshold != null) rows.push({ section: 'Matching', label: 'Threshold', value: String(config.matching.threshold) });
    if (config.matching.embeddingsModel) rows.push({ section: 'Matching', label: 'Emb. model', value: config.matching.embeddingsModel });
  }

  // Evaluator
  if (config?.evaluator) {
    if (config.evaluator.provider) rows.push({ section: 'Evaluator', label: 'Provider', value: config.evaluator.provider });
    if (config.evaluator.model) rows.push({ section: 'Evaluator', label: 'Model', value: config.evaluator.model });
  }

  // Execution metadata
  if (result.totalLatencyMs != null) rows.push({ section: 'Execution', label: 'Duration', value: `${(result.totalLatencyMs / 1000).toFixed(1)}s` });
  if (result.cost?.estimatedUsd != null) rows.push({ section: 'Execution', label: 'Cost', value: `$${result.cost.estimatedUsd.toFixed(4)}` });
  if (result.cost?.tokens?.totalTokens != null) rows.push({ section: 'Execution', label: 'Tokens', value: result.cost.tokens.totalTokens.toLocaleString() });

  // Group by section
  const sections: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!sections[row.section]) sections[row.section] = [];
    sections[row.section].push(row);
  }

  return (
    <div className="config-detail">
      {Object.entries(sections).map(([section, sectionRows]) => (
        <div key={section} className="config-detail-section">
          <div className="config-detail-section-title">{section}</div>
          {sectionRows.map((row) => (
            <div key={`${section}-${row.label}`} className="config-detail-row">
              <span className="config-detail-label">{row.label}</span>
              <span className="config-detail-value">{row.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default ConfigDetail;
