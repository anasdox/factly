import React, { useCallback, useState } from 'react';
import RecommendationItem from './RecommendationItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd, faWandMagicSparkles, faClipboardList, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import RecommendationModal from './RecommendationModal';
import SuggestionsPanel from './SuggestionsPanel';
import OutputModal from './OutputModal';
import { useItemSelection } from '../hooks/useItemSelection';

type Props = {
  recommendationRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;
  onError: (msg: string) => void;
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

const RecommendationList: React.FC<Props> = ({ recommendationRefs, data, setData, handleMouseEnter, handleMouseLeave, onError }) => {

  const [isRecommendationDialogVisible, setIsRecommendationDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingRecommendation, setEditingRecommendation] = useState<ItemType | null>(null);
  const setRecommendationRef = useCallback((element: HTMLDivElement, index: number) => { recommendationRefs.current[index] = element; }, [recommendationRefs]);

  // Recommendation selection state
  const { selectedIds: selectedRecommendationIds, toggleSelection: toggleRecommendationSelection, clearSelection } = useItemSelection();
  const [selectedOutputType, setSelectedOutputType] = useState<OutputType['type']>('report');
  const [extractingOutputs, setExtractingOutputs] = useState(false);
  const [outputSuggestionData, setOutputSuggestionData] = useState<OutputSuggestionData | null>(null);

  // Manual output creation from selection
  const [isOutputModalVisible, setIsOutputModalVisible] = useState(false);
  const [prefilledRelatedRecommendations, setPrefilledRelatedRecommendations] = useState<string[]>([]);

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

  const saveRecommendation = (recommendationData: RecommendationType) => {
    if (modalMode === 'add') {
      const newRecommendation: RecommendationType = {
        recommendation_id: Math.random().toString(16).slice(2),
        text: recommendationData.text,
        related_insights: recommendationData.related_insights,
      };
      setData((prevState) => prevState ? ({
        ...prevState,
        recommendations: [...prevState.recommendations, newRecommendation]
      }) : prevState);
    } else if (modalMode === 'edit' && recommendationData.recommendation_id) {
      const updatedRecommendations = data.recommendations.map((recommendation) =>
        recommendation.recommendation_id === recommendationData.recommendation_id ? { ...recommendation, ...recommendationData } : recommendation
      );
      setData((prevState) => prevState ? ({
        ...prevState,
        recommendations: updatedRecommendations
      }) : prevState);
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

  // Formulate outputs from selected recommendations with full traceability
  const handleFormulateOutputs = async () => {
    const selected = data.recommendations.filter(r => selectedRecommendationIds.has(r.recommendation_id));
    if (selected.length === 0) return;

    // Resolve traceability chain: recommendations → insights → facts → inputs
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
      const response = await fetch('http://localhost:3002/extract/outputs', {
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

  // Manual output creation with pre-filled related_recommendations
  const handleAddOutputFromSelection = () => {
    setPrefilledRelatedRecommendations(Array.from(selectedRecommendationIds));
    setIsOutputModalVisible(true);
  };

  const saveOutputFromSelection = (outputData: OutputType) => {
    addOutputToData(outputData.text, outputData.related_recommendations, outputData.type);
    setIsOutputModalVisible(false);
  };

  return (
    <div className="column recommendations">
      <h2>👍Recommendations</h2>
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
          <button onClick={handleFormulateOutputs} disabled={extractingOutputs}>
            <FontAwesomeIcon icon={extractingOutputs ? faSpinner : faWandMagicSparkles} spin={extractingOutputs} />
            {' '}Formulate Outputs
          </button>
          <button onClick={handleAddOutputFromSelection}>
            <FontAwesomeIcon icon={faClipboardList} />
            {' '}Add Output
          </button>
          <button onClick={clearSelection}>
            <FontAwesomeIcon icon={faXmark} />
            {' '}Clear
          </button>
        </div>
      </div>
      {data.recommendations.map((recommendation, index) => (
        <div
          key={recommendation.recommendation_id}
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
          >
            <RecommendationItem
              recommendation={recommendation}
            />
          </ItemWrapper>
        </div>
      ))}
      <button className="add-button recommendation-add-button" onClick={openAddModal}><FontAwesomeIcon icon={faAdd} /></button>
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
      <OutputModal
        mode="add"
        isDialogVisible={isOutputModalVisible}
        closeDialog={() => setIsOutputModalVisible(false)}
        saveOutput={saveOutputFromSelection}
        deleteOutput={() => {}}
        outputData={{ output_id: '', text: '', related_recommendations: prefilledRelatedRecommendations, type: selectedOutputType } as OutputType}
        recommendations={data.recommendations}
      />
    </div>
  );
};

export default RecommendationList;
