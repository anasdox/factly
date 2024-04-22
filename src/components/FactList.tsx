import React, { useCallback, useState } from 'react';
import FactItem from './FactItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ModalDialog from 'react-basic-modal-dialog';


type Props = {
  factRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;

};

const FactList: React.FC<Props> = ({ factRefs, data, setData, handleMouseEnter, handleMouseLeave }) => {

  const [isFactDialogVisible, setIsFactDialogVisible] = useState(false);
  const [currentFactText, setCurrentFactText] = useState("");
  const [currentFactRelatedInputs, setCurrentRelatedInputs] = useState<string[]>([]);
  const setFactRef = useCallback((element: HTMLDivElement, index: number) => { factRefs.current[index] = element; }, [factRefs]);


  return (
    <div className="column facts">
      <h2>📊Facts</h2>
      {data.facts.map((fact, index) => (
        <FactItem
          key={fact.fact_id}
          fact={fact}
          index={index}
          setFactRef={setFactRef}
          handleMouseEnter={() => handleMouseEnter("fact", fact.fact_id, data)}
          handleMouseLeave={() => handleMouseLeave("fact", fact.fact_id, data)}
        />
      ))}
      <button className="add-button fact-add-button" onClick={() => { setIsFactDialogVisible(true) }}><FontAwesomeIcon icon={faAdd} /></button>
      <ModalDialog isDialogVisible={isFactDialogVisible} closeDialog={() => setIsFactDialogVisible(false)}>
        <h2>Add Fact</h2>
        <form>
          <label htmlFor="fact-text">Text</label>
          <textarea
            id="fact-text"
            rows={5}
            onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => {
              setCurrentFactText(event.target.value);
            }} />
          <select
            id="fact-related-inputs"
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              const selectedOptions = Array.from(event.target.selectedOptions, (option) => (option as HTMLOptionElement).value);
              setCurrentRelatedInputs(selectedOptions);
            }} multiple>
            {data.inputs ? data.inputs.map((input) => (<option key={input.input_id} value={input.input_id}>{input.title}</option>)) : ""}
          </select>

        </form>
        <button onClick={() => setIsFactDialogVisible(false)}>Close</button>
        <button onClick={() => {
          const newFact: FactType = {
            fact_id: data.facts[data.facts.length - 1].fact_id + 1,
            text: currentFactText,
            related_inputs: currentFactRelatedInputs
          };
          setData((prevState) => prevState ? ({ ...prevState, facts: [...prevState.facts, newFact] }) : prevState);
          setIsFactDialogVisible(false);
        }}>Save</button>

      </ModalDialog>
    </div>
  );
};


export default FactList;
