import { useEffect, useState } from "react";
import { faEdit, faFileDownload, faPlus, faUpload, faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Toolbar.css";

import DiscoveryModal from "./DiscoveryModal";
import StartEventRoomModal from './StartEventRoomModal';
import { StringParam, useQueryParam } from "use-query-params";

type Props = {
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
};

const Toolbar = ({ data, setData }: Props) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isStartEventRoomModalVisible, setIsStartEventRoomModalVisible] = useState(false);
  const [roomId, setRoomId] = useQueryParam('room', StringParam);
  const [username = `User${Math.floor(Math.random() * 1000)}`, setUsername] = useQueryParam('username', StringParam);
  
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

  const handleStartEventRoom = async () => {
    try {
      const response = await fetch('http://localhost:3002/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const roomData  = await response.json();
      setRoomId(roomData.roomId);
      setIsStartEventRoomModalVisible(true);
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  useEffect(() => {
    if (roomId) {
      // Fetch room data
      const fetchRoomData = async () => {
        try {
          const response = await fetch(`http://localhost:3002/rooms/${roomId}`);
          const roomData = await response.json();
          if (roomData && Object.keys(roomData).length !== 0) {
            console.log(roomData);
            setData(roomData);
          } else {
            console.error(`no data in room ${roomId}`);
          }
            
          // Set up SSE
          const eventSource = new EventSource(`http://localhost:3002/events/${roomId}?username=${username}`);
          eventSource.onmessage = (event) => {
            console.log(event);
            const message = JSON.parse(event.data);
          
            if (message.type === 'update' || message.type === 'init') {
              if (username !== message.username && JSON.stringify(message.payload) !== JSON.stringify(data)) {
                setData(message.payload);
              }
            }
          };

          eventSource.onerror = (error) => {
            console.error('EventSource failed:', error);
            eventSource.close();
          };

          // Cleanup on component unmount
          return () => {
            eventSource.close();
          };
        } catch (error) {
          console.error('Error fetching room data:', error);
        }
      };

      fetchRoomData();
    }
  }, [roomId, setData, data, username]);


  useEffect(() => {
    if (roomId && data && username) {
      try {
        fetch(`http://localhost:3002/rooms/${roomId}/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data, username })
        });
      } catch (error) {
        console.error('Error updating room data:', error);
      }
    }
  }, [data, roomId, username]);
  

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
      <div title="Start Event Room" onClick={handleStartEventRoom}>
        <FontAwesomeIcon icon={faPlayCircle} size='lg' />
      </div>
      
      <StartEventRoomModal
        isDialogVisible={isStartEventRoomModalVisible}
        closeDialog={() => setIsStartEventRoomModalVisible(false)}
        roomId={roomId ?? ""}
        username={username ?? ""}
        setUsername={setUsername}
      />
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