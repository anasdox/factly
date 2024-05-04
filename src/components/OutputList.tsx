import React, { useCallback, useState } from 'react';
import OutputItem from './OutputItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ModalDialog from 'react-basic-modal-dialog';
import ItemWrapper from './ItemWrapper';


type Props = {
  outputRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;

};

const OutputList: React.FC<Props> = ({ outputRefs, data, setData, handleMouseEnter, handleMouseLeave }) => {

  const [isOutputDialogVisible, setIsOutputDialogVisible] = useState(false);
  const [currentOutputText, setCurrentOutputText] = useState("");
  const [currentOutputRelatedRecommendations, setCurrentOutputRelatedRecommendations] = useState<string[]>([]);

  const setOutputRef = useCallback((element: HTMLDivElement, index: number) => { outputRefs.current[index] = element; }, [outputRefs]);


  return (
    <div className="column outputs">
      <h2>📤Outputs</h2>
      {data.outputs.map((output, index) => (
        <ItemWrapper
          id={"output-" + output.output_id}
          key={output.output_id}
          item={output}
          index={index}
          setItemRef={setOutputRef}
          handleMouseEnter={() => handleMouseEnter("output", output.output_id, data)}
          handleMouseLeave={() => handleMouseLeave("output", output.output_id, data)}
        >
          <OutputItem output={output} />
        </ItemWrapper>
      ))}
      <button className="add-button" onClick={() => { setIsOutputDialogVisible(true) }}><FontAwesomeIcon icon={faAdd} /></button>
      <ModalDialog isDialogVisible={isOutputDialogVisible} onClose={() => setIsOutputDialogVisible(false)}>
        <h2>Add Output</h2>
        <form>
          <label htmlFor="output-text">Text:</label>
          <input
            type="text"
            id="output-text"
            onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => {
              setCurrentOutputText(event.target.value);
            }} />
          <label htmlFor="related-recommendations">Related Recommendations:</label>
          <select
            id="related-recommendations" multiple
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              const selectedOptions = Array.from(event.target.selectedOptions, (option) => (option as HTMLOptionElement).value);
              setCurrentOutputRelatedRecommendations(selectedOptions);
            }}>
            {data.recommendations.map((recommendation, index) => (
              <option key={index} value={recommendation.recommendation_id}>{recommendation.text}</option>
            ))}
          </select>
        </form>
        <button onClick={() => setIsOutputDialogVisible(false)}>Close</button>
        <button onClick={() => {
          const newOutput: OutputType = {
            output_id: data.outputs[data.outputs.length - 1].output_id + 1,
            text: currentOutputText,
            related_recommendations: currentOutputRelatedRecommendations
          };
          setData((prevState) => prevState ? ({ ...prevState, outputs: [...prevState.outputs, newOutput] }) : prevState);
          setIsOutputDialogVisible(false);
        }}>Save</button>
      </ModalDialog>
    </div>
  );
};


export default OutputList;
