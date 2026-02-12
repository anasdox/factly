import React, { useCallback, useEffect, useState } from 'react';
import InputItem from './InputItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd, faWandMagicSparkles, faXmark, faSpinner, faCheckDouble, faClipboard } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import InputModal from './InputModal';
import FactModal from './FactModal';
import SuggestionsPanel from './SuggestionsPanel';
import { useItemSelection } from '../hooks/useItemSelection';
import { API_URL } from '../config';


type Props = {
  inputRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;
  onError: (msg: string) => void;
  backendAvailable: boolean;
  onViewTraceability: (entityType: string, entityId: string) => void;
};

type FactSuggestionData = {
  suggestions: { text: string; source_excerpt?: string; inputId: string }[];
};

const InputList: React.FC<Props> = ({ inputRefs, data, setData, handleMouseEnter, handleMouseLeave, onError, backendAvailable, onViewTraceability }) => {

  const [isInputDialogVisible, setIsInputDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingInput, setEditingInput] = useState<ItemType | null>(null);
  const setInputRef = useCallback((element: HTMLDivElement, index: number) => { inputRefs.current[index] = element; }, [inputRefs]);

  // Input selection state
  const { selectedIds: selectedInputIds, toggleSelection: toggleInputSelection, clearSelection, selectAll } = useItemSelection();
  const [extractingFacts, setExtractingFacts] = useState(false);

  // Clear selection when discovery changes
  useEffect(() => { clearSelection(); }, [data.discovery_id, clearSelection]);

  const [suggestionData, setSuggestionData] = useState<FactSuggestionData | null>(null);
  const [isFactModalVisible, setIsFactModalVisible] = useState(false);

  const openAddModal = () => {
    setModalMode('add');
    setEditingInput(null);
    setIsInputDialogVisible(true);
  };

  const openEditModal = (item: ItemType) => {
    setModalMode('edit');
    setEditingInput(item);
    setIsInputDialogVisible(true);
  };

  const saveInput = (inputData: InputType) => {
    if (modalMode === 'add') {
      const newInput: InputType = {
        input_id: Math.random().toString(16).slice(2),
        title: inputData.title,
        type: inputData.type,
        url: inputData.url,
        text: inputData.text,
      };
      setData((prevState) => prevState ? ({
        ...prevState,
        inputs: [...prevState.inputs, newInput]
      }) : prevState);
    } else if (modalMode === 'edit' && inputData.input_id) {
      const updatedInputs = data.inputs.map((input) =>
        input.input_id === inputData.input_id ? { ...input, ...inputData } : input
      );
      setData((prevState) => prevState ? ({
        ...prevState,
        inputs: updatedInputs
      }) : prevState);
    }
    setIsInputDialogVisible(false);
  };

  // Batch extract facts from all selected inputs in parallel
  const handleExtractFacts = async () => {
    const selected = data.inputs.filter(i => selectedInputIds.has(i.input_id));
    if (selected.length === 0) return;

    setExtractingFacts(true);
    try {
      const promises = selected.map(input => {
        const payload: Record<string, string> = {
          goal: data.goal,
          input_id: input.input_id,
        };
        if (input.type === 'web') {
          payload.input_url = input.url || '';
        } else {
          payload.input_text = input.text || '';
        }
        return fetch(`${API_URL}/extract/facts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(async (response) => {
          if (!response.ok) {
            const body = await response.json();
            throw new Error(body.error || 'Extraction failed');
          }
          const result = await response.json();
          return { inputId: input.input_id, suggestions: result.suggestions as { text: string; source_excerpt?: string }[] };
        });
      });

      const results = await Promise.allSettled(promises);
      const allSuggestions: { text: string; source_excerpt?: string; inputId: string }[] = [];
      const errors: string[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const s of result.value.suggestions) {
            allSuggestions.push({ ...s, inputId: result.value.inputId });
          }
        } else {
          errors.push(result.reason?.message || 'Extraction failed');
        }
      }

      if (errors.length > 0 && allSuggestions.length === 0) {
        onError(errors[0]);
        return;
      }
      if (allSuggestions.length === 0) {
        onError('No facts could be extracted from the selected inputs.');
        return;
      }
      if (errors.length > 0) {
        onError(`${errors.length} input(s) failed, but facts were extracted from the rest.`);
      }

      setSuggestionData({ suggestions: allSuggestions });
    } catch (err: any) {
      onError(err.message || 'Extraction request failed');
    } finally {
      setExtractingFacts(false);
    }
  };

  const addFactToData = useCallback((text: string, relatedInputs: string[], sourceExcerpt?: string) => {
    const newFact: FactType = {
      fact_id: Math.random().toString(16).slice(2),
      text,
      related_inputs: relatedInputs,
      source_excerpt: sourceExcerpt,
    };
    setData((prevState) => prevState ? ({
      ...prevState,
      facts: [...prevState.facts, newFact],
    }) : prevState);
  }, [setData]);

  const handleAcceptSuggestion = (suggestion: { text: string; source_excerpt?: string; inputId?: string }) => {
    const relatedInputs = suggestion.inputId ? [suggestion.inputId] : Array.from(selectedInputIds);
    addFactToData(suggestion.text, relatedInputs, suggestion.source_excerpt);
  };

  const handleCloseSuggestions = useCallback(() => {
    setSuggestionData(null);
  }, []);

  const handleAddFactFromSelection = () => {
    setIsFactModalVisible(true);
  };

  const saveFactFromSelection = (factData: FactType) => {
    addFactToData(factData.text, factData.related_inputs);
    setIsFactModalVisible(false);
  };

  const deleteInput = (inputId: string) => {
    const updatedInputs = data.inputs.filter((input) => input.input_id !== inputId);
    setData((prevState) => prevState ? ({
      ...prevState,
        inputs: updatedInputs
      }) : prevState);
  };

  return (
    <div className="column inputs">
      <div className="column-header">
        <h2>📥Inputs</h2>
        {data.inputs.length > 0 && selectedInputIds.size < data.inputs.length && (
          <button className="select-all-button" onClick={() => selectAll(data.inputs.map(i => i.input_id))} title="Select all inputs">
            <FontAwesomeIcon icon={faCheckDouble} /> Select All
          </button>
        )}
        <button className="header-add-button" onClick={openAddModal} title="Add Input"><FontAwesomeIcon icon={faAdd} /></button>
      </div>
      <div className={`toolbar-wrapper${selectedInputIds.size > 0 ? ' toolbar-wrapper-open' : ''}`}>
        <div className="selection-toolbar">
          <span>{selectedInputIds.size} input(s) selected</span>
          <button onClick={handleExtractFacts} disabled={extractingFacts || !backendAvailable} title={!backendAvailable ? 'Backend unavailable' : ''}>
            <FontAwesomeIcon icon={extractingFacts ? faSpinner : faWandMagicSparkles} spin={extractingFacts} />
            {' '}Generate Facts
          </button>
          <button onClick={handleAddFactFromSelection}>
            <FontAwesomeIcon icon={faClipboard} />
            {' '}Add Fact
          </button>
          <button onClick={clearSelection}>
            <FontAwesomeIcon icon={faXmark} />
            {' '}Clear
          </button>
        </div>
      </div>
      {data.inputs.length === 0 && (
        <p className="empty-state-hint">Add a text or web URL to start collecting sources.</p>
      )}
      {data.inputs.map((input, index) => (
        <div
          key={input.input_id}
          onClick={() => toggleInputSelection(input.input_id)}
          className={selectedInputIds.has(input.input_id) ? 'item-selectable selected' : 'item-selectable'}
        >
          <ItemWrapper
            id={"input-" + input.input_id}
            index={index}
            item={input}
            setItemRef={setInputRef}
            handleMouseEnter={() => handleMouseEnter("input", input.input_id, data)}
            handleMouseLeave={() => handleMouseLeave("input", input.input_id, data)}
            openEditModal={openEditModal}
            onViewTraceability={() => onViewTraceability("input", input.input_id)}
          >
            <InputItem input={input} />
          </ItemWrapper>
        </div>
      ))}
      <InputModal
        mode={modalMode}
        isDialogVisible={isInputDialogVisible}
        closeDialog={() => setIsInputDialogVisible(false)}
        saveInput={saveInput}
        deleteInput={deleteInput}
        inputData={editingInput as InputType}
      />
      <FactModal
        mode="add"
        isDialogVisible={isFactModalVisible}
        closeDialog={() => setIsFactModalVisible(false)}
        saveFact={saveFactFromSelection}
        deleteFact={() => {}}
        factData={{ fact_id: '', text: '', related_inputs: Array.from(selectedInputIds) } as FactType}
        inputs={data.inputs}
      />
      {suggestionData && (
        <SuggestionsPanel
          suggestions={suggestionData.suggestions}
          inputId="facts"
          title="Suggested Facts"
          onAccept={(suggestion) => handleAcceptSuggestion(suggestion)}
          onClose={handleCloseSuggestions}
        />
      )}
    </div>
  );
};


export default InputList;
