import React, { useCallback, useState } from 'react';
import InputItem from './InputItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import InputModal from './InputModal';


type Props = {
  inputRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;

};

const InputList: React.FC<Props> = ({ inputRefs, data, setData, handleMouseEnter, handleMouseLeave }) => {

  const [isInputDialogVisible, setIsInputDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingInput, setEditingInput] = useState<ItemType | null>(null);
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
        inputData={editingInput as InputType}
      />
    </div>
  );
};


export default InputList;
