import React, { useCallback, useState } from 'react';
import InputItem from './InputItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ModalDialog from 'react-basic-modal-dialog';
import ItemWrapper from './ItemWrapper';


type Props = {
  inputRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;

};

const InputList: React.FC<Props> = ({ inputRefs, data, setData, handleMouseEnter, handleMouseLeave }) => {

  const [isInputDialogVisible, setIsInputDialogVisible] = useState(false);
  const [currentInputTitle, setCurrentInputTitle] = useState("");
  const [currentInputType, setCurrentInputType] = useState("");
  const [currentInputUrl, setCurrentInputUrl] = useState("");
  const setInputRef = useCallback((element: HTMLDivElement, index: number) => { inputRefs.current[index] = element; }, [inputRefs]);


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
        >
          <InputItem input={input} />
        </ItemWrapper>
      ))}
      <button className="add-button" onClick={() => { setIsInputDialogVisible(true) }}><FontAwesomeIcon icon={faAdd} /></button >
      <ModalDialog isDialogVisible={isInputDialogVisible} closeDialog={() => setIsInputDialogVisible(false)}>
        <h2>Add Input</h2>
        <form>
          <label htmlFor="input-title">Title</label>
          <input
            id="input-title"
            type="text"
            onChange={
              (event: { target: { value: React.SetStateAction<string>; }; }) => {
                setCurrentInputTitle(event.target.value);
              }} />
          <label htmlFor="input-url">URL</label>
          <input
            id="input-url"
            type="text"
            onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => {
              setCurrentInputUrl(event.target.value);
            }} />
          <label htmlFor="input-type">Type</label>
          <select
            id="input-type"
            onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => {
              setCurrentInputType(event.target.value);
            }}>
            <option value="text">Text</option>
            <option value="web">Web</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="pdf">Pdf</option>
          </select>
        </form>
        <button onClick={() => setIsInputDialogVisible(false)}>Close</button>
        <button onClick={() => {
          const newInput: InputType = {
            input_id: data.inputs[data.inputs.length - 1].input_id + 1,
            title: currentInputTitle,
            type: currentInputType,
            url: currentInputUrl
          };

          setData((prevState) => prevState ? ({
            ...prevState,
            inputs: [...prevState.inputs, newInput]
          }) : prevState);

          setIsInputDialogVisible(false);
        }}>Save</button>

      </ModalDialog>
    </div>
  );
};


export default InputList;
