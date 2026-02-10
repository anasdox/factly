import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import InputList from './components/InputList';
import FactList from './components/FactList';
import InsightList from './components/InsightList';
import RecommendationList from './components/RecommendationList';
import OutputList from './components/OutputList';
import { useCalculateAndDrawLines } from './components/Lines';
import { handleMouseEnter, handleMouseLeave } from './lib';
import ToolBar from './components/Toolbar';
import Toast from './components/Toast';
import DiscoveryModal from './components/DiscoveryModal';

const STORAGE_KEY = 'factly_last_discovery';

function getRoomIdFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}

const App: React.FC = () => {
  const [data, setData] = useState<DiscoveryData | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });
  const [loadingRoom, setLoadingRoom] = useState(!!getRoomIdFromURL());
  const [showNewDiscoveryModal, setShowNewDiscoveryModal] = useState(!data && !getRoomIdFromURL());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleError = useCallback((msg: string) => setErrorMessage(msg), []);
  const clearError = useCallback(() => setErrorMessage(null), []);
  const inputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const factRefs = useRef<(HTMLDivElement | null)[]>([]);
  const insightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const recommendationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const outputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const calculateAndDrawLines = useCalculateAndDrawLines();

  useEffect(() => {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  useEffect(() => {
    const roomId = getRoomIdFromURL();
    if (!roomId) return;

    const fetchRoomData = async () => {
      try {
        const response = await fetch(`http://localhost:3002/rooms/${roomId}`);
        if (!response.ok) {
          setLoadingRoom(false);
          return;
        }
        const roomData = await response.json();
        if (roomData && Object.keys(roomData).length !== 0) {
          setData(roomData);
        }
      } catch {
        // Toolbar will retry once it mounts
      } finally {
        setLoadingRoom(false);
      }
    };

    fetchRoomData();
  }, []);

  useEffect(() => {
    if (data) {
      const allRefs = [
        ...inputRefs.current,
        ...factRefs.current,
        ...insightRefs.current,
        ...recommendationRefs.current,
        ...outputRefs.current
      ];

      if (allRefs.every(ref => ref !== null)) {
        calculateAndDrawLines(
          data,
          inputRefs.current,
          factRefs.current,
          insightRefs.current,
          recommendationRefs.current,
          outputRefs.current
        );
        const handleResize = () => {
          calculateAndDrawLines(
            data,
            inputRefs.current,
            factRefs.current,
            insightRefs.current,
            recommendationRefs.current,
            outputRefs.current
          );
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize);

        // Recalculate lines when column contents change size (e.g. toolbar/suggestions panel)
        const grid = document.querySelector('.discovery-grid');
        let resizeObserver: ResizeObserver | null = null;
        if (grid) {
          resizeObserver = new ResizeObserver(handleResize);
          grid.querySelectorAll('.column').forEach(col => resizeObserver!.observe(col));
          grid.querySelectorAll('.toolbar-wrapper').forEach(el => resizeObserver!.observe(el));
        }

        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('scroll', handleResize);
          resizeObserver?.disconnect();
          const existingLines = document.querySelectorAll('.line');
          existingLines.forEach(line => line.remove());
        }
      }
    }
  }, [data, calculateAndDrawLines]);

  const handleNewDiscoveryFromWelcome = () => {
    const emptyDiscovery: DiscoveryData = {
      discovery_id: '',
      title: '',
      goal: '',
      date: '',
      inputs: [],
      facts: [],
      insights: [],
      recommendations: [],
      outputs: [],
    };
    setData(emptyDiscovery);
    setShowNewDiscoveryModal(true);
  };

  if (loadingRoom) return (
    <div className="App">
      <div className="welcome-screen">
        <h1>Factly</h1>
        <p>Joining room...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="App">
      <div className="welcome-screen">
        <h1>Factly</h1>
        <p>Start a new discovery to begin extracting facts.</p>
        <button className="welcome-new-discovery" onClick={handleNewDiscoveryFromWelcome}>New Discovery</button>
      </div>
      <DiscoveryModal
        mode="add"
        isDialogVisible={showNewDiscoveryModal}
        discoveryData={null}
        setDiscoveryData={setData}
        closeDialog={() => setShowNewDiscoveryModal(false)}
      />
    </div>
  );

  return (
    <div className="App">
      <Toast message={errorMessage} onClose={clearError} />
      <header className='discovery-header'>
        <div className='discovery-details'>
          <div><h1>🔍{data.title}</h1></div>
          <div><h5>🎯{data.goal}</h5></div>
        </div>
        <ToolBar
          data={data}
          setData={setData}
          onError={handleError}
        />
      </header>
      <main className="discovery-grid">
        {inputRefs ?
          <InputList
            inputRefs={inputRefs}
            handleMouseEnter={handleMouseEnter}
            handleMouseLeave={handleMouseLeave}
            setData={setData}
            data={data}
            onError={handleError} />
          : ""}
        {
          factRefs ?
            <FactList
              factRefs={factRefs}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              setData={setData}
              data={data}
              onError={handleError} />
            : ""}
        {
          insightRefs ?
            <InsightList
              insightRefs={insightRefs}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              setData={setData}
              data={data}
              onError={handleError} />
            : ""
        }
        {
          recommendationRefs ?
            <RecommendationList
              recommendationRefs={recommendationRefs}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              setData={setData}
              data={data}
              onError={handleError} />
            : ""
        }
        {
          outputRefs ?
            <OutputList
              outputRefs={outputRefs}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              setData={setData}
              data={data} />
            : ""
        }
      </main >
    </div >
  );
};

export default App;

