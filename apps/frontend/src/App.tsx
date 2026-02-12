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
import TraceabilityModal from './components/TraceabilityModal';
import GuidedTour from './components/GuidedTour';
import { API_URL } from './config';

const STORAGE_KEY = 'factly_last_discovery';

const EXAMPLE_DISCOVERY: DiscoveryData = {
  discovery_id: 'example-001',
  title: 'Customer Churn Analysis Q4',
  goal: 'Understand why customer churn increased by 15% in Q4 and identify actionable retention strategies',
  date: new Date().toISOString().split('T')[0],
  inputs: [
    {
      input_id: 'ex-input-1',
      type: 'text',
      title: 'Q4 Customer Survey Results',
      text: 'Survey of 500 customers who cancelled in Q4: 42% cited poor support response times (avg 48h vs 24h SLA), 31% found cheaper alternatives, 18% said the product lacked features they needed, 9% had billing issues.',
    },
    {
      input_id: 'ex-input-2',
      type: 'text',
      title: 'Support Ticket Analysis',
      text: 'Support ticket volume increased 60% in Q4 due to v3.0 migration issues. Average first-response time rose from 12h to 52h. CSAT dropped from 4.2 to 3.1. Top complaint categories: data migration errors (35%), UI confusion (28%), missing features from v2 (22%).',
    },
  ],
  facts: [],
  insights: [],
  recommendations: [],
  outputs: [],
};

const EXAMPLE_DISCOVERY_FULL: DiscoveryData = {
  ...EXAMPLE_DISCOVERY,
  facts: [
    {
      fact_id: 'ex-fact-1',
      text: '42% of churned customers cited poor support response times as their primary reason for leaving.',
      related_inputs: ['ex-input-1'],
      source_excerpt: '42% cited poor support response times (avg 48h vs 24h SLA)',
    },
    {
      fact_id: 'ex-fact-2',
      text: 'Support ticket volume increased 60% in Q4, causing average first-response time to rise from 12h to 52h.',
      related_inputs: ['ex-input-2'],
      source_excerpt: 'Support ticket volume increased 60% in Q4 due to v3.0 migration issues. Average first-response time rose from 12h to 52h.',
    },
    {
      fact_id: 'ex-fact-3',
      text: '31% of churned customers found cheaper alternatives in the market.',
      related_inputs: ['ex-input-1'],
      source_excerpt: '31% found cheaper alternatives',
    },
  ],
  insights: [
    {
      insight_id: 'ex-insight-1',
      text: 'The v3.0 migration created a support bottleneck that directly drove the largest segment of churn. Support capacity did not scale with the migration-induced ticket surge.',
      related_facts: ['ex-fact-1', 'ex-fact-2'],
    },
    {
      insight_id: 'ex-insight-2',
      text: 'Price sensitivity is the second driver of churn, suggesting the current pricing does not clearly communicate value differentiation vs. competitors.',
      related_facts: ['ex-fact-3'],
    },
  ],
  recommendations: [
    {
      recommendation_id: 'ex-rec-1',
      text: 'Implement a dedicated migration support team with a 12h SLA for v3.0-related tickets, and proactively reach out to customers who experienced migration issues.',
      related_insights: ['ex-insight-1'],
    },
    {
      recommendation_id: 'ex-rec-2',
      text: 'Introduce a competitive retention offer for at-risk customers and revise pricing page to highlight unique value propositions vs. top 3 competitors.',
      related_insights: ['ex-insight-2'],
    },
  ],
  outputs: [],
};

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
  const [showNewDiscoveryModal, setShowNewDiscoveryModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleError = useCallback((msg: string) => setErrorMessage(msg), []);
  const clearError = useCallback(() => setErrorMessage(null), []);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [traceabilityTarget, setTraceabilityTarget] = useState<{ type: string; id: string } | null>(null);
  const openTraceability = useCallback((type: string, id: string) => setTraceabilityTarget({ type, id }), []);
  const [tourActive, setTourActive] = useState(false);
  const [tourMode, setTourMode] = useState<'interactive' | 'passive'>('interactive');

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      fetch(`${API_URL}/status`)
        .then((res) => { if (!cancelled) setBackendAvailable(res.ok); })
        .catch(() => { if (!cancelled) setBackendAvailable(false); });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
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
        const response = await fetch(`${API_URL}/rooms/${roomId}`);
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
    setShowNewDiscoveryModal(true);
  };

  const handleTryExample = () => {
    const freshId = 'example-' + Date.now();
    if (backendAvailable) {
      setData({ ...EXAMPLE_DISCOVERY, discovery_id: freshId });
      setTourMode('interactive');
    } else {
      setData({ ...EXAMPLE_DISCOVERY_FULL, discovery_id: freshId });
      setTourMode('passive');
    }
    setTourActive(true);
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
        <p className="welcome-subtitle">From raw information to evidence-based decisions.</p>
        <div className="welcome-flow">
          <div className="welcome-flow-step">
            <span className="welcome-flow-icon">📥</span>
            <strong>Inputs</strong>
            <span className="welcome-flow-desc">Collect texts and URLs</span>
          </div>
          <span className="welcome-flow-arrow">&rarr;</span>
          <div className="welcome-flow-step">
            <span className="welcome-flow-icon">📊</span>
            <strong>Facts</strong>
            <span className="welcome-flow-desc">Extract verified facts</span>
          </div>
          <span className="welcome-flow-arrow">&rarr;</span>
          <div className="welcome-flow-step">
            <span className="welcome-flow-icon">💡</span>
            <strong>Insights</strong>
            <span className="welcome-flow-desc">Derive patterns and meaning</span>
          </div>
          <span className="welcome-flow-arrow">&rarr;</span>
          <div className="welcome-flow-step">
            <span className="welcome-flow-icon">👍</span>
            <strong>Recommendations</strong>
            <span className="welcome-flow-desc">Formulate action items</span>
          </div>
          <span className="welcome-flow-arrow">&rarr;</span>
          <div className="welcome-flow-step">
            <span className="welcome-flow-icon">📤</span>
            <strong>Outputs</strong>
            <span className="welcome-flow-desc">Create deliverables</span>
          </div>
        </div>
        <p className="welcome-usecases">Start a discovery to explore a new domain, analyze a complex problem, audit an existing situation, or prepare a decision.</p>
        <div className="welcome-actions">
          <button className="welcome-new-discovery" onClick={handleNewDiscoveryFromWelcome}>New Discovery</button>
          <button className="welcome-example-btn" onClick={handleTryExample}>Try with an Example</button>
        </div>
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
    <div className={`App${tourActive ? ' tour-active' : ''}`}>
      <Toast message={errorMessage} onClose={clearError} />
      {tourActive && data && (
        <GuidedTour
          mode={tourMode}
          data={data}
          onClose={() => setTourActive(false)}
        />
      )}
      <header className='discovery-header'>
        <div className='discovery-details'>
          <div><h1>🔍{data.title}</h1></div>
          <div><h5>🎯{data.goal}</h5></div>
        </div>
        <ToolBar
          data={data}
          setData={setData}
          onError={handleError}
          backendAvailable={backendAvailable}
          onStartTour={() => {
            if (!window.confirm('This will load the example discovery and start the guided tour. Continue?')) return;
            const freshId = 'example-' + Date.now();
            if (backendAvailable) {
              setData({ ...EXAMPLE_DISCOVERY, discovery_id: freshId });
              setTourMode('interactive');
            } else {
              setData({ ...EXAMPLE_DISCOVERY_FULL, discovery_id: freshId });
              setTourMode('passive');
            }
            setTourActive(true);
          }}
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
            onError={handleError}
            backendAvailable={backendAvailable}
            onViewTraceability={openTraceability} />
          : ""}
        {
          factRefs ?
            <FactList
              factRefs={factRefs}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              setData={setData}
              data={data}
              onError={handleError}
              backendAvailable={backendAvailable}
              onViewTraceability={openTraceability} />
            : ""}
        {
          insightRefs ?
            <InsightList
              insightRefs={insightRefs}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              setData={setData}
              data={data}
              onError={handleError}
              backendAvailable={backendAvailable}
              onViewTraceability={openTraceability} />
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
              onError={handleError}
              backendAvailable={backendAvailable}
              onViewTraceability={openTraceability} />
            : ""
        }
        {
          outputRefs ?
            <OutputList
              outputRefs={outputRefs}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              setData={setData}
              data={data}
              onViewTraceability={openTraceability} />
            : ""
        }
      </main >
      {traceabilityTarget && (
        <TraceabilityModal
          isVisible={true}
          onClose={() => setTraceabilityTarget(null)}
          entityType={traceabilityTarget.type}
          entityId={traceabilityTarget.id}
          data={data}
        />
      )}
    </div >
  );
};

export default App;
