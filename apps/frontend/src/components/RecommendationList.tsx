import React, { useCallback, useEffect, useState } from 'react';
import RecommendationItem from './RecommendationItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd, faWandMagicSparkles, faXmark, faSpinner, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import RecommendationModal from './RecommendationModal';
import MergeDialog from './MergeDialog';
import ProposalPanel from './ProposalPanel';
import SuggestionsPanel from './SuggestionsPanel';
import { useItemSelection } from '../hooks/useItemSelection';
import { API_URL } from '../config';
import { createNewVersion, propagateImpact, clearStatus, getDirectChildren } from '../lib';
import { findDuplicates } from '../dedup';
import { checkImpact } from '../impact';
import { useMergeDialog } from '../hooks/useMergeDialog';

type Props = {
  recommendationRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
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

type OutputSuggestionData = {
  suggestions: { text: string }[];
  recommendationIds: string[];
};

const OUTPUT_TYPES = [
  { value: 'report', label: 'Report' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'action_plan', label: 'Action Plan' },
  { value: 'brief', label: 'Brief' },
] as const;

const RecommendationList: React.FC<Props> = ({ recommendationRefs, data, setData, handleMouseEnter, handleMouseLeave, onError, onInfo, onWaiting, backendAvailable, onViewTraceability }) => {

  const [isRecommendationDialogVisible, setIsRecommendationDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingRecommendation, setEditingRecommendation] = useState<ItemType | null>(null);
  const setRecommendationRef = useCallback((element: HTMLDivElement, index: number) => { recommendationRefs.current[index] = element; }, [recommendationRefs]);

  // Recommendation selection state
  const { selectedIds: selectedRecommendationIds, toggleSelection: toggleRecommendationSelection, clearSelection, selectAll } = useItemSelection();
  const [selectedOutputType, setSelectedOutputType] = useState<OutputType['type']>('report');

  // Clear selection when discovery changes
  useEffect(() => { clearSelection(); }, [data.discovery_id, clearSelection]);
  const [extractingOutputs, setExtractingOutputs] = useState(false);
  const [outputSuggestionData, setOutputSuggestionData] = useState<OutputSuggestionData | null>(null);

  // MergeDialog state
  const mergeDialog = useMergeDialog<RecommendationType>();

  // Proposal state
  const [proposalTarget, setProposalTarget] = useState<string | null>(null);
  const [proposalData, setProposalData] = useState<{ proposed_text: string; explanation: string } | null>(null);


  const openAddModal = () => {
    setModalMode('add');
    setEditingRecommendation(null);
    setIsRecommendationDialogVisible(true);
  };

  const openEditModal = (recommendation: ItemType) => {
    setModalMode('edit');
    setEditingRecommendation(recommendation);
    setIsRecommendationDialogVisible(true);
  };

  const addRecommendationToData = (newRecommendation: RecommendationType) => {
    setData((prevState) => prevState ? ({
      ...prevState,
      recommendations: [...prevState.recommendations, newRecommendation]
    }) : prevState);
  };

  const saveRecommendation = async (recommendationData: RecommendationType) => {
    if (modalMode === 'add') {
      const newRecommendation: RecommendationType = {
        recommendation_id: Math.random().toString(16).slice(2),
        text: recommendationData.text,
        related_insights: recommendationData.related_insights,
        version: 1,
        status: 'draft',
        created_at: new Date().toISOString(),
      };

      // Dedup guard
      const existingItems = data.recommendations.map(r => ({ id: r.recommendation_id, text: r.text }));
      const duplicates = await findDuplicates(recommendationData.text, existingItems, backendAvailable);

      if (duplicates.length > 0) {
        mergeDialog.show(newRecommendation, duplicates[0]);
        setIsRecommendationDialogVisible(false);
        return;
      }

      addRecommendationToData(newRecommendation);
    } else if (modalMode === 'edit' && recommendationData.recommendation_id) {
      const existing = data.recommendations.find(r => r.recommendation_id === recommendationData.recommendation_id);
      if (existing && existing.text !== recommendationData.text) {
          onWaiting('Creating new version and analyzing impact on related outputs...');
          const versioned = createNewVersion(existing, recommendationData.text) as RecommendationType;
          const updated = { ...versioned, ...recommendationData, text: versioned.text, version: versioned.version, status: versioned.status, created_at: versioned.created_at, versions: versioned.versions };
          const updatedRecommendations = data.recommendations.map(r => r.recommendation_id === recommendationData.recommendation_id ? updated : r);
          const intermediateData = { ...data, recommendations: updatedRecommendations };
          const children = getDirectChildren('recommendation', recommendationData.recommendation_id, intermediateData);
          const { ids: impactedIds, usedFallback } = await checkImpact(existing.text, recommendationData.text, children, backendAvailable);
          const { data: propagatedData, impactedCount } = propagateImpact(intermediateData, 'recommendation', recommendationData.recommendation_id, 'edited', impactedIds);
          setData(propagatedData);
          const fallbackHint = usedFallback ? ' (AI unavailable — all children marked)' : '';
          onInfo(`Updated to v${updated.version}. ${impactedCount} downstream item(s) flagged.${fallbackHint}`);
      } else {
        // No text change, just update other fields
        const updatedRecommendations = data.recommendations.map(r =>
          r.recommendation_id === recommendationData.recommendation_id ? { ...r, ...recommendationData } : r
        );
        setData((prevState) => prevState ? ({
          ...prevState,
          recommendations: updatedRecommendations
        }) : prevState);
      }
    }
    setIsRecommendationDialogVisible(false);
  };

  const deleteRecommendation = (recommendationId: string) => {
    const updatedRecommendations = data.recommendations.filter((recommendation) => recommendation.recommendation_id !== recommendationId);
    setData((prevState) => prevState ? ({
      ...prevState,
        recommendations: updatedRecommendations
      }) : prevState);
  };

  // Confirm-valid: clear actionable status
  const handleClearStatus = (recommendationId: string) => {
    setData((prevState) => prevState ? clearStatus(prevState, 'recommendation', recommendationId) : prevState);
  };

  // AI propose update
  const handleProposeUpdate = async (recommendation: RecommendationType) => {
    const parentInsightId = recommendation.related_insights[0];
    if (!parentInsightId) return;

    const parentInsight = data.insights.find(i => i.insight_id === parentInsightId);
    if (!parentInsight) return;

    const oldText = parentInsight.versions && parentInsight.versions.length > 0
      ? parentInsight.versions[parentInsight.versions.length - 1].text
      : '';

    try {
      const response = await fetch(`${API_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'recommendation',
          current_text: recommendation.text,
          upstream_change: { old_text: oldText, new_text: parentInsight.text, entity_type: 'insight' },
          goal: data.goal,
        }),
      });
      if (!response.ok) return;
      const result = await response.json();
      setProposalTarget(recommendation.recommendation_id);
      setProposalData(result);
    } catch { /* ignore */ }
  };

  const acceptProposal = async (recommendationId: string, text: string) => {
    const existing = data.recommendations.find(r => r.recommendation_id === recommendationId);
    if (!existing) return;
    const versioned = createNewVersion(existing, text) as RecommendationType;
    const updatedRecommendations = data.recommendations.map(r => r.recommendation_id === recommendationId ? versioned : r);
    let updatedData = { ...data, recommendations: updatedRecommendations };
    updatedData = clearStatus(updatedData, 'recommendation', recommendationId);
    const children = getDirectChildren('recommendation', recommendationId, updatedData);
    const { ids: impactedIds, usedFallback } = await checkImpact(existing.text, text, children, backendAvailable);
    const { data: propagatedData, impactedCount } = propagateImpact(updatedData, 'recommendation', recommendationId, 'edited', impactedIds);
    setData(propagatedData);
    setProposalTarget(null);
    setProposalData(null);
    const fallbackHint = usedFallback ? ' (AI unavailable — all children marked)' : '';
    onInfo(`Recommendation updated to v${versioned.version}. ${impactedCount} downstream item(s) marked for review.${fallbackHint}`);
  };

  // MergeDialog callbacks use the hook

  // Formulate outputs from selected recommendations with full traceability
  const handleFormulateOutputs = async () => {
    const selected = data.recommendations.filter(r => selectedRecommendationIds.has(r.recommendation_id));
    if (selected.length === 0) return;

    // Resolve traceability chain: recommendations -> insights -> facts -> inputs
    const relatedInsightIds = new Set<string>();
    selected.forEach(r => r.related_insights.forEach(id => relatedInsightIds.add(id)));
    const relatedInsights = data.insights.filter(i => relatedInsightIds.has(i.insight_id));

    const relatedFactIds = new Set<string>();
    relatedInsights.forEach(i => i.related_facts.forEach(id => relatedFactIds.add(id)));
    const relatedFacts = data.facts.filter(f => relatedFactIds.has(f.fact_id));

    const relatedInputIds = new Set<string>();
    relatedFacts.forEach(f => f.related_inputs.forEach(id => relatedInputIds.add(id)));
    const relatedInputs = data.inputs.filter(inp => relatedInputIds.has(inp.input_id));

    setExtractingOutputs(true);
    try {
      const response = await fetch(`${API_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendations: selected.map(r => ({ recommendation_id: r.recommendation_id, text: r.text })),
          goal: data.goal,
          output_type: selectedOutputType,
          facts: relatedFacts.map(f => ({ text: f.text, source_excerpt: f.source_excerpt })),
          insights: relatedInsights.map(i => ({ text: i.text })),
          inputs: relatedInputs.map(inp => ({ title: inp.title, text: inp.text })),
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        onError(body.error || 'Outputs formulation failed');
        return;
      }
      const result = await response.json();
      if (result.suggestions.length === 0) {
        onError('No outputs could be formulated from the selected recommendations.');
        return;
      }
      setOutputSuggestionData({ suggestions: result.suggestions, recommendationIds: result.recommendation_ids });
    } catch (err: any) {
      onError(err.message || 'Outputs formulation request failed');
    } finally {
      setExtractingOutputs(false);
    }
  };

  // Accept an output suggestion
  const addOutputToData = useCallback((text: string, relatedRecommendations: string[], outputType: OutputType['type']) => {
    const newOutput: OutputType = {
      output_id: Math.random().toString(16).slice(2),
      text,
      related_recommendations: relatedRecommendations,
      type: outputType,
    };
    setData((prevState) => prevState ? ({
      ...prevState,
      outputs: [...prevState.outputs, newOutput],
    }) : prevState);
  }, [setData]);

  const handleAcceptOutput = (suggestion: { text: string }) => {
    addOutputToData(suggestion.text, Array.from(selectedRecommendationIds), selectedOutputType);
  };

  const handleCloseSuggestions = useCallback(() => {
    setOutputSuggestionData(null);
  }, []);


  return (
    <div className="column recommendations">
      <div className="column-header">
        <h2>Recommendations</h2>
        {data.recommendations.length > 0 && selectedRecommendationIds.size < data.recommendations.length && (
          <button className="select-all-button" onClick={() => selectAll(data.recommendations.map(r => r.recommendation_id))} title="Select all recommendations">
            <FontAwesomeIcon icon={faCheckDouble} /> Select All
          </button>
        )}
        <button className="header-add-button" onClick={openAddModal} title="Add Recommendation"><FontAwesomeIcon icon={faAdd} /></button>
      </div>
      <div className={`toolbar-wrapper${selectedRecommendationIds.size > 0 ? ' toolbar-wrapper-open' : ''}`}>
        <div className="selection-toolbar">
          <span>{selectedRecommendationIds.size} recommendation(s) selected</span>
          <select
            value={selectedOutputType}
            onChange={(e) => setSelectedOutputType(e.target.value as OutputType['type'])}
          >
            {OUTPUT_TYPES.map(ot => (
              <option key={ot.value} value={ot.value}>{ot.label}</option>
            ))}
          </select>
          <button onClick={handleFormulateOutputs} disabled={extractingOutputs || !backendAvailable} title={!backendAvailable ? 'Backend unavailable' : ''}>
            <FontAwesomeIcon icon={extractingOutputs ? faSpinner : faWandMagicSparkles} spin={extractingOutputs} />
            {' '}Formulate Outputs
          </button>
          <button onClick={clearSelection}>
            <FontAwesomeIcon icon={faXmark} />
            {' '}Clear
          </button>
        </div>
      </div>
      {data.recommendations.length === 0 && (
        <p className="empty-state-hint">Select insights and generate recommendations, or add them manually.</p>
      )}
      {data.recommendations.map((recommendation, index) => (
        <React.Fragment key={recommendation.recommendation_id}>
          <div
            onClick={() => toggleRecommendationSelection(recommendation.recommendation_id)}
            className={selectedRecommendationIds.has(recommendation.recommendation_id) ? 'item-selectable selected' : 'item-selectable'}
          >
            <ItemWrapper
              id={"recommendation-" + recommendation.recommendation_id}
              index={index}
              item={recommendation}
              setItemRef={setRecommendationRef}
              handleMouseEnter={() => handleMouseEnter("recommendation", recommendation.recommendation_id, data)}
              handleMouseLeave={() => handleMouseLeave("recommendation", recommendation.recommendation_id, data)}
              openEditModal={openEditModal}
              onViewTraceability={() => onViewTraceability("recommendation", recommendation.recommendation_id)}
              onClearStatus={() => handleClearStatus(recommendation.recommendation_id)}
              onProposeUpdate={() => handleProposeUpdate(recommendation)}
              backendAvailable={backendAvailable}
            >
              <RecommendationItem
                recommendation={recommendation}
              />
            </ItemWrapper>
          </div>
        </React.Fragment>
      ))}
      <RecommendationModal
        mode={modalMode}
        isDialogVisible={isRecommendationDialogVisible}
        closeDialog={() => setIsRecommendationDialogVisible(false)}
        saveRecommendation={saveRecommendation}
        deleteRecommendation={deleteRecommendation}
        recommendationData={editingRecommendation as RecommendationType}
        insights={data.insights}
      />
      {outputSuggestionData && (
        <SuggestionsPanel
          suggestions={outputSuggestionData.suggestions}
          inputId="outputs"
          title="Suggested Outputs"
          onAccept={(suggestion) => handleAcceptOutput(suggestion)}
          onClose={handleCloseSuggestions}
          renderMarkdown
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
              recommendations: prev.recommendations.map(r => r.recommendation_id === match.id
                ? { ...r, related_insights: Array.from(new Set([...r.related_insights, ...pending.related_insights])) }
                : r),
            } : prev);
          })}
          onKeepAsVariant={() => mergeDialog.handleKeepAsVariant(addRecommendationToData)}
          onForceAdd={() => mergeDialog.handleForceAdd(addRecommendationToData)}
          onClose={mergeDialog.reset}
        />
      )}
      {proposalTarget && proposalData && (
        <ProposalPanel
          currentText={data.recommendations.find(r => r.recommendation_id === proposalTarget)?.text || ''}
          proposedText={proposalData.proposed_text}
          explanation={proposalData.explanation}
          overlay
          onAccept={(text) => acceptProposal(proposalTarget, text)}
          onReject={() => { setProposalTarget(null); setProposalData(null); }}
        />
      )}
    </div>
  );
};

export default RecommendationList;
