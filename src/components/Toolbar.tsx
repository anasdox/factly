import { faEdit, faFileDownload, faPlus, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Toolbar.css";
import { useState } from "react";
import DiscoveryModal from "./DiscoveryModal";

type Props = {
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
};

const Toolbar = ({ data, setData }: Props) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();

    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = e => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setData(data as DiscoveryData);
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };
      fileReader.onerror = (error) => {
        console.error("Error reading file:", error);
      };
    }
  };

  const handleExport = () => {
    if (!data) return;

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.title.replace(/\s+/g, '_')}_export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditDiscovery = () => {
    if (!data) {
      console.error('No discovery data to edit.');
      return;
    }
    setModalMode('edit');
    setIsModalVisible(true);
  };

  const handleNewDiscovery = () => {
    if (window.confirm('Are you sure you want to start a new discovery?')) {
      const newDiscoveryData: DiscoveryData = {
        discovery_id: '', // Generate a new ID or keep it empty to be set later
        title: '',
        goal: '',
        date: '', // Set to current date or keep it empty to be set later
        inputs: [],
        facts: [],
        insights: [],
        recommendations: [],
        outputs: [],
      };
      setData(newDiscoveryData);
      setModalMode('add');
      setIsModalVisible(true);
    }
  };

  return (
    <div className="toolbar">
      <div title="Open Discovery">
        <label htmlFor="file-input">
          <FontAwesomeIcon icon={faUpload} size='lg' />
        </label>
        <input
          id="file-input"
          type="file"
          accept=".json"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>
      <div title="Save Discovery" onClick={handleExport}>
          <FontAwesomeIcon icon={faFileDownload} size='lg' />
      </div>
      <div title="Edit Discovery Goal" onClick={handleEditDiscovery}>
          <FontAwesomeIcon icon={faEdit} size='lg' />
      </div>
      <div title="New Discovery" onClick={handleNewDiscovery}>
          <FontAwesomeIcon icon={faPlus} size='lg' />
      </div>
      <DiscoveryModal
        mode={modalMode}
        isDialogVisible={isModalVisible}
        discoveryData={data}
        setDiscoveryData={setData}
        closeDialog={() => setIsModalVisible(false)}
      />
    </div>);
}

export default Toolbar;