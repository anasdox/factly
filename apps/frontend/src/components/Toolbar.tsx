import { useEffect, useRef, useState } from "react";
import { faEdit, faFileDownload, faPlus, faUpload, faPlayCircle, faMoon, faSun, faRoute, faMagnifyingGlass, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Toolbar.css";

import DiscoveryModal from "./DiscoveryModal";
import StartEventRoomModal from './StartEventRoomModal';
import DedupScanResultsPanel, { DuplicateGroup } from './DedupScanResultsPanel';
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

  // Dedup scan state
  const [scanning, setScanning] = useState(false);
  const [scanGroups, setScanGroups] = useState<DuplicateGroup[]>([]);
  const [showScanResults, setShowScanResults] = useState(false);

  const handleScanDuplicates = async () => {
    setScanning(true);
    onWaiting('Scanning for duplicates...');
    const allGroups: DuplicateGroup[] = [];

    const scanItems = async (
      type: 'fact' | 'insight' | 'recommendation',
      items: { id: string; text: string }[],
    ) => {
      if (items.length < 2) return;
      try {
        const response = await fetch(`${API_URL}/dedup/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        if (response.ok) {
          const result = await response.json();
          for (const group of (result.groups || [])) {
            allGroups.push({
              type,
              explanation: group.explanation || '',
              items: (group.ids || []).map((id: string) => {
                const match = items.find(i => i.id === id);
                return { id, text: match?.text || '' };
              }),
            });
          }
        }
      } catch { /* ignore scan errors for individual types */ }
    };

    await Promise.all([
      scanItems('fact', data.facts.map(f => ({ id: f.fact_id, text: f.text }))),
      scanItems('insight', data.insights.map(i => ({ id: i.insight_id, text: i.text }))),
      scanItems('recommendation', data.recommendations.map(r => ({ id: r.recommendation_id, text: r.text }))),
    ]);

    setScanning(false);

    if (allGroups.length === 0) {
      onInfo('No duplicates detected.');
    } else {
      onInfo(`Found ${allGroups.length} group(s).`);
      setScanGroups(allGroups);
      setShowScanResults(true);
    }
  };

  const handleMergeGroup = (group: DuplicateGroup) => {
    // Keep the first item, remove the rest
    const idsToRemove = new Set(group.items.slice(1).map(i => i.id));
    setData(prev => {
      if (!prev) return prev;
      switch (group.type) {
        case 'fact':
          return { ...prev, facts: prev.facts.filter(f => !idsToRemove.has(f.fact_id)) };
        case 'insight':
          return { ...prev, insights: prev.insights.filter(i => !idsToRemove.has(i.insight_id)) };
        case 'recommendation':
          return { ...prev, recommendations: prev.recommendations.filter(r => !idsToRemove.has(r.recommendation_id)) };
        default:
          return prev;
      }
    });
    // Remove group from list
    setScanGroups(prev => prev.filter(g => g !== group));
  };

  const handleKeepGroup = (group: DuplicateGroup) => {
    setScanGroups(prev => prev.filter(g => g !== group));
  };

  // Close panel when all groups are resolved
  const handleCloseScanResults = () => {
    setShowScanResults(false);
    setScanGroups([]);
  };

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
      <div
        title={backendAvailable ? "Scan Duplicates" : "Backend unavailable"}
        onClick={backendAvailable && !scanning ? handleScanDuplicates : undefined}
        className={backendAvailable && !scanning ? '' : 'toolbar-disabled'}
      >
        <FontAwesomeIcon icon={scanning ? faSpinner : faMagnifyingGlass} spin={scanning} size='lg' />
      </div>
      <div title={theme === 'light' ? 'Dark mode' : 'Light mode'} onClick={toggleTheme}>
        <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} size='lg' />
      </div>

      {showScanResults && (
        <DedupScanResultsPanel
          groups={scanGroups}
          onMergeGroup={handleMergeGroup}
          onKeepGroup={handleKeepGroup}
          onClose={handleCloseScanResults}
        />
      )}
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
