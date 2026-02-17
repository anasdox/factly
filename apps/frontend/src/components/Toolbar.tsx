import { useEffect, useRef, useState } from "react";
import { faEdit, faFileDownload, faPlus, faUpload, faPlayCircle, faMoon, faSun, faRoute, faRocket, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Toolbar.css";

import DiscoveryModal from "./DiscoveryModal";
import StartEventRoomModal from './StartEventRoomModal';
import FullAutoConfigModal from './FullAutoConfigModal';
import FullAutoSummaryModal, { FullAutoStats } from './FullAutoSummaryModal';
import Modal from './Modal';

import { StringParam, useQueryParam } from "use-query-params";
import { useLocalStorage } from 'usehooks-ts'
import { isObjectEmpty } from "../lib";
import { API_URL } from "../config";
import { findDuplicatesLocal } from "../dedup";


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

  // Full Auto Pipeline state
  const [isFullAutoConfigVisible, setIsFullAutoConfigVisible] = useState(false);
  const [isFullAutoSummaryVisible, setIsFullAutoSummaryVisible] = useState(false);
  const [isRunningFullAuto, setIsRunningFullAuto] = useState(false);
  const [fullAutoStats, setFullAutoStats] = useState<FullAutoStats>({ facts: 0, insights: 0, recommendations: 0, outputs: 0 });
  const [fullAutoError, setFullAutoError] = useState<string | undefined>();
  const fullAutoSnapshotRef = useRef<DiscoveryData | null>(null);

  const handleRunFullAuto = async (config: { outputType: OutputType['type'] }) => {
    setIsFullAutoConfigVisible(false);
    setIsRunningFullAuto(true);
    setFullAutoError(undefined);
    const stats: FullAutoStats = { facts: 0, insights: 0, recommendations: 0, outputs: 0 };

    // Snapshot for undo
    fullAutoSnapshotRef.current = JSON.parse(JSON.stringify(data));

    try {
      // Step 1: Extract facts from all inputs in parallel
      onWaiting('Full Auto: Extracting facts...');
      const factPromises = data.inputs.map(input => {
        const payload: Record<string, string> = {
          goal: data.goal,
          input_id: input.input_id,
        };
        if (input.type === 'web') {
          payload.input_url = input.url || '';
        } else {
          payload.input_text = input.text || '';
        }
        return fetch(`${API_URL}/extract/facts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({ error: 'Extraction failed' }));
            throw new Error(body.error || 'Extraction failed');
          }
          const result = await response.json();
          return { inputId: input.input_id, suggestions: result.suggestions as { text: string; source_excerpt?: string }[] };
        });
      });

      const factResults = await Promise.allSettled(factPromises);
      const newFacts: FactType[] = [];
      for (const result of factResults) {
        if (result.status === 'fulfilled') {
          for (const s of result.value.suggestions) {
            newFacts.push({
              fact_id: Math.random().toString(16).slice(2),
              text: s.text,
              related_inputs: [result.value.inputId],
              source_excerpt: s.source_excerpt,
              created_at: new Date().toISOString(),
            });
          }
        }
      }
      // Silent dedup: filter out facts similar to existing ones
      const existingFactItems = data.facts.map(f => ({ id: f.fact_id, text: f.text }));
      const dedupedFacts = newFacts.filter(f => findDuplicatesLocal(f.text, existingFactItems).length === 0);
      stats.skippedFacts = newFacts.length - dedupedFacts.length;
      // Also dedup within the batch itself
      const uniqueFacts: FactType[] = [];
      for (const f of dedupedFacts) {
        if (findDuplicatesLocal(f.text, uniqueFacts.map(u => ({ id: u.fact_id, text: u.text }))).length === 0) {
          uniqueFacts.push(f);
        } else {
          stats.skippedFacts++;
        }
      }
      const finalFacts = uniqueFacts;
      stats.facts = finalFacts.length;
      if (finalFacts.length === 0) throw new Error('No facts could be extracted from any input.');
      setData(prev => prev ? { ...prev, facts: [...prev.facts, ...finalFacts] } : prev);

      // Step 2: Extract insights from new facts
      onWaiting('Full Auto: Generating insights...');
      const insightsResponse = await fetch(`${API_URL}/extract/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facts: finalFacts.map(f => ({ fact_id: f.fact_id, text: f.text })),
          goal: data.goal,
        }),
      });
      if (!insightsResponse.ok) {
        const body = await insightsResponse.json().catch(() => ({ error: 'Insights extraction failed' }));
        throw new Error(body.error || 'Insights extraction failed');
      }
      const insightsResult = await insightsResponse.json();
      const newInsights: InsightType[] = [];
      for (const s of insightsResult.suggestions as { text: string; related_fact_ids?: string[] }[]) {
        const relatedFacts = s.related_fact_ids && s.related_fact_ids.length > 0
          ? s.related_fact_ids
          : finalFacts.map(f => f.fact_id);
        newInsights.push({
          insight_id: Math.random().toString(16).slice(2),
          text: s.text,
          related_facts: relatedFacts,
          created_at: new Date().toISOString(),
        });
      }
      // Silent dedup insights
      const existingInsightItems = data.insights.map(i => ({ id: i.insight_id, text: i.text }));
      const uniqueInsights: InsightType[] = [];
      stats.skippedInsights = 0;
      for (const i of newInsights) {
        const allExisting = [...existingInsightItems, ...uniqueInsights.map(u => ({ id: u.insight_id, text: u.text }))];
        if (findDuplicatesLocal(i.text, allExisting).length === 0) {
          uniqueInsights.push(i);
        } else {
          stats.skippedInsights++;
        }
      }
      const finalInsights = uniqueInsights;
      stats.insights = finalInsights.length;
      if (finalInsights.length === 0) throw new Error('No insights could be derived from the extracted facts.');
      setData(prev => prev ? { ...prev, insights: [...prev.insights, ...finalInsights] } : prev);

      // Step 3: Extract recommendations from new insights
      onWaiting('Full Auto: Generating recommendations...');
      const recsResponse = await fetch(`${API_URL}/extract/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insights: finalInsights.map(i => ({ insight_id: i.insight_id, text: i.text })),
          goal: data.goal,
        }),
      });
      if (!recsResponse.ok) {
        const body = await recsResponse.json().catch(() => ({ error: 'Recommendations extraction failed' }));
        throw new Error(body.error || 'Recommendations extraction failed');
      }
      const recsResult = await recsResponse.json();
      const newRecommendations: RecommendationType[] = [];
      for (const s of recsResult.suggestions as { text: string; related_insight_ids?: string[] }[]) {
        const relatedInsights = s.related_insight_ids && s.related_insight_ids.length > 0
          ? s.related_insight_ids
          : finalInsights.map(i => i.insight_id);
        newRecommendations.push({
          recommendation_id: Math.random().toString(16).slice(2),
          text: s.text,
          related_insights: relatedInsights,
          created_at: new Date().toISOString(),
        });
      }
      // Silent dedup recommendations
      const existingRecItems = data.recommendations.map(r => ({ id: r.recommendation_id, text: r.text }));
      const uniqueRecs: RecommendationType[] = [];
      stats.skippedRecommendations = 0;
      for (const r of newRecommendations) {
        const allExisting = [...existingRecItems, ...uniqueRecs.map(u => ({ id: u.recommendation_id, text: u.text }))];
        if (findDuplicatesLocal(r.text, allExisting).length === 0) {
          uniqueRecs.push(r);
        } else {
          stats.skippedRecommendations++;
        }
      }
      const finalRecommendations = uniqueRecs;
      stats.recommendations = finalRecommendations.length;
      if (finalRecommendations.length === 0) throw new Error('No recommendations could be generated from the insights.');
      setData(prev => prev ? { ...prev, recommendations: [...prev.recommendations, ...finalRecommendations] } : prev);

      // Step 4: Formulate output with full traceability context
      onWaiting('Full Auto: Formulating output...');
      const relatedInsightIds = new Set<string>();
      finalRecommendations.forEach(r => r.related_insights.forEach(id => relatedInsightIds.add(id)));
      const relatedInsights = finalInsights.filter(i => relatedInsightIds.has(i.insight_id));

      const relatedFactIds = new Set<string>();
      relatedInsights.forEach(i => i.related_facts.forEach(id => relatedFactIds.add(id)));
      const relatedFacts = finalFacts.filter(f => relatedFactIds.has(f.fact_id));

      const relatedInputIds = new Set<string>();
      relatedFacts.forEach(f => f.related_inputs.forEach(id => relatedInputIds.add(id)));
      const relatedInputs = data.inputs.filter(inp => relatedInputIds.has(inp.input_id));

      const outputResponse = await fetch(`${API_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendations: finalRecommendations.map(r => ({ recommendation_id: r.recommendation_id, text: r.text })),
          goal: data.goal,
          output_type: config.outputType,
          facts: relatedFacts.map(f => ({ text: f.text, source_excerpt: f.source_excerpt })),
          insights: relatedInsights.map(i => ({ text: i.text })),
          inputs: relatedInputs.map(inp => ({ title: inp.title, text: inp.text })),
        }),
      });
      if (!outputResponse.ok) {
        const body = await outputResponse.json().catch(() => ({ error: 'Output formulation failed' }));
        throw new Error(body.error || 'Output formulation failed');
      }
      const outputResult = await outputResponse.json();
      const newOutputs: OutputType[] = [];
      for (const s of outputResult.suggestions as { text: string }[]) {
        newOutputs.push({
          output_id: Math.random().toString(16).slice(2),
          text: s.text,
          related_recommendations: finalRecommendations.map(r => r.recommendation_id),
          type: config.outputType,
          created_at: new Date().toISOString(),
        });
      }
      stats.outputs = newOutputs.length;
      setData(prev => prev ? { ...prev, outputs: [...prev.outputs, ...newOutputs] } : prev);

      onInfo('Full Auto pipeline complete.');
    } catch (err: any) {
      setFullAutoError(err.message || 'Pipeline failed');
      onError(err.message || 'Full Auto pipeline failed');
    } finally {
      setFullAutoStats(stats);
      setIsRunningFullAuto(false);
      setIsFullAutoSummaryVisible(true);
    }
  };

  const handleFullAutoUndo = () => {
    if (fullAutoSnapshotRef.current) {
      setData(fullAutoSnapshotRef.current);
      fullAutoSnapshotRef.current = null;
      onInfo('Full Auto results undone.');
    }
    setIsFullAutoSummaryVisible(false);
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

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const handleStartEventRoom = async () => {
    try {
      if (data && data.discovery_id) {
        setIsCreatingRoom(true);
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
    } finally {
      setIsCreatingRoom(false);
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
        title={!backendAvailable ? "Backend unavailable" : isRunningFullAuto ? "Pipeline running..." : data.inputs.length === 0 ? "Add inputs first" : "Full Auto Pipeline"}
        onClick={backendAvailable && !isRunningFullAuto && data.inputs.length > 0 ? () => setIsFullAutoConfigVisible(true) : undefined}
        className={!backendAvailable || isRunningFullAuto || data.inputs.length === 0 ? 'toolbar-disabled' : ''}
      >
        <FontAwesomeIcon icon={isRunningFullAuto ? faSpinner : faRocket} size='lg' spin={isRunningFullAuto} />
      </div>
      <div
        title={isCreatingRoom ? "Creating room..." : backendAvailable ? "Start Event Room" : "Backend unavailable"}
        onClick={backendAvailable && !isCreatingRoom ? handleStartEventRoom : undefined}
        className={!backendAvailable || isCreatingRoom ? 'toolbar-disabled' : ''}
      >
        <FontAwesomeIcon icon={isCreatingRoom ? faSpinner : faPlayCircle} size='lg' spin={isCreatingRoom} />
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
      <FullAutoConfigModal
        isVisible={isFullAutoConfigVisible}
        onClose={() => setIsFullAutoConfigVisible(false)}
        onConfirm={handleRunFullAuto}
        inputCount={data.inputs.length}
      />
      <FullAutoSummaryModal
        isVisible={isFullAutoSummaryVisible}
        onClose={() => setIsFullAutoSummaryVisible(false)}
        onUndo={handleFullAutoUndo}
        stats={fullAutoStats}
        error={fullAutoError}
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
