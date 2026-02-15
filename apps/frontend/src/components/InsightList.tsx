import React, { useCallback, useEffect, useState } from 'react';
import InsightItem from './InsightItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd, faWandMagicSparkles, faClipboardList, faXmark, faSpinner, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import InsightModal from './InsightModal';
import RecommendationModal from './RecommendationModal';
import SuggestionsPanel from './SuggestionsPanel';
import MergeDialog from './MergeDialog';
import BatchDedupReviewPanel from './BatchDedupReviewPanel';
import ProposalPanel from './ProposalPanel';
import { useItemSelection } from '../hooks/useItemSelection';
import { API_URL } from '../config';
import { createNewVersion, propagateImpact, clearStatus, getDirectChildren } from '../lib';
import { findDuplicates } from '../dedup';
import { checkImpact } from '../impact';
import { useMergeDialog } from '../hooks/useMergeDialog';
import { useBatchDedupQueue } from '../hooks/useBatchDedupQueue';

type Props = {
  insightRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
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

type RecommendationSuggestionData = {
  suggestions: { text: string }[];
  insightIds: string[];
};

type ProposalState = {
  insightId: string;
  proposedText: string;
  loading: boolean;
};

const InsightList: React.FC<Props> = ({ insightRefs, data, setData, handleMouseEnter, handleMouseLeave, onError, onInfo, onWaiting, backendAvailable, onViewTraceability }) => {

  const [isInsightDialogVisible, setIsInsightDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingInsight, setEditingInsight] = useState<ItemType | null>(null);
  const setInsightRef = useCallback((element: HTMLDivElement, index: number) => { insightRefs.current[index] = element; }, [insightRefs]);

  // Insight selection state
  const { selectedIds: selectedInsightIds, toggleSelection: toggleInsightSelection, clearSelection, selectAll } = useItemSelection();
  const [extractingRecommendations, setExtractingRecommendations] = useState(false);

  // Clear selection when discovery changes
  useEffect(() => { clearSelection(); }, [data.discovery_id, clearSelection]);
  const [recommendationSuggestionData, setRecommendationSuggestionData] = useState<RecommendationSuggestionData | null>(null);

  const [isRecommendationModalVisible, setIsRecommendationModalVisible] = useState(false);

  // Dedup merge dialog state
  const mergeDialog = useMergeDialog<InsightType>();

  // Batch dedup queue for accepted recommendation suggestions
  const recommendationDedupQueue = useBatchDedupQueue<RecommendationType>();

  // AI proposal state
  const [proposal, setProposal] = useState<ProposalState | null>(null);

  const openAddModal = () => {
    setModalMode('add');
    setEditingInsight(null);
    setIsInsightDialogVisible(true);
  };

  const openEditModal = (item: ItemType) => {
    setModalMode('edit');
    setEditingInsight(item);
    setIsInsightDialogVisible(true);
  };

  const addInsightToData = useCallback((newInsight: InsightType) => {
    setData((prevState) => prevState ? ({
      ...prevState,
      insights: [...prevState.insights, newInsight]
    }) : prevState);
  }, [setData]);

  const saveInsight = async (insightData: InsightType) => {
    if (modalMode === 'add') {
      const newInsight: InsightType = {
        insight_id: Math.random().toString(16).slice(2),
        text: insightData.text,
        related_facts: insightData.related_facts,
        version: 1,
        status: 'draft',
        created_at: new Date().toISOString(),
      };

      // Dedup guard: check for duplicates before adding
      onWaiting('Checking for duplicates…');
      const duplicates = await findDuplicates(
        insightData.text,
        data.insights.map(i => ({ id: i.insight_id, text: i.text })),
        backendAvailable,
      );

      if (duplicates.length > 0) {
        mergeDialog.show(newInsight, duplicates[0]);
        setIsInsightDialogVisible(false);
        return;
      }

      addInsightToData(newInsight);
    } else if (modalMode === 'edit' && insightData.insight_id) {
      const existing = data.insights.find(i => i.insight_id === insightData.insight_id);
      const textChanged = existing && existing.text !== insightData.text;

      if (textChanged && existing) {
          onWaiting('Creating new version and analyzing impact on related recommendations...');
          const versioned = createNewVersion(existing, insightData.text) as InsightType;
          const updatedWithRelations: InsightType = {
            ...versioned,
            related_facts: insightData.related_facts,
          };
          const intermediateData = {
            ...data,
            insights: data.insights.map(i =>
              i.insight_id === insightData.insight_id ? updatedWithRelations : i
            ),
          };
          const children = getDirectChildren('insight', insightData.insight_id, intermediateData);
          const { ids: impactedIds, usedFallback } = await checkImpact(existing.text, insightData.text, children, backendAvailable);
          const { data: propagatedData, impactedCount } = propagateImpact(
            intermediateData,
            'insight',
            insightData.insight_id,
            'edited',
            impactedIds,
          );
          setData(propagatedData);
          const fallbackHint = usedFallback ? ' (AI unavailable — all children marked)' : '';
          onInfo(`Updated to v${updatedWithRelations.version}. ${impactedCount} downstream item(s) marked for review.${fallbackHint}`);
          setIsInsightDialogVisible(false);
          return;
      }

      // No text change — update fields and check if links changed
      const linksChanged = existing &&
        JSON.stringify([...existing.related_facts].sort()) !== JSON.stringify([...insightData.related_facts].sort());

      const updatedInsights = data.insights.map((insight) =>
        insight.insight_id === insightData.insight_id ? { ...insight, ...insightData } : insight
      );
      setData((prevState) => prevState ? ({
        ...prevState,
        insights: updatedInsights
      }) : prevState);

      // Propose reformulation if links changed
      if (linksChanged && existing && backendAvailable) {
        const oldTexts = existing.related_facts
          .map(id => data.facts.find(f => f.fact_id === id)?.text || '')
          .filter(Boolean).join('\n\n');
        const newTexts = insightData.related_facts
          .map(id => data.facts.find(f => f.fact_id === id)?.text || '')
          .filter(Boolean).join('\n\n');

        setProposal({ insightId: insightData.insight_id, proposedText: '', loading: true });
        onWaiting('Sources changed — generating reformulation proposal…');

        try {
          const response = await fetch(`${API_URL}/propose/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entity_type: 'insight',
              current_text: existing.text,
              upstream_change: { old_text: oldTexts, new_text: newTexts, entity_type: 'fact' },
              goal: data.goal,
            }),
          });
          if (response.ok) {
            const result = await response.json();
            onInfo('Reformulation proposal ready.');
            setProposal({ insightId: insightData.insight_id, proposedText: result.proposed_text || '', loading: false });
          } else {
            setProposal(null);
          }
        } catch {
          setProposal(null);
        }
      }
    }
    setIsInsightDialogVisible(false);
  };

  // MergeDialog callbacks use the hook

  // Confirm valid: clear actionable status
  const handleClearStatus = (insightId: string) => {
    setData(prev => prev ? clearStatus(prev, 'insight', insightId) : prev);
  };

  // AI propose update
  const handleProposeUpdate = async (insight: InsightType) => {
    const parentFactId = insight.related_facts[0];
    if (!parentFactId) {
      onError('No related fact found to base the update proposal on.');
      return;
    }
    const parentFact = data.facts.find(f => f.fact_id === parentFactId);
    if (!parentFact) {
      onError('Related fact not found in current data.');
      return;
    }

    setProposal({ insightId: insight.insight_id, proposedText: '', loading: true });
    onWaiting('Generating update proposal...');

    try {
      const oldText = parentFact.versions && parentFact.versions.length > 0
        ? parentFact.versions[parentFact.versions.length - 1].text
        : '';

      const response = await fetch(`${API_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'insight',
          current_text: insight.text,
          upstream_change: {
            old_text: oldText,
            new_text: parentFact.text,
            entity_type: 'fact',
          },
          goal: data.goal,
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        onError(body.error || 'Update proposal failed');
        setProposal(null);
        return;
      }

      const result = await response.json();
      onInfo('Update proposal ready.');
      setProposal({ insightId: insight.insight_id, proposedText: result.proposed_text || '', loading: false });
    } catch (err: any) {
      onError(err.message || 'Update proposal request failed');
      setProposal(null);
    }
  };

  const handleAcceptProposal = async (text: string) => {
    if (!proposal) return;
    const insight = data.insights.find(i => i.insight_id === proposal.insightId);
    if (!insight) return;

    const versioned = createNewVersion(insight, text) as InsightType;
    let updatedData: DiscoveryData = {
      ...data,
      insights: data.insights.map(i =>
        i.insight_id === proposal.insightId ? versioned : i
      ),
    };
    updatedData = clearStatus(updatedData, 'insight', proposal.insightId);

    const children = getDirectChildren('insight', proposal.insightId, updatedData);
    const { ids: impactedIds, usedFallback } = await checkImpact(insight.text, text, children, backendAvailable);
    const { data: propagatedData, impactedCount } = propagateImpact(
      updatedData,
      'insight',
      proposal.insightId,
      'edited',
      impactedIds,
    );
    setData(propagatedData);
    const fallbackHint = usedFallback ? ' (AI unavailable — all children marked)' : '';
    onInfo(`Accepted proposal as v${versioned.version}. ${impactedCount} downstream item(s) marked for review.${fallbackHint}`);
    setProposal(null);
  };

  const handleRejectProposal = () => {
    setProposal(null);
  };

  const deleteInsight = (insightId: string) => {
    const updatedInsights = data.insights.filter((insight) => insight.insight_id !== insightId);
    setData((prevState) => prevState ? ({
      ...prevState,
      insights: updatedInsights
    }) : prevState);
  };

  // Generate recommendations from selected insights
  const handleExtractRecommendations = async () => {
    const selected = data.insights.filter(i => selectedInsightIds.has(i.insight_id));
    if (selected.length === 0) return;

    setExtractingRecommendations(true);
    onWaiting('Generating recommendations...');
    try {
      const response = await fetch(`${API_URL}/extract/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insights: selected.map(i => ({ insight_id: i.insight_id, text: i.text })),
          goal: data.goal,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        onError(body.error || 'Recommendations extraction failed');
        return;
      }
      const result = await response.json();
      if (result.suggestions.length === 0) {
        onError('No recommendations could be formulated from the selected insights.');
        return;
      }
      onInfo(`Generated ${result.suggestions.length} suggestion(s).`);
      setRecommendationSuggestionData({ suggestions: result.suggestions, insightIds: result.insight_ids });
    } catch (err: any) {
      onError(err.message || 'Recommendations extraction request failed');
    } finally {
      setExtractingRecommendations(false);
    }
  };

  // Accept a recommendation suggestion
  const addRecommendationToData = useCallback((text: string, relatedInsights: string[]) => {
    const newRecommendation: RecommendationType = {
      recommendation_id: Math.random().toString(16).slice(2),
      text,
      related_insights: relatedInsights,
    };
    setData((prevState) => prevState ? ({
      ...prevState,
      recommendations: [...prevState.recommendations, newRecommendation],
    }) : prevState);
  }, [setData]);

  const handleAcceptRecommendation = async (suggestion: { text: string; related_insight_ids?: string[] }) => {
    const relatedInsights = suggestion.related_insight_ids && suggestion.related_insight_ids.length > 0
      ? suggestion.related_insight_ids
      : Array.from(selectedInsightIds);
    const newRecommendation: RecommendationType = {
      recommendation_id: Math.random().toString(16).slice(2),
      text: suggestion.text,
      related_insights: relatedInsights,
    };
    recommendationDedupQueue.trackStart();
    const duplicates = await findDuplicates(
      suggestion.text,
      data.recommendations.map(r => ({ id: r.recommendation_id, text: r.text })),
      backendAvailable,
    );
    if (duplicates.length > 0) {
      recommendationDedupQueue.enqueue(newRecommendation, duplicates[0]);
      return;
    }
    recommendationDedupQueue.trackComplete();
    addRecommendationToData(suggestion.text, relatedInsights);
  };

  const addRecommendationFromMerge = useCallback((rec: RecommendationType) => {
    setData(prev => prev ? { ...prev, recommendations: [...prev.recommendations, rec] } : prev);
  }, [setData]);

  const handleCloseSuggestions = useCallback(() => {
    setRecommendationSuggestionData(null);
    if (recommendationDedupQueue.queue.length > 0 || recommendationDedupQueue.inflight > 0) {
      recommendationDedupQueue.openReview();
    }
  }, [recommendationDedupQueue]);

  // Auto-close review panel if all inflight resolved and queue is empty
  useEffect(() => {
    if (recommendationDedupQueue.reviewVisible && recommendationDedupQueue.inflight === 0 && recommendationDedupQueue.queue.length === 0) {
      recommendationDedupQueue.reset();
    }
  }, [recommendationDedupQueue.reviewVisible, recommendationDedupQueue.inflight, recommendationDedupQueue.queue.length, recommendationDedupQueue]);

  const handleAddRecommendationFromSelection = () => {
    setIsRecommendationModalVisible(true);
  };

  const saveRecommendationFromSelection = (recommendationData: RecommendationType) => {
    addRecommendationToData(recommendationData.text, recommendationData.related_insights);
    setIsRecommendationModalVisible(false);
  };

  return (
    <div className="column insights">
      <div className="column-header">
        <h2>💡Insights</h2>
        {data.insights.length > 0 && selectedInsightIds.size < data.insights.length && (
          <button className="select-all-button" onClick={() => selectAll(data.insights.map(i => i.insight_id))} title="Select all insights">
            <FontAwesomeIcon icon={faCheckDouble} /> Select All
          </button>
        )}
        <button className="header-add-button" onClick={openAddModal} title="Add Insight"><FontAwesomeIcon icon={faAdd} /></button>
      </div>
      <div className={`toolbar-wrapper${selectedInsightIds.size > 0 ? ' toolbar-wrapper-open' : ''}`}>
        <div className="selection-toolbar">
          <span>{selectedInsightIds.size} insight(s) selected</span>
          <button onClick={handleExtractRecommendations} disabled={extractingRecommendations || !backendAvailable} title={!backendAvailable ? 'Backend unavailable' : ''}>
            <FontAwesomeIcon icon={extractingRecommendations ? faSpinner : faWandMagicSparkles} spin={extractingRecommendations} />
            {' '}Generate Recommendations
          </button>
          <button onClick={handleAddRecommendationFromSelection}>
            <FontAwesomeIcon icon={faClipboardList} />
            {' '}Add Recommendation
          </button>
          <button onClick={clearSelection}>
            <FontAwesomeIcon icon={faXmark} />
            {' '}Clear
          </button>
        </div>
      </div>
      {data.insights.length === 0 && (
        <p className="empty-state-hint">Select facts and generate insights, or add them manually.</p>
      )}
      {data.insights.map((insight, index) => (
        <div
          key={insight.insight_id}
          onClick={() => toggleInsightSelection(insight.insight_id)}
          className={selectedInsightIds.has(insight.insight_id) ? 'item-selectable selected' : 'item-selectable'}
        >
          <ItemWrapper
            id={"insight-" + insight.insight_id}
            index={index}
            item={insight}
            setItemRef={setInsightRef}
            handleMouseEnter={() => handleMouseEnter("insight", insight.insight_id, data)}
            handleMouseLeave={() => handleMouseLeave("insight", insight.insight_id, data)}
            openEditModal={openEditModal}
            onViewTraceability={() => onViewTraceability("insight", insight.insight_id)}
            onClearStatus={() => handleClearStatus(insight.insight_id)}
            onProposeUpdate={() => handleProposeUpdate(insight)}
            backendAvailable={backendAvailable}
          >
            <InsightItem insight={insight} />
          </ItemWrapper>
        </div>
      ))}
      <InsightModal
        mode={modalMode}
        isDialogVisible={isInsightDialogVisible}
        closeDialog={() => setIsInsightDialogVisible(false)}
        saveInsight={saveInsight}
        deleteInsight={deleteInsight}
        insightData={editingInsight as InsightType}
        facts={data.facts}
      />
      <RecommendationModal
        mode="add"
        isDialogVisible={isRecommendationModalVisible}
        closeDialog={() => setIsRecommendationModalVisible(false)}
        saveRecommendation={saveRecommendationFromSelection}
        deleteRecommendation={() => {}}
        recommendationData={{ recommendation_id: '', text: '', related_insights: Array.from(selectedInsightIds) } as RecommendationType}
        insights={data.insights}
      />
      {recommendationSuggestionData && (
        <SuggestionsPanel
          suggestions={recommendationSuggestionData.suggestions}
          inputId="recommendations"
          title="Suggested Recommendations"
          onAccept={(suggestion) => handleAcceptRecommendation(suggestion)}
          onClose={handleCloseSuggestions}
        />
      )}
      {mergeDialog.match && (
        <MergeDialog
          isVisible={mergeDialog.visible}
          newText={mergeDialog.pendingItem?.text || ''}
          existingItem={mergeDialog.match}
          onMerge={() => mergeDialog.handleMerge((pending, match) => {
            setData(prev => prev ? {
              ...prev,
              insights: prev.insights.map(i => i.insight_id === match.id
                ? { ...i, related_facts: Array.from(new Set([...i.related_facts, ...pending.related_facts])) }
                : i),
            } : prev);
          })}
          onKeepAsVariant={() => mergeDialog.handleKeepAsVariant(addInsightToData)}
          onForceAdd={() => mergeDialog.handleForceAdd(addInsightToData)}
          onClose={mergeDialog.reset}
        />
      )}
      {recommendationDedupQueue.reviewVisible && recommendationDedupQueue.queue.length > 0 && (
        <BatchDedupReviewPanel<RecommendationType>
          entries={recommendationDedupQueue.queue}
          inflight={recommendationDedupQueue.inflight}
          getText={(item) => item.text}
          onResolve={recommendationDedupQueue.resolveEntry}
          onResolveAll={recommendationDedupQueue.resolveAll}
          onApply={() => recommendationDedupQueue.applyAll(
            (pending, match) => {
              setData(prev => prev ? {
                ...prev,
                recommendations: prev.recommendations.map(r => r.recommendation_id === match.id
                  ? { ...r, related_insights: Array.from(new Set([...r.related_insights, ...pending.related_insights])) }
                  : r),
              } : prev);
            },
            addRecommendationFromMerge,
          )}
          onClose={recommendationDedupQueue.reset}
        />
      )}
      {proposal && (
        <ProposalPanel
          currentText={data.insights.find(i => i.insight_id === proposal.insightId)?.text || ''}
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

export default InsightList;
