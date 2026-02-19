import React, { useCallback, useEffect, useState } from 'react';
import OutputItem from './OutputItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd, faXmark, faCheckDouble, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import Modal from './Modal';
import OutputModal from './OutputModal';
import ProposalPanel from './ProposalPanel';
import { useItemSelection } from '../hooks/useItemSelection';
import { createNewVersion, clearStatus } from '../lib';
import { API_URL } from '../config';
import { ChatToolAction } from './ChatWidget';

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
  chatActions?: ChatToolAction[];
  clearChatActions?: (filter: (a: ChatToolAction) => boolean) => void;
  requestConfirm?: (message: string, onConfirm: () => void) => void;
};

const OutputList: React.FC<Props> = ({ outputRefs, data, setData, handleMouseEnter, handleMouseLeave, onError, onInfo, onWaiting, backendAvailable, onViewTraceability, chatActions, clearChatActions, requestConfirm }) => {

  const [isOutputDialogVisible, setIsOutputDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingOutput, setEditingOutput] = useState<ItemType | null>(null);
  const setOutputRef = useCallback((element: HTMLDivElement, index: number) => { outputRefs.current[index] = element; }, [outputRefs]);

  // Proposal state
  const [proposalTarget, setProposalTarget] = useState<string | null>(null);
  const [proposalData, setProposalData] = useState<{ proposed_text: string; explanation: string } | null>(null);
  const [proposingUpdateId, setProposingUpdateId] = useState<string | null>(null);
  const { selectedIds: selectedOutputIds, toggleSelection: toggleOutputSelection, clearSelection, selectAll } = useItemSelection(data.outputs.map(o => o.output_id));
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

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

  // Handle chat tool actions targeting outputs
  useEffect(() => {
    if (!chatActions?.length || !clearChatActions) return;
    const matching = chatActions.filter(a => a.params.entity_type === 'output');
    if (!matching.length) return;

    clearChatActions(a => a.params.entity_type === 'output');

    // Batch deletes into one confirmation
    const deletes = matching.filter(a => a.tool === 'delete_item');
    if (deletes.length > 0 && requestConfirm) {
      const ids = deletes.flatMap(a =>
        Array.isArray(a.params.item_ids) ? (a.params.item_ids as string[]) : a.params.item_id ? [String(a.params.item_id)] : []
      );
      const items = data.outputs.filter(o => ids.includes(o.output_id));
      if (items.length > 0) {
        const label = items.length === 1
          ? `Delete output "${items[0].text.substring(0, 50)}"?`
          : `Delete ${items.length} outputs?`;
        const idsToDelete = new Set(items.map(i => i.output_id));
        requestConfirm(label, () => {
          setData(prev => prev ? { ...prev, outputs: prev.outputs.filter(o => !idsToDelete.has(o.output_id)) } : prev);
        });
      }
    }

    // Handle first add action
    const add = matching.find(a => a.tool === 'add_item');
    if (add) {
      setModalMode('add');
      setEditingOutput({
        output_id: '',
        text: String(add.params.text || ''),
        related_recommendations: Array.isArray(add.params.related_ids) ? add.params.related_ids as string[] : [],
        type: String(add.params.output_type || 'report') as OutputType['type'],
      } as unknown as ItemType);
      setIsOutputDialogVisible(true);
    }

    if (!add) {
      const edit = matching.find(a => a.tool === 'edit_item');
      if (edit) {
        const output = data.outputs.find(o => o.output_id === edit.params.item_id);
        if (output) {
          setModalMode('edit');
          setEditingOutput({
            ...output,
            text: String(edit.params.new_text || output.text),
          } as unknown as ItemType);
          setIsOutputDialogVisible(true);
        }
      }
    }
  }, [chatActions]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveOutput = async (outputData: OutputType) => {
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
        // No text change — update fields and check if links changed
        const linksChanged = existing &&
          JSON.stringify([...existing.related_recommendations].sort()) !== JSON.stringify([...outputData.related_recommendations].sort());

        const updatedOutputs = data.outputs.map(o => o.output_id === outputData.output_id ? { ...o, ...outputData } : o);
        setData((prevState) => prevState ? ({ ...prevState, outputs: updatedOutputs }) : prevState);

        // Mark as needs_refresh if links changed (output is terminal entity)
        if (linksChanged) {
          setData(prev => prev ? ({
            ...prev,
            outputs: prev.outputs.map(o =>
              o.output_id === outputData.output_id ? { ...o, status: 'needs_refresh' as const } : o
            ),
          }) : prev);
          onInfo('Sources changed — output marked for refresh.');
        }
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

    setProposingUpdateId(output.output_id);
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
    } finally {
      setProposingUpdateId(null);
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
        {data.outputs.length > 0 && selectedOutputIds.size < data.outputs.length && (
          <button className="select-all-button" onClick={() => selectAll(data.outputs.map(o => o.output_id))} title="Select all outputs">
            <FontAwesomeIcon icon={faCheckDouble} /> Select All
          </button>
        )}
        <button className="header-add-button" onClick={openAddModal} title="Add Output"><FontAwesomeIcon icon={faAdd} /></button>
      </div>
      <div className={`toolbar-wrapper${selectedOutputIds.size > 0 ? ' toolbar-wrapper-open' : ''}`}>
        <div className="selection-toolbar">
          <span>{selectedOutputIds.size} output(s) selected</span>
          <button onClick={() => setConfirmBulkDelete(true)}>
            <FontAwesomeIcon icon={faTrashCan} />
            {' '}Delete
          </button>
          <button onClick={clearSelection}>
            <FontAwesomeIcon icon={faXmark} />
            {' '}Clear
          </button>
        </div>
      </div>
      {data.outputs.length === 0 && (
        <p className="empty-state-hint">Select recommendations to formulate deliverables.</p>
      )}
      {data.outputs.map((output, index) => (
        <div
          key={output.output_id}
          onClick={() => toggleOutputSelection(output.output_id)}
          className={selectedOutputIds.has(output.output_id) ? 'item-selectable selected' : 'item-selectable'}
        >
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
            proposingUpdate={proposingUpdateId === output.output_id}
            backendAvailable={backendAvailable}
          >
            <OutputItem
              output={output}
            />
          </ItemWrapper>
        </div>
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
      <Modal isVisible={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)} maxWidth="400px">
        <p style={{ margin: '0 0 1em' }}>Delete {selectedOutputIds.size} selected output(s)?</p>
        <div className="modal-actions">
          <div className="modal-action-group-left">
            <button className="modal-action-save" onClick={() => { setData(prev => prev ? { ...prev, outputs: prev.outputs.filter(o => !selectedOutputIds.has(o.output_id)) } : prev); clearSelection(); setConfirmBulkDelete(false); }}>Confirm</button>
          </div>
          <div className="modal-action-group-right">
            <button className="modal-action-close" onClick={() => setConfirmBulkDelete(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
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
