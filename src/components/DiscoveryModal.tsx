import React, { useState, useEffect } from 'react';
import ModalDialog from 'react-basic-modal-dialog';

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
      setDate('');
    }
  }, [mode, discoveryData]);

  const handleSave = () => {
    const newDiscoveryData: DiscoveryData = {
      discovery_id: mode === 'edit' && discoveryData ? discoveryData.discovery_id : generateUniqueId(),
      title,
      goal,
      date,
      // Initialize arrays for new discovery or use existing data for edit
      inputs: discoveryData?.inputs || [],
      facts: discoveryData?.facts || [],
      insights: discoveryData?.insights || [],
      recommendations: discoveryData?.recommendations || [],
      outputs: discoveryData?.outputs || [],
    };
    setDiscoveryData(newDiscoveryData);
    closeDialog();
  };

  return (
    <ModalDialog isDialogVisible={isDialogVisible} closeDialog={closeDialog}>
      <h2>{mode === 'add' ? 'Add New Discovery' : 'Edit Discovery'}</h2>
      <form>
        <label htmlFor="discovery-title">Title</label>
        <input
          id="discovery-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="discovery-goal">Goal</label>
        <textarea
          id="discovery-goal"
          rows={10}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <label htmlFor="discovery-date">Date</label>
        <input
          id="discovery-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </form>
      <button onClick={closeDialog}>Close</button>
      <button onClick={handleSave}>{mode === 'add' ? 'Add' : 'Save'}</button>
    </ModalDialog>
  );
};

// Utility function to generate a unique ID for new discoveries
const generateUniqueId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export default DiscoveryModal;
