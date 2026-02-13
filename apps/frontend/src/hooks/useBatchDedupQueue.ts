import { useState, useCallback, useRef } from 'react';
import { DuplicateMatch } from '../dedup';

export type DedupResolution = 'pending' | 'merge' | 'keep' | 'force';

export type PendingDedupEntry<T> = {
  id: string;
  pendingItem: T;
  match: DuplicateMatch;
  resolution: DedupResolution;
};

export function useBatchDedupQueue<T>() {
  const [queue, setQueue] = useState<PendingDedupEntry<T>[]>([]);
  const [inflight, setInflight] = useState(0);
  const [reviewVisible, setReviewVisible] = useState(false);
  const entryIdRef = useRef(0);

  const trackStart = useCallback(() => {
    setInflight(n => n + 1);
  }, []);

  const enqueue = useCallback((pendingItem: T, match: DuplicateMatch) => {
    const id = String(++entryIdRef.current);
    setQueue(prev => [...prev, { id, pendingItem, match, resolution: 'pending' as DedupResolution }]);
    setInflight(n => n - 1);
  }, []);

  const trackComplete = useCallback(() => {
    setInflight(n => n - 1);
  }, []);

  const openReview = useCallback(() => {
    setReviewVisible(true);
  }, []);

  const resolveEntry = useCallback((id: string, resolution: DedupResolution) => {
    setQueue(prev => prev.map(e => e.id === id ? { ...e, resolution } : e));
  }, []);

  const resolveAll = useCallback((resolution: DedupResolution) => {
    setQueue(prev => prev.map(e => ({ ...e, resolution })));
  }, []);

  const applyAll = useCallback((
    onMerge: (pendingItem: T, match: DuplicateMatch) => void,
    onAdd: (item: T) => void,
  ) => {
    setQueue(prev => {
      for (const entry of prev) {
        switch (entry.resolution) {
          case 'merge':
            onMerge(entry.pendingItem, entry.match);
            break;
          case 'keep':
          case 'force':
            onAdd(entry.pendingItem);
            break;
          // 'pending' entries are skipped (shouldn't happen if Apply is gated)
        }
      }
      return [];
    });
    setReviewVisible(false);
  }, []);

  const reset = useCallback(() => {
    setQueue([]);
    setInflight(0);
    setReviewVisible(false);
  }, []);

  const hasUnresolved = queue.some(e => e.resolution === 'pending');

  return {
    queue,
    inflight,
    reviewVisible,
    hasUnresolved,
    trackStart,
    enqueue,
    trackComplete,
    openReview,
    resolveEntry,
    resolveAll,
    applyAll,
    reset,
  };
}
