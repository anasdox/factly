import { useState, useCallback, useEffect, useMemo } from 'react';

export function useItemSelection(validIds?: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Stable reference: only changes when the actual IDs change
  const validIdKey = validIds ? validIds.join(',') : '';
  const stableValidIds = useMemo(() => validIds, [validIdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prune selection when items are removed
  useEffect(() => {
    if (!stableValidIds) return;
    setSelectedIds(prev => {
      const validSet = new Set(stableValidIds);
      const pruned = new Set(Array.from(prev).filter(id => validSet.has(id)));
      if (pruned.size !== prev.size) return pruned;
      return prev;
    });
  }, [stableValidIds]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  return { selectedIds, toggleSelection, clearSelection, selectAll };
}
