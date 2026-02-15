import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Benchmark.css';
import { API_URL } from '../../config';
import RunSelector from './RunSelector';
import ScoreRadarChart from './ScoreRadarChart';
import MetricComparisonTable from './MetricComparisonTable';
import BestConfigHighlight from './BestConfigHighlight';
import DimensionDetail from './DimensionDetail';
import HistoryChart from './HistoryChart';
import NewBenchmarkPanel from './NewBenchmarkPanel';
import BenchmarkProgress from './BenchmarkProgress';
import SuggestionsPanel from './SuggestionsPanel';
import ConfigDetail from './ConfigDetail';

const BenchmarkDashboard: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedResults, setSelectedResults] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [detailView, setDetailView] = useState<{ suite: string; resultIndex: number } | null>(null);
  const [showNewBenchmark, setShowNewBenchmark] = useState(false);
  const [newBenchmarkConfig, setNewBenchmarkConfig] = useState<any>(null);
  const [historyPoints, setHistoryPoints] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'compare' | 'history' | 'suggestions'>('compare');
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [selectorRefreshKey, setSelectorRefreshKey] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load full results when selection changes
  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectedResults([]);
      setComparison(null);
      return;
    }

    Promise.all(
      selectedIds.map((id) =>
        fetch(`${API_URL}/benchmark/results/${id}`)
          .then((res) => res.json())
          .catch(() => null)
      )
    ).then((results) => {
      setSelectedResults(results.filter(Boolean));
    });

    if (selectedIds.length >= 2) {
      fetch(`${API_URL}/benchmark/compare?ids=${selectedIds.join(',')}`)
        .then((res) => res.json())
        .then((data) => setComparison(data))
        .catch(() => setComparison(null));
    } else {
      setComparison(null);
    }
  }, [selectedIds]);

  // Load history
  const loadHistory = useCallback(() => {
    fetch(`${API_URL}/benchmark/results`)
      .then((res) => res.json())
      .then((data) => {
        const points = (data.results || [])
          .filter((r: any) => r.status !== 'error')
          .map((r: any) => ({
            timestamp: r.timestamp,
            configName: r.configName,
            score: r.overallScore,
          }))
          .reverse();
        setHistoryPoints(points);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Poll job status when a job is running
  useEffect(() => {
    if (!runningJobId) return;

    const poll = () => {
      fetch(`${API_URL}/benchmark/run/${runningJobId}/status`)
        .then((res) => res.json())
        .then((status) => {
          setJobStatus(status);
          if (status.state === 'completed' || status.state === 'failed') {
            setRunningJobId(null);
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            // Refresh history and run selector when job completes
            if (status.state === 'completed') {
              loadHistory();
              setSelectorRefreshKey((k) => k + 1);
            }
          }
        })
        .catch(() => {});
    };

    poll(); // Immediate first poll
    pollRef.current = setInterval(poll, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [runningJobId, loadHistory]);

  const handleApplySuggestion = useCallback((suggestedConfig: any) => {
    setNewBenchmarkConfig(suggestedConfig);
    setShowNewBenchmark(true);
  }, []);

  const handleJobStarted = useCallback((jobId: string) => {
    setRunningJobId(jobId);
    setJobStatus(null);
  }, []);

  const handleDeleteRun = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((s) => s !== id));
    loadHistory();
  }, [loadHistory]);

  const handleCancelJob = useCallback(() => {
    if (!runningJobId) return;
    fetch(`${API_URL}/benchmark/run/${runningJobId}/cancel`, { method: 'POST' })
      .then(() => {
        setRunningJobId(null);
        setJobStatus(null);
      })
      .catch(() => {});
  }, [runningJobId]);

  return (
    <div className="benchmark-dashboard">
      <div className="benchmark-header">
        <h2>Benchmark Qualite AI</h2>
        <button className="new-benchmark-btn" onClick={() => setShowNewBenchmark(true)}>
          + Nouveau benchmark
        </button>
      </div>

      {(runningJobId || (jobStatus && jobStatus.state !== 'completed')) && (
        <BenchmarkProgress
          status={jobStatus ? {
            state: jobStatus.state,
            currentSuite: jobStatus.currentSuite,
            currentCase: jobStatus.currentCase,
            completedSuites: jobStatus.completedSuites,
            totalSuites: jobStatus.totalSuites,
            completedCases: jobStatus.completedCases,
            totalCases: jobStatus.totalCases,
            totalRuns: jobStatus.totalRuns,
            completedRuns: jobStatus.completedRuns,
            currentRunLabel: jobStatus.currentRunLabel,
            partialScores: jobStatus.partialScores,
          } : null}
          onCancel={handleCancelJob}
        />
      )}

      <div className="benchmark-tabs">
        <button className={activeTab === 'compare' ? 'active' : ''} onClick={() => setActiveTab('compare')}>
          Comparaison
        </button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
          Historique
        </button>
        <button className={activeTab === 'suggestions' ? 'active' : ''} onClick={() => setActiveTab('suggestions')}>
          Suggestions
        </button>
      </div>

      <div className="benchmark-content">
        <div className="benchmark-sidebar">
          <RunSelector selectedIds={selectedIds} onSelectionChange={setSelectedIds} refreshKey={selectorRefreshKey} onDelete={handleDeleteRun} />
        </div>

        <div className="benchmark-main">
          {activeTab === 'compare' && (
            <>
              {selectedResults.length > 0 && (
                <div className="config-comparison">
                  {selectedResults.map((r) => (
                    <div key={r.id} className="config-comparison-card">
                      <div className="config-comparison-name">{r.config?.name || 'unknown'}</div>
                      <ConfigDetail result={r} />
                    </div>
                  ))}
                </div>
              )}

              {selectedResults.length > 0 && (
                <ScoreRadarChart results={selectedResults.map((r) => ({
                  id: r.id,
                  configName: r.config?.name || 'unknown',
                  suites: r.suites || [],
                }))} />
              )}

              {selectedResults.length >= 2 && (
                <BestConfigHighlight results={selectedResults.map((r) => ({
                  id: r.id,
                  configName: r.config?.name || 'unknown',
                  target: r.target,
                  suites: r.suites || [],
                }))} />
              )}

              {comparison && (
                <MetricComparisonTable
                  entries={comparison.entries || []}
                  configs={comparison.configs || []}
                />
              )}

              {selectedResults.length === 1 && selectedResults[0]?.suites && (
                <div className="single-result-suites">
                  <h4>Click a dimension for details</h4>
                  {selectedResults[0].suites.map((s: any) => (
                    <button key={s.suite} className="dimension-btn"
                      onClick={() => setDetailView({ suite: s.suite, resultIndex: 0 })}>
                      {s.suite}
                    </button>
                  ))}
                </div>
              )}

              {detailView && selectedResults[detailView.resultIndex] && (
                <DimensionDetail
                  suite={detailView.suite}
                  result={{
                    id: selectedResults[detailView.resultIndex].id,
                    configName: selectedResults[detailView.resultIndex].config?.name || 'unknown',
                    suites: selectedResults[detailView.resultIndex].suites || [],
                  }}
                  onClose={() => setDetailView(null)}
                />
              )}
            </>
          )}

          {activeTab === 'history' && (
            <HistoryChart points={historyPoints} title="Evolution du score global" />
          )}

          {activeTab === 'suggestions' && (
            <SuggestionsPanel onApplySuggestion={handleApplySuggestion} refreshKey={selectorRefreshKey} />
          )}
        </div>
      </div>

      {showNewBenchmark && (
        <div className="benchmark-modal-overlay">
          <NewBenchmarkPanel
            initialConfig={newBenchmarkConfig}
            onClose={() => { setShowNewBenchmark(false); setNewBenchmarkConfig(null); }}
            onStarted={() => { setShowNewBenchmark(false); setNewBenchmarkConfig(null); }}
            onJobStarted={handleJobStarted}
          />
        </div>
      )}
    </div>
  );
};

export default BenchmarkDashboard;
