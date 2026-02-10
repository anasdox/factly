import React, { useCallback, useEffect, useState } from 'react';
import InsightItem from './InsightItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd, faWandMagicSparkles, faXmark, faSpinner, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import InsightModal from './InsightModal';
import SuggestionsPanel from './SuggestionsPanel';
import { useItemSelection } from '../hooks/useItemSelection';
import { API_URL } from '../config';

type Props = {
  insightRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;
  onError: (msg: string) => void;
  backendAvailable: boolean;
  onViewTraceability: (entityType: string, entityId: string) => void;
};

type RecommendationSuggestionData = {
  suggestions: { text: string }[];
  insightIds: string[];
};

const InsightList: React.FC<Props> = ({ insightRefs, data, setData, handleMouseEnter, handleMouseLeave, onError, backendAvailable, onViewTraceability }) => {

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

  const saveInsight = (insightData: InsightType) => {
    if (modalMode === 'add') {
      const newInsight: InsightType = {
        insight_id: Math.random().toString(16).slice(2),
        text: insightData.text,
        related_facts: insightData.related_facts,
      };
      setData((prevState) => prevState ? ({
        ...prevState,
        insights: [...prevState.insights, newInsight]
      }) : prevState);
    } else if (modalMode === 'edit' && insightData.insight_id) {
      const updatedInsights = data.insights.map((insight) =>
        insight.insight_id === insightData.insight_id ? { ...insight, ...insightData } : insight
      );
      setData((prevState) => prevState ? ({
        ...prevState,
        insights: updatedInsights
      }) : prevState);
    }
    setIsInsightDialogVisible(false);
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

  const handleAcceptRecommendation = (suggestion: { text: string; related_insight_ids?: string[] }) => {
    const relatedInsights = suggestion.related_insight_ids && suggestion.related_insight_ids.length > 0
      ? suggestion.related_insight_ids
      : Array.from(selectedInsightIds);
    addRecommendationToData(suggestion.text, relatedInsights);
  };

  const handleCloseSuggestions = useCallback(() => {
    setRecommendationSuggestionData(null);
  }, []);


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
      {recommendationSuggestionData && (
        <SuggestionsPanel
          suggestions={recommendationSuggestionData.suggestions}
          inputId="recommendations"
          title="Suggested Recommendations"
          onAccept={(suggestion) => handleAcceptRecommendation(suggestion)}
          onClose={handleCloseSuggestions}
        />
      )}
    </div>
  );
};

export default InsightList;
