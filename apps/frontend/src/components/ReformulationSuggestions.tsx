import React from 'react';

export type ReformulationSuggestion = {
  text: string;
  justification: string;
};

type Props = {
  suggestions: ReformulationSuggestion[];
  onSelect: (text: string) => void;
  onDismiss: () => void;
};

const ReformulationSuggestions: React.FC<Props> = ({ suggestions, onSelect, onDismiss }) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="reformulation-suggestions">
      <div className="reformulation-suggestions-header">
        <span>Suggestions</span>
        <button type="button" className="reformulation-dismiss" onClick={onDismiss}>&times;</button>
      </div>
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className="reformulation-suggestion-card"
          onClick={() => onSelect(suggestion.text)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onSelect(suggestion.text); }}
        >
          <div className="reformulation-suggestion-text">{suggestion.text}</div>
          {suggestion.justification && (
            <div className="reformulation-suggestion-justification">{suggestion.justification}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReformulationSuggestions;
