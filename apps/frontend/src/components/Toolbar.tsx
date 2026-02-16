import { useEffect, useRef, useState } from "react";
import { faEdit, faFileDownload, faPlus, faUpload, faPlayCircle, faMoon, faSun, faRoute } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Toolbar.css";

import DiscoveryModal from "./DiscoveryModal";
import StartEventRoomModal from './StartEventRoomModal';
import Modal from './Modal';

import { StringParam, useQueryParam } from "use-query-params";
import { useLocalStorage } from 'usehooks-ts'
import { isObjectEmpty } from "../lib";
import { API_URL } from "../config";


type Props = {
  data: DiscoveryData;
  setData: React.Dispatch<React.SetStateAction<DiscoveryData | null>>;
  onError: (msg: string) => void;
  onInfo: (msg: string) => void;
  onWaiting: (msg: string) => void;
  backendAvailable: boolean;
  onStartTour?: () => void;
};

const Toolbar = ({ data, setData, onError, onInfo, onWaiting, backendAvailable, onStartTour }: Props) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isStartEventRoomModalVisible, setIsStartEventRoomModalVisible] = useState(false);
  const [roomId, setRoomId] = useQueryParam('room', StringParam);
  const [uuid, setUuid] = useLocalStorage('uuid', null);
  const [username, setUsername] = useLocalStorage('username', null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const isRemoteUpdate = useRef(false);
  const uuidRef = useRef<string | null>(uuid);
  const usernameRef = useRef<string | null>(username);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'light' ? '' : theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();

    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = e => {
        try {
          const parsed = JSON.parse(e.target?.result as string) as DiscoveryData;
          setConfirmAction({
            message: `Import "${parsed.title || 'Untitled'}"? This will replace the current discovery.`,
            onConfirm: () => {
              setConfirmAction(null);
              setData(parsed);
            },
          });
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };
      fileReader.onerror = (error) => {
        console.error("Error reading file:", error);
      };
    }
    // Reset input so the same file can be re-selected
    event.target.value = '';
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

  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const handleNewDiscovery = () => {
    setConfirmAction({
      message: 'Are you sure you want to start a new discovery?',
      onConfirm: () => {
        setConfirmAction(null);
        setModalMode('add');
        setIsModalVisible(true);
      },
    });
  };

  const handleStartEventRoom = async () => {
    try {
      if (data && data.discovery_id) {
        onWaiting('Creating event room...');
        const response = await fetch(`${API_URL}/rooms`, {
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
        onInfo('Event room created.');
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
          const response = await fetch(`${API_URL}/rooms/${roomId}`);
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

          let esurl = `${API_URL}/events/${roomId}?`;
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
              uuidRef.current = message.uuid;
              usernameRef.current = message.username;
              setUsername(message.username);
              setUuid(message.uuid);
            }

            if (message.type === 'update' || message.type === 'init') {
              isRemoteUpdate.current = true;
              setData(message.payload);
            }
          };

          newEventSource.onerror = () => {
            if (newEventSource.readyState === EventSource.CLOSED) {
              onError('Lost connection to the room');
            }
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

  // Polling fallback: fetch latest room data periodically in case SSE misses updates
  useEffect(() => {
    if (!roomId) return;
    const poll = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/rooms/${roomId}`);
        if (!response.ok) return;
        const roomData = await response.json();
        if (roomData && Object.keys(roomData).length !== 0) {
          // Only update if the data actually changed (compare stringified)
          const remote = JSON.stringify(roomData);
          const local = JSON.stringify(data);
          if (remote !== local) {
            isRemoteUpdate.current = true;
            setData(roomData);
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);
    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, data]);

  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    if (roomId && uuidRef.current && usernameRef.current && !isObjectEmpty(data)) {
      const timer = setTimeout(() => {
        fetch(`${API_URL}/rooms/${roomId}/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            payload: data,
            username: usernameRef.current,
            senderUuid: uuidRef.current,
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
      }, 1000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, roomId]);


  return (
    <div className="toolbar">
      <label htmlFor="file-input" className="toolbar-upload" title="Open Discovery">
        <FontAwesomeIcon icon={faUpload} size='lg' />
        <input
          id="file-input"
          type="file"
          accept=".json"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </label>
      <div title="Save Discovery" onClick={handleExport}>
        <FontAwesomeIcon icon={faFileDownload} size='lg' />
      </div>
      <div title="Edit Discovery Goal" onClick={handleEditDiscovery}>
        <FontAwesomeIcon icon={faEdit} size='lg' />
      </div>
      <div title="New Discovery" onClick={handleNewDiscovery}>
        <FontAwesomeIcon icon={faPlus} size='lg' />
      </div>
      <div
        title={backendAvailable ? "Start Event Room" : "Backend unavailable"}
        onClick={backendAvailable ? handleStartEventRoom : undefined}
        className={backendAvailable ? '' : 'toolbar-disabled'}
      >
        <FontAwesomeIcon icon={faPlayCircle} size='lg' />
      </div>
      {onStartTour && (
        <div title="Guided Tour" onClick={() => {
          if (roomId) {
            if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
              eventSource.close();
            }
            setEventSource(null);
            setRoomId(undefined);
          }
          onStartTour();
        }}>
          <FontAwesomeIcon icon={faRoute} size='lg' />
        </div>
      )}
      <div title={theme === 'light' ? 'Dark mode' : 'Light mode'} onClick={toggleTheme}>
        <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} size='lg' />
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
      <Modal isVisible={!!confirmAction} onClose={() => setConfirmAction(null)} maxWidth="400px">
        <p style={{ margin: '0 0 1em' }}>{confirmAction?.message}</p>
        <div className="modal-actions">
          <div className="modal-action-group-left">
            <button className="modal-action-save" onClick={confirmAction?.onConfirm}>Confirm</button>
          </div>
          <div className="modal-action-group-right">
            <button className="modal-action-close" onClick={() => setConfirmAction(null)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>);
}

export default Toolbar;
