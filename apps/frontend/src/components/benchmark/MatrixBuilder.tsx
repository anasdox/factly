import React, { useState } from 'react';

interface MatrixBuilderProps {
  onMatrixChange: (matrix: any) => void;
}

const MatrixBuilder: React.FC<MatrixBuilderProps> = ({ onMatrixChange }) => {
  const [models, setModels] = useState<string[]>(['gpt-4o']);
  const [tempExtractions, setTempExtractions] = useState<number[]>([0.2]);
  const [tempDedups, setTempDedups] = useState<number[]>([0.1]);
  const [tempImpacts, setTempImpacts] = useState<number[]>([0.1]);
  const [tempProposals, setTempProposals] = useState<number[]>([0.3]);

  const ALL_MODELS = ['gpt-4o', 'gpt-4.1', 'gpt-4o-mini', 'claude-sonnet-4-5-20250929'];
  const TEMP_OPTIONS = [0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5];

  const totalCombinations = models.length * tempExtractions.length * tempDedups.length * tempImpacts.length * tempProposals.length;

  const toggleValue = <T,>(arr: T[], val: T, setter: (v: T[]) => void) => {
    if (arr.includes(val)) {
      if (arr.length > 1) setter(arr.filter((v) => v !== val));
    } else {
      setter([...arr, val]);
    }
  };

  React.useEffect(() => {
    onMatrixChange({
      model: models,
      tempExtraction: tempExtractions,
      tempDedup: tempDedups,
      tempImpact: tempImpacts,
      tempProposal: tempProposals,
    });
  }, [models, tempExtractions, tempDedups, tempImpacts, tempProposals, onMatrixChange]);

  return (
    <div className="matrix-builder">
      <h4>Matrice de test</h4>

      <div className="matrix-section">
        <label>Models</label>
        <div className="matrix-options">
          {ALL_MODELS.map((m) => (
            <button key={m}
              className={`matrix-option ${models.includes(m) ? 'selected' : ''}`}
              onClick={() => toggleValue(models, m, setModels)}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="matrix-section">
        <label>Temp extraction</label>
        <div className="matrix-options">
          {TEMP_OPTIONS.map((t) => (
            <button key={t}
              className={`matrix-option ${tempExtractions.includes(t) ? 'selected' : ''}`}
              onClick={() => toggleValue(tempExtractions, t, setTempExtractions)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="matrix-section">
        <label>Temp dedup</label>
        <div className="matrix-options">
          {TEMP_OPTIONS.filter((t) => t <= 0.3).map((t) => (
            <button key={t}
              className={`matrix-option ${tempDedups.includes(t) ? 'selected' : ''}`}
              onClick={() => toggleValue(tempDedups, t, setTempDedups)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="matrix-section">
        <label>Temp impact</label>
        <div className="matrix-options">
          {TEMP_OPTIONS.filter((t) => t <= 0.3).map((t) => (
            <button key={t}
              className={`matrix-option ${tempImpacts.includes(t) ? 'selected' : ''}`}
              onClick={() => toggleValue(tempImpacts, t, setTempImpacts)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="matrix-section">
        <label>Temp proposal</label>
        <div className="matrix-options">
          {TEMP_OPTIONS.map((t) => (
            <button key={t}
              className={`matrix-option ${tempProposals.includes(t) ? 'selected' : ''}`}
              onClick={() => toggleValue(tempProposals, t, setTempProposals)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="matrix-summary">
        <strong>{totalCombinations}</strong> combinaisons totales
      </div>
    </div>
  );
};

export default MatrixBuilder;
