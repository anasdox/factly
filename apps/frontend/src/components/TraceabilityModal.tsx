import React, { useMemo } from 'react';
import { getRelatedEntities, getParentRelatedEntities } from '../lib';
import InputItem from './InputItem';
import FactItem from './FactItem';
import InsightItem from './InsightItem';
import RecommendationItem from './RecommendationItem';
import OutputItem from './OutputItem';
import './TraceabilityModal.css';

type Props = {
  isVisible: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  data: DiscoveryData;
};

const COLUMN_CONFIG = [
  { key: 'input', emoji: '📥', label: 'Inputs', dataKey: 'inputs' as const, idKey: 'input_id' as const },
  { key: 'fact', emoji: '📊', label: 'Facts', dataKey: 'facts' as const, idKey: 'fact_id' as const },
  { key: 'insight', emoji: '💡', label: 'Insights', dataKey: 'insights' as const, idKey: 'insight_id' as const },
  { key: 'recommendation', emoji: '👍', label: 'Recommendations', dataKey: 'recommendations' as const, idKey: 'recommendation_id' as const },
  { key: 'output', emoji: '📤', label: 'Outputs', dataKey: 'outputs' as const, idKey: 'output_id' as const },
] as const;

const TraceabilityModal: React.FC<Props> = ({ isVisible, onClose, entityType, entityId, data }) => {
  const { relatedIds, originItem } = useMemo(() => {
    if (!isVisible) return { relatedIds: new Map<string, Set<string>>(), originItem: null };

    const forward = getRelatedEntities(entityType, entityId, data);
    const backward = getParentRelatedEntities(entityType, entityId, data);
    const all = [...forward, ...backward];

    const ids = new Map<string, Set<string>>();
    for (const { type, id } of all) {
      if (!ids.has(type)) ids.set(type, new Set());
      ids.get(type)!.add(id);
    }

    // Find the origin item text for the header
    let origin: string | null = null;
    for (const col of COLUMN_CONFIG) {
      if (col.key === entityType) {
        const item = (data[col.dataKey] as any[]).find((i: any) => i[col.idKey] === entityId);
        if (item) origin = item.text || item.title || '';
        break;
      }
    }

    return { relatedIds: ids, originItem: origin };
  }, [isVisible, entityType, entityId, data]);

  if (!isVisible) return null;

  const renderItem = (type: string, item: any, isOrigin: boolean) => {
    const className = `traceability-item${isOrigin ? ' traceability-item-origin' : ''}`;
    return (
      <div key={item[`${type}_id`]} className={className}>
        {type === 'input' && <InputItem input={item} />}
        {type === 'fact' && <FactItem fact={item} />}
        {type === 'insight' && <InsightItem insight={item} />}
        {type === 'recommendation' && <RecommendationItem recommendation={item} />}
        {type === 'output' && <OutputItem output={item} />}
      </div>
    );
  };

  const EMOJI_MAP: Record<string, string> = { input: '📥', fact: '📊', insight: '💡', recommendation: '👍', output: '📤' };

  return (
    <div className="traceability-overlay" onClick={onClose}>
      <div className="traceability-panel" onClick={(e) => e.stopPropagation()}>
        <div className="traceability-header">
          <div className="traceability-header-title">
            <h2>{EMOJI_MAP[entityType] || ''} Traceability</h2>
            {originItem && <span className="traceability-header-text">{originItem}</span>}
          </div>
          <button className="traceability-close" onClick={onClose}>&times;</button>
        </div>
        <div className="traceability-columns">
          {COLUMN_CONFIG.map((col) => {
            const ids = relatedIds.get(col.key);
            if (!ids || ids.size === 0) return null;
            const items = (data[col.dataKey] as any[]).filter((i: any) => ids.has(i[col.idKey]));
            if (items.length === 0) return null;

            return (
              <div key={col.key} className="traceability-column">
                <h3>{col.emoji} {col.label}</h3>
                {items.map((item: any) =>
                  renderItem(col.key, item, col.key === entityType && item[col.idKey] === entityId)
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TraceabilityModal;
