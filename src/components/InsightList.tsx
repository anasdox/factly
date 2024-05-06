import React, { useCallback, useState } from 'react';
import InsightItem from './InsightItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import InsightModal from './InsightModal';

type Props = {
  insightRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;
};

const InsightList: React.FC<Props> = ({ insightRefs, data, setData, handleMouseEnter, handleMouseLeave }) => {

  const [isInsightDialogVisible, setIsInsightDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingInsight, setEditingInsight] = useState<ItemType | null>(null);
  const setInsightRef = useCallback((element: HTMLDivElement, index: number) => { insightRefs.current[index] = element; }, [insightRefs]);

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

  return (
    <div className="column insights">
      <h2>💡Insights</h2>
      {data.insights.map((insight, index) => (

        <ItemWrapper
          id={"insight-" + insight.insight_id}
          key={insight.insight_id}
          index={index}
          item={insight}
          setItemRef={setInsightRef}
          handleMouseEnter={() => handleMouseEnter("insight", insight.insight_id, data)}
          handleMouseLeave={() => handleMouseLeave("insight", insight.insight_id, data)}
          openEditModal={openEditModal}
        >
          <InsightItem
            insight={insight}
          />
        </ItemWrapper>

      ))}
      <button className="add-button insight-add-button" onClick={openAddModal}><FontAwesomeIcon icon={faAdd} /></button>
      <InsightModal
        mode={modalMode}
        isDialogVisible={isInsightDialogVisible}
        closeDialog={() => setIsInsightDialogVisible(false)}
        saveInsight={saveInsight}
        insightData={editingInsight as InsightType}
        facts={data.facts}
      />
    </div>
  );
};

export default InsightList;
