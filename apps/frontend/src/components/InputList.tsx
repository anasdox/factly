import React, { useCallback, useState } from 'react';
import InputItem from './InputItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import InputModal from './InputModal';
import SuggestionsPanel from './SuggestionsPanel';


type Props = {
  inputRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;
  onError: (msg: string) => void;
};

type SuggestionData = {
  suggestions: { text: string }[];
  inputId: string;
};

const InputList: React.FC<Props> = ({ inputRefs, data, setData, handleMouseEnter, handleMouseLeave, onError }) => {

  const [isInputDialogVisible, setIsInputDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingInput, setEditingInput] = useState<ItemType | null>(null);
  const [extractingInputId, setExtractingInputId] = useState<string | null>(null);
  const [suggestionData, setSuggestionData] = useState<SuggestionData | null>(null);
  const setInputRef = useCallback((element: HTMLDivElement, index: number) => { inputRefs.current[index] = element; }, [inputRefs]);


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
  
  const handleExtractFacts = async (input: InputType) => {
    setExtractingInputId(input.input_id);
    try {
      const response = await fetch('http://localhost:3002/extract/facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: input.text,
          goal: data.goal,
          input_id: input.input_id,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        onError(body.error || 'Extraction failed');
        return;
      }
      const result = await response.json();
      if (result.suggestions.length === 0) {
        onError('No facts could be extracted from this text.');
        return;
      }
      setSuggestionData({ suggestions: result.suggestions, inputId: input.input_id });
    } catch (err: any) {
      onError(err.message || 'Extraction request failed');
    } finally {
      setExtractingInputId(null);
    }
  };

  const handleAcceptSuggestion = (text: string, inputId: string) => {
    const newFact: FactType = {
      fact_id: Math.random().toString(16).slice(2),
      text,
      related_inputs: [inputId],
    };
    setData((prevState) => prevState ? ({
      ...prevState,
      facts: [...prevState.facts, newFact],
    }) : prevState);
  };

  const handleCloseSuggestions = () => {
    setSuggestionData(null);
  };

  const deleteInput = (inputId: string) => {
    const updatedInputs = data.inputs.filter((input) => input.input_id!== inputId);
    setData((prevState) => prevState ? ({
      ...prevState,
        inputs: updatedInputs
      }) : prevState);
  };

  return (
    <div className="column inputs">
      <h2>📥Inputs</h2>
      {data.inputs.map((input, index) => (
        <ItemWrapper
          id={"input-" + input.input_id}
          key={input.input_id}
          index={index}
          item={input}
          setItemRef={setInputRef}
          handleMouseEnter={() => handleMouseEnter("input", input.input_id, data)}
          handleMouseLeave={() => handleMouseLeave("input", input.input_id, data)}
          openEditModal={openEditModal}
          onExtractFacts={input.type === 'text' ? () => handleExtractFacts(input) : undefined}
          extractDisabled={input.type === 'text' && (!input.text || input.text.trim() === '')}
          extractLoading={extractingInputId === input.input_id}
        >
          <InputItem input={input} />
        </ItemWrapper>
      ))}
      <button className="add-button" onClick={openAddModal}><FontAwesomeIcon icon={faAdd} /></button >
      <InputModal
        mode={modalMode}
        isDialogVisible={isInputDialogVisible}
        closeDialog={() => setIsInputDialogVisible(false)}
        saveInput={saveInput}
        deleteInput={deleteInput}
        inputData={editingInput as InputType}
      />
      {suggestionData && (
        <SuggestionsPanel
          suggestions={suggestionData.suggestions}
          inputId={suggestionData.inputId}
          onAccept={handleAcceptSuggestion}
          onClose={handleCloseSuggestions}
        />
      )}
    </div>
  );
};


export default InputList;
