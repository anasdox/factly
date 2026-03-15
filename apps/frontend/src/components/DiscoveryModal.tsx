import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPlus, faFloppyDisk, faWandMagicSparkles, faSpinner } from '@fortawesome/free-solid-svg-icons';
import ReformulationSuggestions, { ReformulationSuggestion } from './ReformulationSuggestions';
import { API_URL } from '../config';

type Props = {
  mode: 'add' | 'edit';
  isDialogVisible: boolean;
  closeDialog: () => void;
  discoveryData: DiscoveryData | null;
  setDiscoveryData: (discoveryData: DiscoveryData) => void;
  backendAvailable?: boolean;
};

const DiscoveryModal: React.FC<Props> = ({
  mode,
  isDialogVisible,
  closeDialog,
  discoveryData,
  setDiscoveryData,
  backendAvailable,
}) => {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [date, setDate] = useState('');
  const [isReformulating, setIsReformulating] = useState(false);
  const [suggestions, setSuggestions] = useState<ReformulationSuggestion[]>([]);

  useEffect(() => {
    if (mode === 'edit' && discoveryData) {
      setTitle(discoveryData.title);
      setGoal(discoveryData.goal);
      setDate(discoveryData.date);
    } else {
      setTitle('');
      setGoal('');
      setDate(new Date().toISOString().split('T')[0]);
    }
    setSuggestions([]);
  }, [mode, discoveryData, isDialogVisible]);

  const handleSave = () => {
    const newDiscoveryData: DiscoveryData = {
      title,
      goal,
      date,
      inputs: mode === 'edit' && discoveryData ? discoveryData.inputs : [],
      facts: mode === 'edit' && discoveryData ? discoveryData.facts : [],
      insights: mode === 'edit' && discoveryData ? discoveryData.insights : [],
      recommendations: mode === 'edit' && discoveryData ? discoveryData.recommendations : [],
      outputs: mode === 'edit' && discoveryData ? discoveryData.outputs : [],
    };
    setDiscoveryData(newDiscoveryData);
    closeDialog();
  };

  const handleReformulate = async () => {
    setIsReformulating(true);
    setSuggestions([]);
    try {
      const response = await fetch(`${API_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: goal,
          entity_type: 'goal',
          goal: title || 'Discovery goal',
          related_items: [],
        }),
      });
      if (!response.ok) throw new Error('Reformulation failed');
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch {
      // Silently handle — user can retry
    } finally {
      setIsReformulating(false);
    }
  };

  return (
    <Modal isVisible={isDialogVisible} onClose={closeDialog}>
      <h2>{mode === 'add' ? 'Add New Discovery' : 'Edit Discovery'}</h2>
      <form>
        <label htmlFor="discovery-title">Title</label>
        <input
          id="discovery-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Customer Churn Analysis Q4"
        />
        <label htmlFor="discovery-goal">Goal</label>
        <textarea
          id="discovery-goal"
          rows={10}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Understand why customer churn increased by 15% in Q4 and identify actionable retention strategies"
        />
        <p className="discovery-modal-help">Describe what you want to discover. Factly uses this goal to guide fact extraction and insight generation.</p>
        {backendAvailable && (
          <div className="reformulate-button-wrapper">
            <button
              type="button"
              className="modal-action-reformulate"
              disabled={!goal.trim() || isReformulating}
              onClick={handleReformulate}
              title={!goal.trim() ? 'Enter a goal first' : 'Suggest alternative wordings'}
            >
              <FontAwesomeIcon icon={isReformulating ? faSpinner : faWandMagicSparkles} spin={isReformulating} /> Reformulate
            </button>
          </div>
        )}
        <ReformulationSuggestions
          suggestions={suggestions}
          onSelect={(text) => { setGoal(text); setSuggestions([]); }}
          onDismiss={() => setSuggestions([])}
        />
      </form>
      <div className='modal-actions'>
        <div className="modal-action-group-left">
          <button className='modal-action-save' onClick={handleSave} disabled={!title.trim() || !goal.trim()}>{mode === 'add' ? <><FontAwesomeIcon icon={faPlus} /> Add</> : <><FontAwesomeIcon icon={faFloppyDisk} /> Save</>}</button>
        </div>
        <div className="modal-action-group-right">
          <button className='modal-action-close' onClick={closeDialog}><FontAwesomeIcon icon={faXmark} /> Cancel</button>
        </div>
      </div>
    </Modal>
  );
};

export default DiscoveryModal;
