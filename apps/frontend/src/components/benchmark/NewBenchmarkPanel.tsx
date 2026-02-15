import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../config';
import ConfigBuilder from './ConfigBuilder';
import MatrixBuilder from './MatrixBuilder';

interface NewBenchmarkPanelProps {
  initialConfig?: any;
  onClose: () => void;
  onStarted: () => void;
  onJobStarted?: (jobId: string) => void;
}

const ALL_SUITES = [
  'fact-extraction',
  'insight-extraction',
  'recommendation-extraction',
  'output-formulation',
  'dedup',
  'impact-check',
  'update-proposal',
];

function generateDefaultName(cfg: { provider: string; model: string; tempExtraction: number }): string {
  return `${cfg.provider}-${cfg.model}-t${cfg.tempExtraction}`;
}

const NewBenchmarkPanel: React.FC<NewBenchmarkPanelProps> = ({ initialConfig, onClose, onStarted, onJobStarted }) => {
  const [mode, setMode] = useState<'single' | 'matrix'>('single');
  const [suites, setSuites] = useState<string[]>(initialConfig?.suites || ['fact-extraction']);
  const [runsPerCase, setRunsPerCase] = useState(initialConfig?.runsPerCase || 1);
  const [config, setConfig] = useState({
    provider: initialConfig?.target?.provider || 'openai',
    model: initialConfig?.target?.model || 'gpt-4o',
    tempExtraction: initialConfig?.target?.tempExtraction ?? 0.2,
    tempDedup: initialConfig?.target?.tempDedup ?? 0.1,
    tempImpact: initialConfig?.target?.tempImpact ?? 0.1,
    tempProposal: initialConfig?.target?.tempProposal ?? 0.3,
    embeddingsModel: initialConfig?.target?.embeddingsModel || '',
    dedupThreshold: initialConfig?.target?.dedupThreshold ?? 0.75,
  });
  const [matrix, setMatrix] = useState<any>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const [name, setName] = useState(initialConfig?.name || '');

  // Load existing names on mount
  useEffect(() => {
    fetch(`${API_URL}/benchmark/results/names`)
      .then((res) => res.json())
      .then((data) => setExistingNames(new Set(data.names || [])))
      .catch(() => {});
  }, []);

  // Generate a unique default name from config params
  const makeUniqueName = useCallback((base: string, names: Set<string>): string => {
    if (!names.has(base)) return base;
    for (let i = 2; i < 100; i++) {
      const candidate = `${base}-${i}`;
      if (!names.has(candidate)) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }, []);

  // Set initial name once existingNames are loaded and if no name was provided
  useEffect(() => {
    if (!initialConfig?.name && existingNames.size >= 0) {
      const base = generateDefaultName(config);
      setName(makeUniqueName(base, existingNames));
    }
  }, [existingNames]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameConflict = existingNames.has(name);

  const toggleSuite = (suite: string) => {
    if (suites.includes(suite)) {
      if (suites.length > 1) setSuites(suites.filter((s) => s !== suite));
    } else {
      setSuites([...suites, suite]);
    }
  };

  const handleLaunch = async () => {
    if (nameConflict) {
      setError('Name already exists. Choose a unique name.');
      return;
    }

    setLaunching(true);
    setError('');

    const benchConfig = {
      name,
      suites,
      runsPerCase,
      target: config,
      ...(mode === 'matrix' && matrix ? { matrix, baseTarget: config } : {}),
    };

    try {
      const response = await fetch(`${API_URL}/benchmark/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(benchConfig),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 409 && body.conflicts) {
          setError(`Name conflict: ${body.conflicts.join(', ')}. Choose unique names.`);
        } else {
          throw new Error(body.error || 'Failed to start benchmark');
        }
        return;
      }

      const { jobId } = await response.json();
      if (onJobStarted) {
        onJobStarted(jobId);
      }
      onStarted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="new-benchmark-panel">
      <div className="panel-header">
        <h3>Nouveau benchmark</h3>
        <button className="panel-close" onClick={onClose}>Close</button>
      </div>

      <div className="panel-body">
        <div className="panel-field">
          <label>Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={nameConflict ? 'input-error' : ''}
          />
          {nameConflict && (
            <div className="panel-field-error">This name is already used by an existing benchmark.</div>
          )}
        </div>

        <div className="panel-field">
          <label>Mode</label>
          <div className="mode-toggle">
            <button className={mode === 'single' ? 'active' : ''} onClick={() => setMode('single')}>
              Config unique
            </button>
            <button className={mode === 'matrix' ? 'active' : ''} onClick={() => setMode('matrix')}>
              Matrice
            </button>
          </div>
        </div>

        <div className="panel-field">
          <label>Suites</label>
          <div className="suite-checkboxes">
            {ALL_SUITES.map((s) => (
              <label key={s} className="suite-checkbox">
                <input type="checkbox" checked={suites.includes(s)} onChange={() => toggleSuite(s)} />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div className="panel-field">
          <label>Runs par cas</label>
          <select value={runsPerCase} onChange={(e) => setRunsPerCase(parseInt(e.target.value))}>
            <option value={1}>1</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
          </select>
        </div>

        {mode === 'single' ? (
          <ConfigBuilder config={config} onChange={setConfig} />
        ) : (
          <MatrixBuilder onMatrixChange={setMatrix} />
        )}

        {error && <div className="panel-error">{error}</div>}

        <button className="launch-button" onClick={handleLaunch} disabled={launching || nameConflict}>
          {launching ? 'Lancement...' : 'Lancer le benchmark'}
        </button>
      </div>
    </div>
  );
};

export default NewBenchmarkPanel;
