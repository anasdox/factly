import React, { useCallback, useEffect, useState } from 'react';
import FactItem from './FactItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd, faWandMagicSparkles, faLightbulb, faXmark, faSpinner, faCheckDouble, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import Modal from './Modal';
import FactModal from './FactModal';
import InsightModal from './InsightModal';
import MergeDialog from './MergeDialog';
import BatchDedupReviewPanel from './BatchDedupReviewPanel';
import ProposalPanel from './ProposalPanel';
import SuggestionsPanel from './SuggestionsPanel';
import { useItemSelection } from '../hooks/useItemSelection';
import { API_URL } from '../config';
import { createNewVersion, propagateImpact, clearStatus, getDirectChildren } from '../lib';
import { findDuplicates } from '../dedup';
import { checkImpact } from '../impact';
import { useMergeDialog } from '../hooks/useMergeDialog';
import { useBatchDedupQueue } from '../hooks/useBatchDedupQueue';
import { ChatToolAction } from './ChatWidget';

type Props = {
  factRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
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

type InsightSuggestionData = {
  suggestions: { text: string }[];
  factIds: string[];
};

type ProposalState = {
  factId: string;
  proposedText: string;
  loading: boolean;
};

const FactList: React.FC<Props> = ({ factRefs, data, setData, handleMouseEnter, handleMouseLeave, onError, onInfo, onWaiting, backendAvailable, onViewTraceability, chatActions, clearChatActions, requestConfirm }) => {

  const [isFactDialogVisible, setIsFactDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingFact, setEditingFact] = useState<ItemType | null>(null);
  const setFactRef = useCallback((element: HTMLDivElement, index: number) => { factRefs.current[index] = element; }, [factRefs]);

  // Fact selection state
  const { selectedIds: selectedFactIds, toggleSelection: toggleFactSelection, clearSelection, selectAll } = useItemSelection(data.facts.map(f => f.fact_id));
  const [extractingInsights, setExtractingInsights] = useState(false);

  // Clear selection when discovery changes
  useEffect(() => { clearSelection(); }, [data.discovery_id, clearSelection]);
  const [insightSuggestionData, setInsightSuggestionData] = useState<InsightSuggestionData | null>(null);

  const [isInsightModalVisible, setIsInsightModalVisible] = useState(false);

  // Dedup / merge dialog state
  const mergeDialog = useMergeDialog<FactType>();

  // Batch dedup queue for accepted insight suggestions
  const insightDedupQueue = useBatchDedupQueue<InsightType>();

  // AI proposal state
  const [proposal, setProposal] = useState<ProposalState | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const openAddModal = () => {
    setModalMode('add');
    setEditingFact(null);
    setIsFactDialogVisible(true);
  };

  const openEditModal = (item: ItemType) => {
    setModalMode('edit');
    setEditingFact(item);
    setIsFactDialogVisible(true);
  };

  // Handle chat tool actions targeting facts
  useEffect(() => {
    if (!chatActions?.length || !clearChatActions) return;
    const matching = chatActions.filter(a => a.params.entity_type === 'fact');
    if (!matching.length) return;

    clearChatActions(a => a.params.entity_type === 'fact');

    // Batch deletes into one confirmation
    const deletes = matching.filter(a => a.tool === 'delete_item');
    if (deletes.length > 0 && requestConfirm) {
      const ids = deletes.flatMap(a =>
        Array.isArray(a.params.item_ids) ? (a.params.item_ids as string[]) : a.params.item_id ? [String(a.params.item_id)] : []
      );
      const items = data.facts.filter(f => ids.includes(f.fact_id));
      if (items.length > 0) {
        const label = items.length === 1
          ? `Delete fact "${items[0].text.substring(0, 50)}"?`
          : `Delete ${items.length} facts?`;
        const idsToDelete = new Set(items.map(i => i.fact_id));
        requestConfirm(label, () => {
          setData(prev => prev ? { ...prev, facts: prev.facts.filter(f => !idsToDelete.has(f.fact_id)) } : prev);
        });
      }
    }

    // Handle first add action
    const add = matching.find(a => a.tool === 'add_item');
    if (add) {
      setModalMode('add');
      setEditingFact({
        fact_id: '',
        text: String(add.params.text || ''),
        related_inputs: Array.isArray(add.params.related_ids) ? add.params.related_ids as string[] : [],
      } as unknown as ItemType);
      setIsFactDialogVisible(true);
    }

    if (!add) {
      const edit = matching.find(a => a.tool === 'edit_item');
      if (edit) {
        const fact = data.facts.find(f => f.fact_id === edit.params.item_id);
        if (fact) {
          setModalMode('edit');
          setEditingFact({
            ...fact,
            text: String(edit.params.new_text || fact.text),
          } as unknown as ItemType);
          setIsFactDialogVisible(true);
        }
      }
    }
  }, [chatActions]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFactToState = async (newFact: FactType) => {
    setData((prevState) => prevState ? ({
      ...prevState,
      facts: [...prevState.facts, newFact]
    }) : prevState);

    // Check impact on existing insights
    if (data.insights.length > 0 && backendAvailable) {
      onWaiting('Checking impact on existing insights…');
      const candidates = data.insights.map(i => ({ id: i.insight_id, text: i.text }));
      const { ids: impactedIds, usedFallback } = await checkImpact('', newFact.text, candidates, backendAvailable);
      if (impactedIds.length > 0) {
        setData(prev => prev ? ({
          ...prev,
          insights: prev.insights.map(i =>
            impactedIds.includes(i.insight_id)
              ? { ...i, status: 'needs_review' as const, related_facts: Array.from(new Set([...i.related_facts, newFact.fact_id])) }
              : i
          ),
        }) : prev);
        const fallbackHint = usedFallback ? ' (AI unavailable — all insights marked)' : '';
        onInfo(`Fact added. ${impactedIds.length} insight(s) marked for review and linked.${fallbackHint}`);
      } else {
        onInfo('Fact added. No existing insights impacted.');
      }
    }
  };

  const saveFact = async (factData: FactType) => {
    if (modalMode === 'add') {
      const newFact: FactType = {
        fact_id: Math.random().toString(16).slice(2),
        text: factData.text,
        related_inputs: factData.related_inputs,
        version: 1,
        status: 'draft',
        created_at: new Date().toISOString(),
      };

      // Check for duplicates before adding
      onWaiting('Checking for duplicates…');
      const duplicates = await findDuplicates(
        factData.text,
        data.facts.map(f => ({ id: f.fact_id, text: f.text })),
        backendAvailable,
      );

      if (duplicates.length > 0) {
        onInfo('Similar fact found — please review.');
        mergeDialog.show(newFact, duplicates[0]);
        setIsFactDialogVisible(false);
        return;
      }

      onInfo('No duplicates found. Fact added.');
      addFactToState(newFact);
    } else if (modalMode === 'edit' && factData.fact_id) {
      const existing = data.facts.find(f => f.fact_id === factData.fact_id);
      const textChanged = existing && existing.text !== factData.text;

      if (textChanged && existing) {
          onWaiting('Creating new version and analyzing impact on related insights...');
          const versioned = createNewVersion(existing, factData.text) as FactType;
          const children = getDirectChildren('fact', factData.fact_id, data);
          const { ids: impactedIds, usedFallback } = await checkImpact(existing.text, factData.text, children, backendAvailable);
          const { data: propagated, impactedCount } = propagateImpact(data, 'fact', factData.fact_id, 'edited', impactedIds);
          const updatedFacts = propagated.facts.map(f =>
            f.fact_id === factData.fact_id ? { ...versioned, related_inputs: factData.related_inputs } : f
          );
          setData({ ...propagated, facts: updatedFacts });
          const fallbackHint = usedFallback ? ' (AI unavailable — all children marked)' : '';
          onInfo(`Updated to v${versioned.version}. ${impactedCount} downstream item(s) marked for review.${fallbackHint}`);
      } else {
        // No text change — update fields and check if links changed
        const linksChanged = existing &&
          JSON.stringify([...existing.related_inputs].sort()) !== JSON.stringify([...factData.related_inputs].sort());

        const updatedFacts = data.facts.map((fact) =>
          fact.fact_id === factData.fact_id ? { ...fact, ...factData } : fact
        );
        setData((prevState) => prevState ? ({
          ...prevState,
          facts: updatedFacts
        }) : prevState);

        // Mark as needs_review if links changed
        if (linksChanged) {
          setData(prev => prev ? ({
            ...prev,
            facts: prev.facts.map(f =>
              f.fact_id === factData.fact_id ? { ...f, status: 'needs_review' as const } : f
            ),
          }) : prev);
          onInfo('Sources changed — fact marked for review.');
        }
      }
    }
    setIsFactDialogVisible(false);
  };

  // MergeDialog callbacks use the hook

  const deleteFact = (factId: string) => {
    const updatedFacts = data.facts.filter((fact) => fact.fact_id !== factId);
    setData((prevState) => prevState ? ({
      ...prevState,
      facts: updatedFacts
    }) : prevState);
  };

  // Clear status (confirm-valid)
  const handleClearStatus = (factId: string) => {
    setData(prev => prev ? clearStatus(prev, 'fact', factId) : prev);
  };

  // AI propose update
  const handleProposeUpdate = async (fact: FactType) => {
    const parentInputId = fact.related_inputs[0];
    if (!parentInputId) {
      onError('No related input found for this fact.');
      return;
    }

    const parentInput = data.inputs.find(i => i.input_id === parentInputId);
    if (!parentInput) {
      onError('Related input not found in data.');
      return;
    }

    setProposal({ factId: fact.fact_id, proposedText: '', loading: true });
    onWaiting('Generating update proposal...');

    try {
      const oldText = parentInput.versions && parentInput.versions.length > 0
        ? parentInput.versions[parentInput.versions.length - 1].text
        : '';

      const response = await fetch(`${API_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'fact',
          current_text: fact.text,
          upstream_change: {
            old_text: oldText,
            new_text: parentInput.text || '',
            entity_type: 'input',
          },
          goal: data.goal,
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        onError(body.error || 'Proposal request failed');
        setProposal(null);
        return;
      }

      const result = await response.json();
      onInfo('Update proposal ready.');
      setProposal({ factId: fact.fact_id, proposedText: result.proposed_text || result.text || '', loading: false });
    } catch (err: any) {
      onError(err.message || 'Proposal request failed');
      setProposal(null);
    }
  };

  const handleAcceptProposal = async (text: string) => {
    if (!proposal) return;
    const fact = data.facts.find(f => f.fact_id === proposal.factId);
    if (!fact) return;

    const versioned = createNewVersion(fact, text) as FactType;
    const cleared = clearStatus(data, 'fact', proposal.factId);
    const children = getDirectChildren('fact', proposal.factId, cleared);
    const { ids: impactedIds, usedFallback } = await checkImpact(fact.text, text, children, backendAvailable);
    const { data: propagated, impactedCount } = propagateImpact(cleared, 'fact', proposal.factId, 'edited', impactedIds);
    const updatedFacts = propagated.facts.map(f =>
      f.fact_id === proposal.factId ? versioned : f
    );
    setData({ ...propagated, facts: updatedFacts });
    const fallbackHint = usedFallback ? ' (AI unavailable — all children marked)' : '';
    onInfo(`Updated to v${versioned.version}. ${impactedCount} downstream item(s) marked for review.${fallbackHint}`);
    setProposal(null);
  };

  const handleRejectProposal = () => {
    setProposal(null);
  };

  // Generate insights from selected facts
  const handleExtractInsights = async () => {
    const selected = data.facts.filter(f => selectedFactIds.has(f.fact_id));
    if (selected.length === 0) return;

    setExtractingInsights(true);
    onWaiting('Generating insights...');
    try {
      const response = await fetch(`${API_URL}/extract/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facts: selected.map(f => ({ fact_id: f.fact_id, text: f.text })),
          goal: data.goal,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        onError(body.error || 'Insights extraction failed');
        return;
      }
      const result = await response.json();
      if (result.suggestions.length === 0) {
        onError('No insights could be derived from the selected facts.');
        return;
      }
      onInfo(`Generated ${result.suggestions.length} suggestion(s).`);
      setInsightSuggestionData({ suggestions: result.suggestions, factIds: result.fact_ids });
    } catch (err: any) {
      onError(err.message || 'Insights extraction request failed');
    } finally {
      setExtractingInsights(false);
    }
  };

  const addInsightToData = useCallback(async (text: string, relatedFacts: string[]) => {
    const newInsight: InsightType = {
      insight_id: Math.random().toString(16).slice(2),
      text,
      related_facts: relatedFacts,
    };
    setData((prevState) => prevState ? ({
      ...prevState,
      insights: [...prevState.insights, newInsight],
    }) : prevState);

    // Check impact on existing recommendations
    if (data.recommendations.length > 0 && backendAvailable) {
      onWaiting('Checking impact on existing recommendations…');
      const candidates = data.recommendations.map(r => ({ id: r.recommendation_id, text: r.text }));
      const { ids: impactedIds, usedFallback } = await checkImpact('', text, candidates, backendAvailable);
      if (impactedIds.length > 0) {
        setData(prev => prev ? ({
          ...prev,
          recommendations: prev.recommendations.map(r =>
            impactedIds.includes(r.recommendation_id)
              ? { ...r, status: 'needs_review' as const, related_insights: Array.from(new Set([...r.related_insights, newInsight.insight_id])) }
              : r
          ),
        }) : prev);
        const fallbackHint = usedFallback ? ' (AI unavailable — all recommendations marked)' : '';
        onInfo(`Insight added. ${impactedIds.length} recommendation(s) marked for review and linked.${fallbackHint}`);
      } else {
        onInfo('Insight added. No existing recommendations impacted.');
      }
    }
  }, [setData, data.recommendations, onWaiting, onInfo, backendAvailable]);

  const handleAcceptInsight = async (suggestion: { text: string; related_fact_ids?: string[] }) => {
    const relatedFacts = suggestion.related_fact_ids && suggestion.related_fact_ids.length > 0
      ? suggestion.related_fact_ids
      : Array.from(selectedFactIds);
    const newInsight: InsightType = {
      insight_id: Math.random().toString(16).slice(2),
      text: suggestion.text,
      related_facts: relatedFacts,
    };
    insightDedupQueue.trackStart();
    onWaiting('Checking for duplicates…');
    const duplicates = await findDuplicates(
      suggestion.text,
      data.insights.map(i => ({ id: i.insight_id, text: i.text })),
      backendAvailable,
    );
    if (duplicates.length > 0) {
      onInfo('Similar insight found — queued for review.');
      insightDedupQueue.enqueue(newInsight, duplicates[0]);
      return;
    }
    insightDedupQueue.trackComplete();
    onInfo('Insight added.');
    addInsightToData(suggestion.text, relatedFacts);
  };

  const addInsightFromMerge = useCallback(async (insight: InsightType) => {
    setData(prev => prev ? { ...prev, insights: [...prev.insights, insight] } : prev);

    // Check impact on existing recommendations
    if (data.recommendations.length > 0 && backendAvailable) {
      onWaiting('Checking impact on existing recommendations…');
      const candidates = data.recommendations.map(r => ({ id: r.recommendation_id, text: r.text }));
      const { ids: impactedIds, usedFallback } = await checkImpact('', insight.text, candidates, backendAvailable);
      if (impactedIds.length > 0) {
        setData(prev => prev ? ({
          ...prev,
          recommendations: prev.recommendations.map(r =>
            impactedIds.includes(r.recommendation_id)
              ? { ...r, status: 'needs_review' as const, related_insights: Array.from(new Set([...r.related_insights, insight.insight_id])) }
              : r
          ),
        }) : prev);
        const fallbackHint = usedFallback ? ' (AI unavailable — all recommendations marked)' : '';
        onInfo(`Insight added. ${impactedIds.length} recommendation(s) marked for review and linked.${fallbackHint}`);
      } else {
        onInfo('Insight added. No existing recommendations impacted.');
      }
    }
  }, [setData, data.recommendations, onWaiting, onInfo, backendAvailable]);

  const handleCloseSuggestions = useCallback(() => {
    setInsightSuggestionData(null);
    if (insightDedupQueue.queue.length > 0 || insightDedupQueue.inflight > 0) {
      insightDedupQueue.openReview();
    }
  }, [insightDedupQueue]);

  // Auto-close review panel if all inflight resolved and queue is empty
  useEffect(() => {
    if (insightDedupQueue.reviewVisible && insightDedupQueue.inflight === 0 && insightDedupQueue.queue.length === 0) {
      insightDedupQueue.reset();
    }
  }, [insightDedupQueue.reviewVisible, insightDedupQueue.inflight, insightDedupQueue.queue.length, insightDedupQueue]);

  const handleAddInsightFromSelection = () => {
    setIsInsightModalVisible(true);
  };

  const saveInsightFromSelection = (insightData: InsightType) => {
    addInsightToData(insightData.text, insightData.related_facts);
    setIsInsightModalVisible(false);
  };

  return (
    <div className="column facts">
      <div className="column-header">
        <h2>📊Facts</h2>
        {data.facts.length > 0 && selectedFactIds.size < data.facts.length && (
          <button className="select-all-button" onClick={() => selectAll(data.facts.map(f => f.fact_id))} title="Select all facts">
            <FontAwesomeIcon icon={faCheckDouble} /> Select All
          </button>
        )}
        <button className="header-add-button" onClick={openAddModal} title="Add Fact"><FontAwesomeIcon icon={faAdd} /></button>
      </div>
      <div className={`toolbar-wrapper${selectedFactIds.size > 0 ? ' toolbar-wrapper-open' : ''}`}>
        <div className="selection-toolbar">
          <span>{selectedFactIds.size} fact(s) selected</span>
          <button onClick={handleExtractInsights} disabled={extractingInsights || !backendAvailable} title={!backendAvailable ? 'Backend unavailable' : ''}>
            <FontAwesomeIcon icon={extractingInsights ? faSpinner : faWandMagicSparkles} spin={extractingInsights} />
            {' '}Generate Insights
          </button>
          <button onClick={handleAddInsightFromSelection}>
            <FontAwesomeIcon icon={faLightbulb} />
            {' '}Add Insight
          </button>
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
      {data.facts.length === 0 && (
        <p className="empty-state-hint">Extract facts from your inputs, or add them manually.</p>
      )}
      {data.facts.map((fact, index) => (
        <div
          key={fact.fact_id}
          onClick={() => toggleFactSelection(fact.fact_id)}
          className={selectedFactIds.has(fact.fact_id) ? 'item-selectable selected' : 'item-selectable'}
        >
          <ItemWrapper
            id={"fact-" + fact.fact_id}
            index={index}
            item={fact}
            setItemRef={setFactRef}
            handleMouseEnter={() => handleMouseEnter("fact", fact.fact_id, data)}
            handleMouseLeave={() => handleMouseLeave("fact", fact.fact_id, data)}
            openEditModal={openEditModal}
            onViewTraceability={() => onViewTraceability("fact", fact.fact_id)}
            onClearStatus={() => handleClearStatus(fact.fact_id)}
            onProposeUpdate={() => handleProposeUpdate(fact)}
            proposingUpdate={proposal?.loading && proposal.factId === fact.fact_id}
            backendAvailable={backendAvailable}
          >
            <FactItem fact={fact} />
          </ItemWrapper>
        </div>
      ))}
      <FactModal
        mode={modalMode}
        isDialogVisible={isFactDialogVisible}
        closeDialog={() => setIsFactDialogVisible(false)}
        saveFact={saveFact}
        deleteFact={deleteFact}
        factData={editingFact as FactType}
        inputs={data.inputs}
      />
      <InsightModal
        mode="add"
        isDialogVisible={isInsightModalVisible}
        closeDialog={() => setIsInsightModalVisible(false)}
        saveInsight={saveInsightFromSelection}
        deleteInsight={() => {}}
        insightData={{ insight_id: '', text: '', related_facts: Array.from(selectedFactIds) } as InsightType}
        facts={data.facts}
      />
      <Modal isVisible={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)} maxWidth="400px">
        <p style={{ margin: '0 0 1em' }}>Delete {selectedFactIds.size} selected fact(s)?</p>
        <div className="modal-actions">
          <div className="modal-action-group-left">
            <button className="modal-action-save" onClick={() => { setData(prev => prev ? { ...prev, facts: prev.facts.filter(f => !selectedFactIds.has(f.fact_id)) } : prev); clearSelection(); setConfirmBulkDelete(false); }}>Confirm</button>
          </div>
          <div className="modal-action-group-right">
            <button className="modal-action-close" onClick={() => setConfirmBulkDelete(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
      {insightSuggestionData && (
        <SuggestionsPanel
          suggestions={insightSuggestionData.suggestions}
          inputId="insights"
          title="Suggested Insights"
          onAccept={(suggestion) => handleAcceptInsight(suggestion)}
          onClose={handleCloseSuggestions}
        />
      )}
      <MergeDialog
        isVisible={mergeDialog.visible}
        newText={mergeDialog.pendingItem?.text || ''}
        existingItem={mergeDialog.match || { id: '', text: '', similarity: 0 }}
        onMerge={() => mergeDialog.handleMerge((pending, match) => {
          setData(prev => prev ? {
            ...prev,
            facts: prev.facts.map(f => f.fact_id === match.id
              ? { ...f, related_inputs: Array.from(new Set([...f.related_inputs, ...pending.related_inputs])) }
              : f),
          } : prev);
        })}
        onKeepAsVariant={() => mergeDialog.handleKeepAsVariant(addFactToState)}
        onForceAdd={() => mergeDialog.handleForceAdd(addFactToState)}
        onClose={mergeDialog.reset}
      />
      {insightDedupQueue.reviewVisible && insightDedupQueue.queue.length > 0 && (
        <BatchDedupReviewPanel<InsightType>
          entries={insightDedupQueue.queue}
          inflight={insightDedupQueue.inflight}
          getText={(item) => item.text}
          onResolve={insightDedupQueue.resolveEntry}
          onResolveAll={insightDedupQueue.resolveAll}
          onApply={() => insightDedupQueue.applyAll(
            (pending, match) => {
              setData(prev => prev ? {
                ...prev,
                insights: prev.insights.map(i => i.insight_id === match.id
                  ? { ...i, related_facts: Array.from(new Set([...i.related_facts, ...pending.related_facts])) }
                  : i),
              } : prev);
            },
            addInsightFromMerge,
          )}
          onClose={insightDedupQueue.reset}
        />
      )}
      {proposal && (
        <ProposalPanel
          currentText={data.facts.find(f => f.fact_id === proposal.factId)?.text || ''}
          proposedText={proposal.proposedText}
          loading={proposal.loading}
          overlay
          onAccept={handleAcceptProposal}
          onReject={handleRejectProposal}
        />
      )}
    </div>
  );
};

export default FactList;
