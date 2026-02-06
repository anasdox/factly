import { useEffect, useRef, useState } from "react";
import { faEdit, faFileDownload, faPlus, faUpload, faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Toolbar.css";

import DiscoveryModal from "./DiscoveryModal";
import StartEventRoomModal from './StartEventRoomModal';
import { StringParam, useQueryParam } from "use-query-params";
import { useLocalStorage } from 'usehooks-ts'
import { isObjectEmpty } from "../lib";


type Props = {
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  onError: (msg: string) => void;
};

const Toolbar = ({ data, setData, onError }: Props) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isStartEventRoomModalVisible, setIsStartEventRoomModalVisible] = useState(false);
  const [roomId, setRoomId] = useQueryParam('room', StringParam);
  const [uuid, setUuid] = useLocalStorage('uuid', null);
  const [username, setUsername] = useLocalStorage('username', null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const isRemoteUpdate = useRef(false);

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
      if (data && data.discovery_id) {
        const response = await fetch('http://localhost:3002/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
          onError(errorBody.error || 'Failed to create room');
          return;
        }
        const roomData = await response.json();
        setRoomId(roomData.roomId);
        setIsStartEventRoomModalVisible(true);
      }
    } catch (error) {
      onError('Network error: could not reach the server');
    }
  };

  useEffect(() => {
    if (roomId && !eventSource) {
      // Fetch room data
      const fetchRoomData = async () => {
        try {
          const response = await fetch(`http://localhost:3002/rooms/${roomId}`);
          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
            onError(errorBody.error || 'Failed to fetch room data');
            return;
          }
          const roomData = await response.json();
          if (roomData && Object.keys(roomData).length !== 0) {
            isRemoteUpdate.current = true;
            setData(roomData);
          }

          let esurl = `http://localhost:3002/events/${roomId}?`;
          if (uuid) {
            esurl += `uuid=${uuid}&`;
          }
          if (username) {
            esurl += `username=${username}`;
          }

          const newEventSource = new EventSource(esurl);
          newEventSource.onmessage = (event) => {
            const message = JSON.parse(event.data)
            console.log("Receive sse message:", message);

            if (message.type === 'credentials') {
              setUsername(message.username);
              setUuid(message.uuid);
            }

            if (message.type === 'update' || message.type === 'init') {
              isRemoteUpdate.current = true;
              setData(message.payload);
            }
          };

          newEventSource.onerror = () => {
            onError('Lost connection to the room');
            newEventSource.close();
          };
          setEventSource(newEventSource);

          return () => {
            if (eventSource && (eventSource as EventSource).readyState !== EventSource.CLOSED) {
              (eventSource as EventSource).close();
            }
          };
        } catch (error) {
          onError('Network error: could not reach the server');
        }
      };

      fetchRoomData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);


  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    if (roomId && !isObjectEmpty(data)) {
      fetch(`http://localhost:3002/rooms/${roomId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payload: data,
          username: username,
          senderUuid: uuid,
        })
      }).then((response) => {
        if (!response.ok) {
          response.json().catch(() => ({ error: 'Unknown error' })).then((body) => {
            onError(body.error || 'Failed to update room');
          });
        }
      }).catch(() => {
        onError('Network error: could not reach the server');
      });
    }
  }, [data, roomId, username, uuid]);


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