import { useState } from 'react';
import { DuplicateMatch } from '../dedup';

type MergeDialogState<T> = {
  visible: boolean;
  pendingItem: T | null;
  match: DuplicateMatch | null;
};

export function useMergeDialog<T>() {
  const [state, setState] = useState<MergeDialogState<T>>({
    visible: false,
    pendingItem: null,
    match: null,
  });

  const show = (pendingItem: T, match: DuplicateMatch) => {
    setState({ visible: true, pendingItem, match });
  };

  const reset = () => {
    setState({ visible: false, pendingItem: null, match: null });
  };

  const handleMerge = (mergeCallback?: (pendingItem: T, match: DuplicateMatch) => void) => {
    if (mergeCallback && state.pendingItem && state.match) {
      mergeCallback(state.pendingItem, state.match);
    }
    reset();
  };

  const handleKeepAsVariant = (addItem: (item: T) => void) => {
    if (state.pendingItem) addItem(state.pendingItem);
    reset();
  };

  const handleForceAdd = (addItem: (item: T) => void) => {
    if (state.pendingItem) addItem(state.pendingItem);
    reset();
  };

  return {
    visible: state.visible,
    pendingItem: state.pendingItem,
    match: state.match,
    show,
    reset,
    handleMerge,
    handleKeepAsVariant,
    handleForceAdd,
  };
}
