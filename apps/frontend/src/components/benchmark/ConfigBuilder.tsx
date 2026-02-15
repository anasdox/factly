import React from 'react';

interface ConfigBuilderProps {
  config: {
    provider: string;
    model: string;
    tempExtraction: number;
    tempDedup: number;
    tempImpact: number;
    tempProposal: number;
    embeddingsModel: string;
    dedupThreshold: number;
  };
  onChange: (config: any) => void;
}

const PROVIDERS = ['openai', 'anthropic', 'openai-compatible'];
const MODELS = ['gpt-4o', 'gpt-4.1', 'gpt-4o-mini', 'claude-sonnet-4-5-20250929', 'claude-haiku-3-5'];
const EMBEDDING_MODELS = ['', 'text-embedding-3-small', 'text-embedding-3-large'];

const ConfigBuilder: React.FC<ConfigBuilderProps> = ({ config, onChange }) => {
  const update = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="config-builder">
      <h4>Configuration</h4>
      <div className="config-grid">
        <div className="config-field">
          <label>Provider</label>
          <select value={config.provider} onChange={(e) => update('provider', e.target.value)}>
            {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="config-field">
          <label>Model</label>
          <select value={config.model} onChange={(e) => update('model', e.target.value)}>
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="config-field">
          <label>Temp extraction: {config.tempExtraction}</label>
          <input type="range" min="0" max="1" step="0.05"
            value={config.tempExtraction}
            onChange={(e) => update('tempExtraction', parseFloat(e.target.value))} />
        </div>

        <div className="config-field">
          <label>Temp dedup: {config.tempDedup}</label>
          <input type="range" min="0" max="1" step="0.05"
            value={config.tempDedup}
            onChange={(e) => update('tempDedup', parseFloat(e.target.value))} />
        </div>

        <div className="config-field">
          <label>Temp impact: {config.tempImpact}</label>
          <input type="range" min="0" max="1" step="0.05"
            value={config.tempImpact}
            onChange={(e) => update('tempImpact', parseFloat(e.target.value))} />
        </div>

        <div className="config-field">
          <label>Temp proposal: {config.tempProposal}</label>
          <input type="range" min="0" max="1" step="0.05"
            value={config.tempProposal}
            onChange={(e) => update('tempProposal', parseFloat(e.target.value))} />
        </div>

        <div className="config-field">
          <label>Embedding model</label>
          <select value={config.embeddingsModel} onChange={(e) => update('embeddingsModel', e.target.value)}>
            {EMBEDDING_MODELS.map((m) => <option key={m} value={m}>{m || '(none)'}</option>)}
          </select>
        </div>

        <div className="config-field">
          <label>Dedup threshold: {config.dedupThreshold}</label>
          <input type="range" min="0.5" max="1" step="0.05"
            value={config.dedupThreshold}
            onChange={(e) => update('dedupThreshold', parseFloat(e.target.value))} />
        </div>
      </div>
    </div>
  );
};

export default ConfigBuilder;
