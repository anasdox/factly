import React, { useCallback, useState } from 'react';
import OutputItem from './OutputItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import ItemWrapper from './ItemWrapper';
import OutputModal from './OutputModal';

type Props = {
  outputRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  handleMouseEnter: (entityType: string, entityId: string, data: DiscoveryData) => void;
  handleMouseLeave: (entityType: string, entityId: string, data: DiscoveryData) => void;
};

const OutputList: React.FC<Props> = ({ outputRefs, data, setData, handleMouseEnter, handleMouseLeave }) => {

  const [isOutputDialogVisible, setIsOutputDialogVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingOutput, setEditingOutput] = useState<ItemType | null>(null);
  const setOutputRef = useCallback((element: HTMLDivElement, index: number) => { outputRefs.current[index] = element; }, [outputRefs]);

  const openAddModal = () => {
    setModalMode('add');
    setEditingOutput(null);
    setIsOutputDialogVisible(true);
  };

  const openEditModal = (item: ItemType) => {
    setModalMode('edit');
    setEditingOutput(item);
    setIsOutputDialogVisible(true);
  };

  const saveOutput = (outputData: OutputType) => {
    if (modalMode === 'add') {
      const newOutput: OutputType = {
        output_id: Math.random().toString(16).slice(2),
        text: outputData.text,
        related_recommendations: outputData.related_recommendations,
      };
      setData((prevState) => prevState ? ({
        ...prevState,
        outputs: [...prevState.outputs, newOutput]
      }) : prevState);
    } else if (modalMode === 'edit' && outputData.output_id) {
      const updatedOutputs = data.outputs.map((output) =>
        output.output_id === outputData.output_id ? { ...output, ...outputData } : output
      );
      setData((prevState) => prevState ? ({
        ...prevState,
        outputs: updatedOutputs
      }) : prevState);
    }
    setIsOutputDialogVisible(false);
  };

  return (
    <div className="column outputs">
      <h2>📤Outputs</h2>
      {data.outputs.map((output, index) => (

        <ItemWrapper
          id={"output-" + output.output_id}
          key={output.output_id}
          index={index}
          item={output}
          setItemRef={setOutputRef}
          handleMouseEnter={() => handleMouseEnter("output", output.output_id, data)}
          handleMouseLeave={() => handleMouseLeave("output", output.output_id, data)}
          openEditModal={openEditModal}
        >
          <OutputItem
            output={output}
          />
        </ItemWrapper>

      ))}
      <button className="add-button output-add-button" onClick={openAddModal}><FontAwesomeIcon icon={faAdd} /></button>
      <OutputModal
        mode={modalMode}
        isDialogVisible={isOutputDialogVisible}
        closeDialog={() => setIsOutputDialogVisible(false)}
        saveOutput={saveOutput}
        outputData={editingOutput as OutputType}
        recommendations={data.recommendations}
      />
    </div>
  );
};

export default OutputList;
