import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPlus, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

type Props = {
  mode: 'add' | 'edit';
  isDialogVisible: boolean;
  closeDialog: () => void;
  discoveryData: DiscoveryData | null;
  setDiscoveryData: (discoveryData: DiscoveryData) => void;
};

const DiscoveryModal: React.FC<Props> = ({
  mode,
  isDialogVisible,
  closeDialog,
  discoveryData,
  setDiscoveryData,
}) => {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (mode === 'edit' && discoveryData) {
      setTitle(discoveryData.title);
      setGoal(discoveryData.goal);
      setDate(discoveryData.date);
    } else {
      // Reset fields for new discovery creation
      setTitle('');
      setGoal('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [mode, discoveryData]);

  const handleSave = () => {
    const newDiscoveryData: DiscoveryData = {
      discovery_id: mode === 'edit' && discoveryData ? discoveryData.discovery_id : generateUniqueId(),
      title,
      goal,
      date,
      // Keep existing items only when editing; start fresh for new discovery
      inputs: mode === 'edit' && discoveryData ? discoveryData.inputs : [],
      facts: mode === 'edit' && discoveryData ? discoveryData.facts : [],
      insights: mode === 'edit' && discoveryData ? discoveryData.insights : [],
      recommendations: mode === 'edit' && discoveryData ? discoveryData.recommendations : [],
      outputs: mode === 'edit' && discoveryData ? discoveryData.outputs : [],
    };
    setDiscoveryData(newDiscoveryData);
    closeDialog();
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
        <p className="discovery-modal-help">Describe what you want to discover. The AI uses this goal to guide fact extraction and insight generation.</p>
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

// Utility function to generate a unique ID for new discoveries
const generateUniqueId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export default DiscoveryModal;
