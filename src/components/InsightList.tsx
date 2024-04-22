import React, { useCallback, useState } from 'react';
import InsightItem from './InsightItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ModalDialog from 'react-basic-modal-dialog';


type Props = {
  insightRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;

};

const InsightList: React.FC<Props> = ({ insightRefs, data, setData, handleMouseEnter, handleMouseLeave }) => {

  const [isInsightDialogVisible, setIsInsightDialogVisible] = useState(false);
  const [currentInsightText, setCurrentInsightText] = useState("");
  const [currentInsightRelatedFacts, setCurrentInsightRelatedFacts] = useState<string[]>([]);
  const setInsightRef = useCallback((element: HTMLDivElement, index: number) => { insightRefs.current[index] = element; }, [insightRefs]);


  return (
    <div className="column insights">
      <h2>💡Insights</h2>
      {data.insights.map((insight, index) => (
        <InsightItem
          key={insight.insight_id}
          insight={insight}
          index={index}
          setInsightRef={setInsightRef}
          handleMouseEnter={() => handleMouseEnter("insight", insight.insight_id, data)}
          handleMouseLeave={() => handleMouseLeave("insight", insight.insight_id, data)}
        />
      ))}
      <button className="add-button insight-add-button" onClick={() => { setIsInsightDialogVisible(true) }}><FontAwesomeIcon icon={faAdd} /></button>
      <ModalDialog isDialogVisible={isInsightDialogVisible} closeDialog={() => setIsInsightDialogVisible(false)}>
        <h2>Add Insight</h2>
        <form>
          <label htmlFor="insight-text">Text</label>
          <textarea
            id="insight-text"
            rows={5}
            onChange={(event: { target: { value: React.SetStateAction<string>; }; }) => {
              setCurrentInsightText(event.target.value);
            }} />
          <label htmlFor="insight-related-facts">Related Facts</label>
          <select
            id="insight-related-facts"
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              const selectedOptions = Array.from(event.target.selectedOptions, (option) => (option as HTMLOptionElement).value);
              setCurrentInsightRelatedFacts(selectedOptions);
            }} multiple>
            {data.facts.map(fact => (<option key={fact.fact_id} value={fact.fact_id}>{fact.text}</option>))}
          </select>

        </form>
        <button onClick={() => setIsInsightDialogVisible(false)}>Close</button>
        <button onClick={() => {
          const newInsight: InsightType = {
            insight_id: data.insights[data.insights.length - 1].insight_id + 1,
            text: currentInsightText,
            related_facts: currentInsightRelatedFacts
          };
          setData((prevState) => prevState ? ({ ...prevState, insights: [...prevState.insights, newInsight] }) : prevState);
          setIsInsightDialogVisible(false);
        }}>Save</button>
      </ModalDialog>
    </div>
  );
};


export default InsightList;
