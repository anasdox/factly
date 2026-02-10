import React, { useCallback, useEffect, useState } from 'react';
import FactItem from './FactItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd, faWandMagicSparkles, faXmark, faSpinner, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import FactModal from './FactModal';
import SuggestionsPanel from './SuggestionsPanel';
import { useItemSelection } from '../hooks/useItemSelection';
import { API_URL } from '../config';

type Props = {
  factRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;
  onError: (msg: string) => void;
  backendAvailable: boolean;
  onViewTraceability: (entityType: string, entityId: string) => void;
};

type InsightSuggestionData = {
  suggestions: { text: string }[];
  factIds: string[];
};

const FactList: React.FC<Props> = ({ factRefs, data, setData, handleMouseEnter, handleMouseLeave, onError, backendAvailable, onViewTraceability }) => {

  const [isFactDialogVisible, setIsFactDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingFact, setEditingFact] = useState<ItemType | null>(null);
  const setFactRef = useCallback((element: HTMLDivElement, index: number) => { factRefs.current[index] = element; }, [factRefs]);

  // Fact selection state
  const { selectedIds: selectedFactIds, toggleSelection: toggleFactSelection, clearSelection, selectAll } = useItemSelection();
  const [extractingInsights, setExtractingInsights] = useState(false);

  // Clear selection when discovery changes
  useEffect(() => { clearSelection(); }, [data.discovery_id, clearSelection]);
  const [insightSuggestionData, setInsightSuggestionData] = useState<InsightSuggestionData | null>(null);


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

  const saveFact = (factData: FactType) => {
    if (modalMode === 'add') {
      const newFact: FactType = {
        fact_id: Math.random().toString(16).slice(2),
        text: factData.text,
        related_inputs: factData.related_inputs,
      };
      setData((prevState) => prevState ? ({
        ...prevState,
        facts: [...prevState.facts, newFact]
      }) : prevState);
    } else if (modalMode === 'edit' && factData.fact_id) {
      const updatedFacts = data.facts.map((fact) =>
        fact.fact_id === factData.fact_id ? { ...fact, ...factData } : fact
      );
      setData((prevState) => prevState ? ({
        ...prevState,
        facts: updatedFacts
      }) : prevState);
    }
    setIsFactDialogVisible(false);
  };

  const deleteFact = (factId: string) => {
    const updatedFacts = data.facts.filter((fact) => fact.fact_id !== factId);
    setData((prevState) => prevState ? ({
      ...prevState,
      facts: updatedFacts
    }) : prevState);
  };

  // Generate insights from selected facts
  const handleExtractInsights = async () => {
    const selected = data.facts.filter(f => selectedFactIds.has(f.fact_id));
    if (selected.length === 0) return;

    setExtractingInsights(true);
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
      setInsightSuggestionData({ suggestions: result.suggestions, factIds: result.fact_ids });
    } catch (err: any) {
      onError(err.message || 'Insights extraction request failed');
    } finally {
      setExtractingInsights(false);
    }
  };

  const addInsightToData = useCallback((text: string, relatedFacts: string[]) => {
    const newInsight: InsightType = {
      insight_id: Math.random().toString(16).slice(2),
      text,
      related_facts: relatedFacts,
    };
    setData((prevState) => prevState ? ({
      ...prevState,
      insights: [...prevState.insights, newInsight],
    }) : prevState);
  }, [setData]);

  const handleAcceptInsight = (suggestion: { text: string; related_fact_ids?: string[] }) => {
    const relatedFacts = suggestion.related_fact_ids && suggestion.related_fact_ids.length > 0
      ? suggestion.related_fact_ids
      : Array.from(selectedFactIds);
    addInsightToData(suggestion.text, relatedFacts);
  };

  const handleCloseSuggestions = useCallback(() => {
    setInsightSuggestionData(null);
  }, []);


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
      {insightSuggestionData && (
        <SuggestionsPanel
          suggestions={insightSuggestionData.suggestions}
          inputId="insights"
          title="Suggested Insights"
          onAccept={(suggestion) => handleAcceptInsight(suggestion)}
          onClose={handleCloseSuggestions}
        />
      )}
    </div>
  );
};

export default FactList;
