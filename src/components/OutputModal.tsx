import React, { useEffect, useState } from 'react';
import ModalDialog from 'react-basic-modal-dialog';

type Props = {
  mode: 'add' | 'edit';
  isDialogVisible: boolean;
  closeDialog: () => void;
  saveOutput: (outputData: OutputType) => void;
  deleteOutput: (outputId: string) => void;
  outputData: OutputType | null;
  recommendations: RecommendationType[] | null;
};

const OutputModal: React.FC<Props> = ({
  mode,
  isDialogVisible,
  closeDialog,
  saveOutput,
  deleteOutput,
  outputData,
  recommendations
}) => {
  const [currentOutputText, setCurrentOutputText] = useState("");
  const [currentOutputRelatedRecommendations, setCurrentRelatedRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (mode === 'edit' && outputData) {
      setCurrentOutputText(outputData.text);
      setCurrentRelatedRecommendations(outputData.related_recommendations);
    } else {
      setCurrentOutputText('');
      setCurrentRelatedRecommendations([]);
    }
  }, [mode, outputData]);

  const handleSave = () => {
    const newOutputData: OutputType = {
      output_id: outputData ? outputData.output_id : Math.random().toString(16).slice(2),
      text: currentOutputText,
      related_recommendations: currentOutputRelatedRecommendations,
    };
    saveOutput(newOutputData);
    closeDialog();
  };
  const handleDelete = () => {
    if (outputData && outputData.output_id && window.confirm(`Are you sure you want to delete this output?`)) {
      deleteOutput(outputData.output_id);
      closeDialog();
    }
  };

  return (
    <ModalDialog isDialogVisible={isDialogVisible} closeDialog={closeDialog}>
      <h2>{mode === 'add' ? 'Add Output' : 'Edit Output'}</h2>
      <form>
        <label htmlFor="output-text">Text</label>
        <textarea
          id="output-text"
          rows={5}
          value={currentOutputText}
          required
          onChange={(event) => {
            setCurrentOutputText(event.target.value);
          }} />
        <label htmlFor="output-related-recommendations">Related Recommendations</label>
        <select
          id="output-related-recommendations"
          value={currentOutputRelatedRecommendations}
          onChange={(event) => {
            const selectedOptions = Array.from(event.target.selectedOptions, (option) => option.value);
            setCurrentRelatedRecommendations(selectedOptions);
          }} multiple>
          {recommendations ? recommendations.map((recommendation) => (
            <option key={recommendation.recommendation_id} value={recommendation.recommendation_id}>
              {recommendation.text}
            </option>
          )) : ""}
        </select>
      </form>
      <div className='modal-actions'>
        <div className="modal-action-group-left">
          <button className='modal-action-save' onClick={handleSave}>{mode === 'add' ? '➕Add' : '💾Save'}</button>
        </div>
        <div className="modal-action-group-right">
          <button className='modal-action-close' onClick={closeDialog}>🗙Cancel</button>
          {mode === 'edit' &&
            <button className='modal-action-delete' onClick={handleDelete}>🗑️Delete</button>
          }
        </div>
      </div>
    </ModalDialog>
  );
};

export default OutputModal;
