import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './App.css';
import InputList from './components/InputList';
import FactList from './components/FactList';
import InsightList from './components/InsightList';
import RecommendationList from './components/RecommendationList';
import OutputList from './components/OutputList';

import { handleMouseEnter, handleMouseLeave } from './lib';
import ToolBar from './components/Toolbar';
import Toast from './components/Toast';
import DiscoveryModal from './components/DiscoveryModal';
import TraceabilityModal from './components/TraceabilityModal';
import GuidedTour from './components/GuidedTour';
import Modal from './components/Modal';
import ChatWidget, { ChatToolAction } from './components/ChatWidget';
import { API_URL } from './config';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

const STORAGE_KEY = 'factly_last_discovery';

const EXAMPLE_DISCOVERY: DiscoveryData = {
  title: 'Customer Churn Analysis Q4',
  goal: 'Understand why customer churn increased by 15% in Q4 and identify actionable retention strategies',
  date: new Date().toISOString().split('T')[0],
  inputs: [
    {
      input_id: 'ex-input-1',
      type: 'text',
      title: 'Q4 Customer Survey Results',
      text: 'Survey of 500 customers who cancelled in Q4: 42% cited poor support response times (avg 48h vs 24h SLA), 31% found cheaper alternatives, 18% said the product lacked features they needed, 9% had billing issues. Customer satisfaction score fell to 3.1 out of 5. The v3.0 release was identified as a key frustration point, with 35% of respondents mentioning data migration problems.',
    },
    {
      input_id: 'ex-input-2',
      type: 'text',
      title: 'Support Ticket Analysis',
      text: 'Support ticket volume increased 60% in Q4 due to v3.0 migration issues. Average first-response time rose from 12h to 52h. CSAT dropped from 4.2 to 3.1. Top complaint categories: data migration errors (35%), UI confusion (28%), missing features from v2 (22%). Nearly a third of churned users reported switching to lower-cost competitors. About 4 in 10 support escalations were linked to slow response times exceeding the 24-hour SLA.',
    },
  ],
  facts: [],
  insights: [],
  recommendations: [],
  outputs: [],
};

const App: React.FC = () => {
  const { id: routeDocumentId } = useParams<{ id: string }>();
  const documentIdFromRoute = useMemo(() => routeDocumentId?.trim() || null, [routeDocumentId]);
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [data, setData] = useState<DiscoveryData | null>(() => {
    // Only restore from localStorage when NOT on a document route
    if (routeDocumentId) return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });
  const [isBootstrappingDocument, setIsBootstrappingDocument] = useState<boolean>(() => Boolean(documentIdFromRoute));
  const [showNewDiscoveryModal, setShowNewDiscoveryModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'error' | 'info' | 'waiting'>('error');
  const handleError = useCallback((msg: string) => { setToastType('error'); setErrorMessage(msg); }, []);
  const handleInfo = useCallback((msg: string) => { setToastType('info'); setErrorMessage(msg); }, []);
  const handleWaiting = useCallback((msg: string) => { setToastType('waiting'); setErrorMessage(msg); }, []);
  const clearError = useCallback(() => setErrorMessage(null), []);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [searchAvailable, setSearchAvailable] = useState(false);
  const [traceabilityTarget, setTraceabilityTarget] = useState<{ type: string; id: string } | null>(null);
  const openTraceability = useCallback((type: string, id: string) => setTraceabilityTarget({ type, id }), []);
  const [tourActive, setTourActive] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [chatActions, setChatActions] = useState<ChatToolAction[]>([]);
  const handleChatToolAction = useCallback((action: ChatToolAction) => setChatActions(prev => [...prev, action]), []);
  const clearChatActions = useCallback((filter: (a: ChatToolAction) => boolean) => {
    setChatActions(prev => prev.filter(a => !filter(a)));
  }, []);
  const requestConfirm = useCallback((message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm: () => { setConfirmDialog(null); onConfirm(); } });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      fetch(`${API_URL}/status`)
        .then(async (res) => {
          if (cancelled) return;
          setBackendAvailable(res.ok);
          if (res.ok) {
            try {
              const body = await res.json();
              setSearchAvailable(body.searchAvailable === true);
            } catch { setSearchAvailable(false); }
          } else {
            setSearchAvailable(false);
          }
        })
        .catch(() => { if (!cancelled) { setBackendAvailable(false); setSearchAvailable(false); } });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Redirect authenticated users to their last document when on /
  useEffect(() => {
    if (documentIdFromRoute || !isAuthenticated || !token) return;
    let cancelled = false;
    fetch(`${API_URL}/me/discoveries`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then(body => {
        if (cancelled || !body?.discoveries?.length) return;
        const last = body.discoveries[0];
        navigate(`/documents/${last.document_id}`, { replace: true });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentIdFromRoute, isAuthenticated]);

  useEffect(() => {
    if (data || !documentIdFromRoute) {
      setIsBootstrappingDocument(false);
      return;
    }

    setIsBootstrappingDocument(true);

    let cancelled = false;

    const bootstrapDocument = async () => {
      try {
        const response = await fetch(`${API_URL}/documents/${documentIdFromRoute}`);
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorBody.error || 'Failed to fetch document');
        }

        const docData = await response.json();
        if (!docData || Object.keys(docData).length === 0) {
          throw new Error('Document not found');
        }

        if (!cancelled) {
          setData(docData);
        }
      } catch (error: any) {
        if (!cancelled) {
          handleError(error?.message || 'Failed to open document');
          setIsBootstrappingDocument(false);
        }
      }
    };

    bootstrapDocument();

    return () => {
      cancelled = true;
    };
  }, [data, handleError]);
  const inputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const factRefs = useRef<(HTMLDivElement | null)[]>([]);
  const insightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const recommendationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const outputRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);


  const handleNewDiscoveryFromWelcome = () => {
    setShowNewDiscoveryModal(true);
  };

  const handleTryExample = () => {
    setData({ ...EXAMPLE_DISCOVERY });
    setTourActive(true);
  };

  if (!data && isBootstrappingDocument) return (
    <div className="App">
      <Toast message={errorMessage} type={toastType} onClose={clearError} />
      <div className="welcome-screen">
        <h1>Factly</h1>
        <p className="welcome-subtitle">Loading document...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="App">
      <Toast message={errorMessage} type={toastType} onClose={clearError} />
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
      <Toast message={errorMessage} type={toastType} onClose={clearError} />
      {tourActive && data && (
        <GuidedTour
          data={data}
          onClose={() => setTourActive(false)}
        />
      )}
      <header className='discovery-header'>
        <div className='discovery-details'>
          <h1>🔍{data.title}</h1>
          <h5>🎯{data.goal}</h5>
        </div>
        <ToolBar
          data={data}
          setData={setData}
          documentId={documentIdFromRoute}
          onError={handleError}
          onInfo={handleInfo}
          onWaiting={handleWaiting}
          backendAvailable={backendAvailable}
          onStartTour={() => {
            setConfirmDialog({
              message: 'This will load the example discovery and start the guided tour. Continue?',
              onConfirm: () => {
                setConfirmDialog(null);
                setData({ ...EXAMPLE_DISCOVERY });
                setTourActive(true);
              },
            });
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
            onInfo={handleInfo}
            onWaiting={handleWaiting}
            backendAvailable={backendAvailable}
            searchAvailable={searchAvailable}
            onViewTraceability={openTraceability}
            chatActions={chatActions}
            clearChatActions={clearChatActions}
            requestConfirm={requestConfirm} />
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
              onInfo={handleInfo}
              onWaiting={handleWaiting}
              backendAvailable={backendAvailable}
              onViewTraceability={openTraceability}
              chatActions={chatActions}
              clearChatActions={clearChatActions}
              requestConfirm={requestConfirm} />
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
              onInfo={handleInfo}
              onWaiting={handleWaiting}
              backendAvailable={backendAvailable}
              onViewTraceability={openTraceability}
              chatActions={chatActions}
              clearChatActions={clearChatActions}
              requestConfirm={requestConfirm} />
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
              onInfo={handleInfo}
              onWaiting={handleWaiting}
              backendAvailable={backendAvailable}
              onViewTraceability={openTraceability}
              chatActions={chatActions}
              clearChatActions={clearChatActions}
              requestConfirm={requestConfirm} />
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
              onError={handleError}
              onInfo={handleInfo}
              onWaiting={handleWaiting}
              backendAvailable={backendAvailable}
              onViewTraceability={openTraceability}
              chatActions={chatActions}
              clearChatActions={clearChatActions}
              requestConfirm={requestConfirm} />
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
      <Modal isVisible={!!confirmDialog} onClose={() => setConfirmDialog(null)} maxWidth="400px">
        <p style={{ margin: '0 0 1em' }}>{confirmDialog?.message}</p>
        <div className="modal-actions">
          <div className="modal-action-group-left">
            <button className="modal-action-save" onClick={confirmDialog?.onConfirm}>Confirm</button>
          </div>
          <div className="modal-action-group-right">
            <button className="modal-action-close" onClick={() => setConfirmDialog(null)}>Cancel</button>
          </div>
        </div>
      </Modal>
      <ChatWidget data={data} setData={setData} backendAvailable={backendAvailable} onToolAction={handleChatToolAction} requestConfirm={requestConfirm} />
    </div >
  );
};

export default App;
