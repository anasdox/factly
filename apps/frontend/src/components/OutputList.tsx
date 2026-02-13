import React, { useCallback, useState } from 'react';
import OutputItem from './OutputItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import OutputModal from './OutputModal';
import ProposalPanel from './ProposalPanel';
import { createNewVersion, clearStatus } from '../lib';
import { API_URL } from '../config';

type Props = {
  outputRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;
  onError: (msg: string) => void;
  onInfo: (msg: string) => void;
  onWaiting: (msg: string) => void;
  backendAvailable: boolean;
  onViewTraceability: (entityType: string, entityId: string) => void;
};

const OutputList: React.FC<Props> = ({ outputRefs, data, setData, handleMouseEnter, handleMouseLeave, onError, onInfo, onWaiting, backendAvailable, onViewTraceability }) => {

  const [isOutputDialogVisible, setIsOutputDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingOutput, setEditingOutput] = useState<ItemType | null>(null);
  const setOutputRef = useCallback((element: HTMLDivElement, index: number) => { outputRefs.current[index] = element; }, [outputRefs]);

  // Proposal state
  const [proposalTarget, setProposalTarget] = useState<string | null>(null);
  const [proposalData, setProposalData] = useState<{ proposed_text: string; explanation: string } | null>(null);

  const openAddModal = () => {
    setModalMode('add');
    setEditingOutput(null);
    setIsOutputDialogVisible(true);
  };

  const openEditModal = (item: ItemType) => {
    setModalMode('edit');
    setEditingOutput(item);
    setIsOutputDialogVisible(true);
  };

  const saveOutput = (outputData: OutputType) => {
    if (modalMode === 'add') {
      const newOutput: OutputType = {
        output_id: Math.random().toString(16).slice(2),
        text: outputData.text,
        related_recommendations: outputData.related_recommendations,
        type: outputData.type || 'report',
        version: 1,
        status: 'draft',
        created_at: new Date().toISOString(),
      };
      setData((prevState) => prevState ? ({
        ...prevState,
        outputs: [...prevState.outputs, newOutput]
      }) : prevState);
    } else if (modalMode === 'edit' && outputData.output_id) {
      const existing = data.outputs.find(o => o.output_id === outputData.output_id);
      if (existing && existing.text !== outputData.text) {
          onWaiting('Creating new version...');
          const versioned = createNewVersion(existing, outputData.text) as OutputType;
          const updated = { ...versioned, ...outputData, text: versioned.text, version: versioned.version, status: versioned.status, created_at: versioned.created_at, versions: versioned.versions };
          const updatedOutputs = data.outputs.map(o => o.output_id === outputData.output_id ? updated : o);
          setData((prevState) => prevState ? ({ ...prevState, outputs: updatedOutputs }) : prevState);
          onInfo(`Updated to v${updated.version}. No downstream items (terminal entity).`);
      } else {
        const updatedOutputs = data.outputs.map(o => o.output_id === outputData.output_id ? { ...o, ...outputData } : o);
        setData((prevState) => prevState ? ({ ...prevState, outputs: updatedOutputs }) : prevState);
      }
    }
    setIsOutputDialogVisible(false);
  };

  const deleteOutput = (outputId: string) => {
    const updatedOutputs = data.outputs.filter((output) => output.output_id!== outputId);
    setData((prevState) => prevState ? ({
        ...prevState,
        outputs: updatedOutputs
      }) : prevState);
  };

  const handleClearStatus = (outputId: string) => {
    setData((prevState) => prevState ? clearStatus(prevState, 'output', outputId) : prevState);
  };

  const handleProposeUpdate = async (output: OutputType) => {
    const parentRec = data.recommendations.find(r => output.related_recommendations.includes(r.recommendation_id));
    if (!parentRec) {
      onError('No related recommendation found for this output.');
      return;
    }

    onWaiting('Generating update proposal...');

    const oldText = parentRec.versions && parentRec.versions.length > 0
      ? parentRec.versions[parentRec.versions.length - 1].text
      : '';

    try {
      const response = await fetch(`${API_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'output',
          current_text: output.text,
          upstream_change: { old_text: oldText, new_text: parentRec.text, entity_type: 'recommendation' },
          goal: data.goal,
          output_type: output.type,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        onError(body.error || 'Proposal request failed');
        return;
      }
      const result = await response.json();
      onInfo('Update proposal ready.');
      setProposalTarget(output.output_id);
      setProposalData(result);
    } catch (err: any) {
      onError(err.message || 'Proposal request failed');
    }
  };

  const acceptProposal = (outputId: string, text: string) => {
    const existing = data.outputs.find(o => o.output_id === outputId);
    if (!existing) return;
    const versioned = createNewVersion(existing, text) as OutputType;
    const updated = { ...versioned, type: existing.type };
    const updatedOutputs = data.outputs.map(o => o.output_id === outputId ? updated : o);
    let updatedData = { ...data, outputs: updatedOutputs };
    updatedData = clearStatus(updatedData, 'output', outputId);
    setData(updatedData);
    setProposalTarget(null);
    setProposalData(null);
    onInfo(`Output updated to v${updated.version}.`);
  };

  return (
    <div className="column outputs">
      <div className="column-header">
        <h2>📤Outputs</h2>
        <button className="header-add-button" onClick={openAddModal} title="Add Output"><FontAwesomeIcon icon={faAdd} /></button>
      </div>
      {data.outputs.length === 0 && (
        <p className="empty-state-hint">Select recommendations to formulate deliverables.</p>
      )}
      {data.outputs.map((output, index) => (
        <React.Fragment key={output.output_id}>
          <ItemWrapper
            id={"output-" + output.output_id}
            index={index}
            item={output}
            setItemRef={setOutputRef}
            handleMouseEnter={() => handleMouseEnter("output", output.output_id, data)}
            handleMouseLeave={() => handleMouseLeave("output", output.output_id, data)}
            openEditModal={openEditModal}
            onViewTraceability={() => onViewTraceability("output", output.output_id)}
            onClearStatus={() => handleClearStatus(output.output_id)}
            onProposeUpdate={() => handleProposeUpdate(output)}
            backendAvailable={backendAvailable}
          >
            <OutputItem
              output={output}
            />
          </ItemWrapper>
        </React.Fragment>
      ))}
      <OutputModal
        mode={modalMode}
        isDialogVisible={isOutputDialogVisible}
        closeDialog={() => setIsOutputDialogVisible(false)}
        saveOutput={saveOutput}
        deleteOutput={deleteOutput}
        outputData={editingOutput as OutputType}
        recommendations={data.recommendations}
      />
      {proposalTarget && proposalData && (
        <ProposalPanel
          currentText={data.outputs.find(o => o.output_id === proposalTarget)?.text || ''}
          proposedText={proposalData.proposed_text}
          explanation={proposalData.explanation}
          overlay
          renderMarkdown
          onAccept={(text) => acceptProposal(proposalTarget, text)}
          onReject={() => { setProposalTarget(null); setProposalData(null); }}
        />
      )}
    </div>
  );
};

export default OutputList;
