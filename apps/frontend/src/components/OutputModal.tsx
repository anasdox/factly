import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPlus, faTrashCan, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

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
  const [currentOutputType, setCurrentOutputType] = useState<OutputType['type']>('report');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (outputData) {
      setCurrentOutputText(outputData.text);
      setCurrentRelatedRecommendations(outputData.related_recommendations);
      setCurrentOutputType(outputData.type || 'report');
    } else {
      setCurrentOutputText('');
      setCurrentRelatedRecommendations([]);
      setCurrentOutputType('report');
    }
    setConfirmDelete(false);
  }, [mode, outputData, isDialogVisible]);

  const handleSave = () => {
    const newOutputData: OutputType = {
      output_id: outputData ? outputData.output_id : Math.random().toString(16).slice(2),
      text: currentOutputText,
      related_recommendations: currentOutputRelatedRecommendations,
      type: currentOutputType,
    };
    saveOutput(newOutputData);
    closeDialog();
  };

  const handleDelete = () => {
    if (outputData && outputData.output_id) {
      deleteOutput(outputData.output_id);
      closeDialog();
    }
  };

  return (
    <Modal isVisible={isDialogVisible} onClose={closeDialog}>
      {confirmDelete ? (
        <>
          <p style={{ margin: '0 0 1em' }}>Are you sure you want to delete this output?</p>
          <div className="modal-actions">
            <div className="modal-action-group-left">
              <button className="modal-action-save" onClick={handleDelete}>Confirm</button>
            </div>
            <div className="modal-action-group-right">
              <button className="modal-action-close" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          </div>
        </>
      ) : (
        <>
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
            <label htmlFor="output-type">Type</label>
            <select
              id="output-type"
              value={currentOutputType}
              onChange={(event) => setCurrentOutputType(event.target.value as OutputType['type'])}
            >
              <option value="report">Report</option>
              <option value="presentation">Presentation</option>
              <option value="action_plan">Action Plan</option>
              <option value="brief">Brief</option>
            </select>
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
              <button className='modal-action-close' onClick={closeDialog}><FontAwesomeIcon icon={faXmark} /> Cancel</button>
              {mode === 'edit' &&
                <button className='modal-action-delete' onClick={() => setConfirmDelete(true)}><FontAwesomeIcon icon={faTrashCan} /> Delete</button>
              }

            </div>
            <div className="modal-action-group-right">
              <button className='modal-action-save' onClick={handleSave}>{mode === 'add' ? <><FontAwesomeIcon icon={faPlus} /> Add</> : <><FontAwesomeIcon icon={faFloppyDisk} /> Save</>}</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
};

export default OutputModal;
