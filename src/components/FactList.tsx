import React, { useCallback, useState } from 'react';
import FactItem from './FactItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import FactModal from './FactModal';


type Props = {
  factRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;

};

const FactList: React.FC<Props> = ({ factRefs, data, setData, handleMouseEnter, handleMouseLeave }) => {

  const [isFactDialogVisible, setIsFactDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingFact, setEditingFact] = useState<ItemType | null>(null);
  const setFactRef = useCallback((element: HTMLDivElement, index: number) => { factRefs.current[index] = element; }, [factRefs]);

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

  return (
    <div className="column facts">
      <h2>📊Facts</h2>
      {data.facts.map((fact, index) => (

        <ItemWrapper
          id={"fact-" + fact.fact_id}
          key={fact.fact_id}
          index={index}
          item={fact}
          setItemRef={setFactRef}
          handleMouseEnter={() => handleMouseEnter("fact", fact.fact_id, data)}
          handleMouseLeave={() => handleMouseLeave("fact", fact.fact_id, data)}
          openEditModal={openEditModal}
        >
          <FactItem
            fact={fact}
          />
        </ItemWrapper>

      ))}
      <button className="add-button fact-add-button" onClick={openAddModal}><FontAwesomeIcon icon={faAdd} /></button>
      <FactModal
        mode={modalMode}
        isDialogVisible={isFactDialogVisible}
        closeDialog={() => setIsFactDialogVisible(false)}
        saveFact={saveFact}
        factData={editingFact as FactType}
        inputs={data.inputs}
      />
    </div>
  );
};


export default FactList;
