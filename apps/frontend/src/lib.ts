export function getRelatedEntities(entityType: string, entityId: string, data: DiscoveryData) {
  let relatedEntities: { type: string; id: string; }[] = [];

  const addRelatedEntities = (type: string, id: string) => {
    if (!relatedEntities.some(entity => entity.type === type && entity.id === id)) {
      relatedEntities.push({ type, id });

      // Depending on the type, find and add indirect related entities
      switch (type) {
        case 'input':
          data.facts.forEach((fact) => {
            if (fact.related_inputs.includes(id)) {
              addRelatedEntities('fact', fact.fact_id);
            }
          });
          break;
        case 'fact':
          data.insights.forEach((insight) => {
            if (insight.related_facts.includes(id)) {
              addRelatedEntities('insight', insight.insight_id);
            }
          });
          break;
        case 'insight':
          data.recommendations.forEach((recommendation) => {
            if (recommendation.related_insights.includes(id)) {
              addRelatedEntities('recommendation', recommendation.recommendation_id);
            }
          });
          break;
        case 'recommendation':
          data.outputs.forEach((output) => {
            if (output.related_recommendations.includes(id)) {
              addRelatedEntities('output', output.output_id);
            }
          });
          break;
        default:
          break;
      }
    }
  };

  addRelatedEntities(entityType, entityId);

  return relatedEntities;
}

export function getParentRelatedEntities(entityType: string, entityId: string, data: DiscoveryData) {
  let parentRelatedEntities: { type: string; id: string; }[] = [];

  const addParentRelatedEntities = (type: string, id: string) => {
    if (!parentRelatedEntities.some(entity => entity.type === type && entity.id === id)) {
      parentRelatedEntities.push({ type, id });

      switch (type) {
        case 'fact':
          data.facts.findLast((fact) => fact.fact_id === id)?.related_inputs.forEach((input_id) => {
            addParentRelatedEntities('input', input_id)
          });
          break;
        case 'insight':
          data.insights.findLast((insight) => insight.insight_id === id)?.related_facts.forEach((fact_id) => {
            addParentRelatedEntities('fact', fact_id)
          });
          break;

        case 'recommendation':
          data.recommendations.findLast((recommendation) => recommendation.recommendation_id === id)?.related_insights.forEach((insight_id) => {
            addParentRelatedEntities('insight', insight_id)
          });
          break;

        case 'output':
          data.outputs.findLast((output) => output.output_id === id)?.related_recommendations.forEach((recommendation_id) => {
            addParentRelatedEntities('recommendation', recommendation_id)
          });
          break;
        default:
          break;
      }
    }
  }
  addParentRelatedEntities(entityType, entityId);

  return parentRelatedEntities;
}


function highlightLinks(entityType: string, entityId: string, relatedEntityType: string, relatedEntityId: string) {
  const linkElementId = `link-${entityType}-${entityId}-to-${relatedEntityType}-${relatedEntityId}`;
  const linkElement = document.getElementById(linkElementId);
  linkElement?.classList.add('link-highlighted');
}

function removeLinkHighlight(entityType: string, entityId: string, relatedEntityType: string, relatedEntityId: string) {
  const linkElementId = `link-${entityType}-${entityId}-to-${relatedEntityType}-${relatedEntityId}`;
  const linkElement = document.getElementById(linkElementId);
  linkElement?.classList.remove('link-highlighted');
}

export function handleMouseEnter(entityType: string, entityId: string, data: DiscoveryData) {
  // Highlight the current entity
  const entityElement = document.getElementById(`${entityType}-${entityId}`);
  entityElement?.classList.add('highlighted');

  const entityToolbarElement = document.getElementById(`${entityType}-${entityId}-toolbar`);
  if (entityToolbarElement) {
   entityToolbarElement.style.display = "flex";
  }

  // Highlight all related entities and their links
  const relatedEntities = getRelatedEntities(entityType, entityId, data);
  const parentRelatedEntities = getParentRelatedEntities(entityType, entityId, data);

  [...relatedEntities, ...parentRelatedEntities].forEach((relatedEntity) => {
    const relatedElement = document.getElementById(`${relatedEntity.type}-${relatedEntity.id}`);
    relatedElement?.classList.add('highlighted');
    highlightLinks(entityType, entityId, relatedEntity.type, relatedEntity.id);
  });
}

export function handleMouseLeave(entityType: string, entityId: string, data: DiscoveryData) {
  // Remove highlighting from the current entity
  const entityElement = document.getElementById(`${entityType}-${entityId}`);
  entityElement?.classList.remove('highlighted');

  const entityToolbarElement = document.getElementById(`${entityType}-${entityId}-toolbar`);
  if (entityToolbarElement) {
   entityToolbarElement.style.display = "none";
  }


  // Remove highlighting from all related entities and their links
  const relatedEntities = getRelatedEntities(entityType, entityId, data);
  const parentRelatedEntities = getParentRelatedEntities(entityType, entityId, data);

  [...relatedEntities, ...parentRelatedEntities].forEach((relatedEntity) => {
    const relatedElement = document.getElementById(`${relatedEntity.type}-${relatedEntity.id}`);
    relatedElement?.classList.remove('highlighted');
    removeLinkHighlight(entityType, entityId, relatedEntity.type, relatedEntity.id);
  });
}

export const isObjectEmpty = (objectName: any) => {
  return (
    objectName &&
    Object.keys(objectName).length === 0 &&
    objectName.constructor === Object
  );
};

// ── Direct children (depth-1 only) ──

export function getDirectChildren(
  entityType: string,
  entityId: string,
  data: DiscoveryData,
): { type: string; id: string; text: string }[] {
  switch (entityType) {
    case 'input':
      return data.facts
        .filter(f => f.related_inputs.includes(entityId))
        .map(f => ({ type: 'fact', id: f.fact_id, text: f.text }));
    case 'fact':
      return data.insights
        .filter(i => i.related_facts.includes(entityId))
        .map(i => ({ type: 'insight', id: i.insight_id, text: i.text }));
    case 'insight':
      return data.recommendations
        .filter(r => r.related_insights.includes(entityId))
        .map(r => ({ type: 'recommendation', id: r.recommendation_id, text: r.text }));
    case 'recommendation':
      return data.outputs
        .filter(o => o.related_recommendations.includes(entityId))
        .map(o => ({ type: 'output', id: o.output_id, text: o.text }));
    default:
      return [];
  }
}

// ── Consistency engine ──

export function createNewVersion(item: ItemType, newText: string): ItemType {
  const currentVersion = item.version || 1;
  const currentText = item.text || '';
  const previousEntry: VersionEntry = {
    version: currentVersion,
    text: currentText,
    created_at: item.created_at || new Date().toISOString(),
  };
  return {
    ...item,
    text: newText,
    version: currentVersion + 1,
    status: 'validated' as EntityStatus,
    created_at: new Date().toISOString(),
    versions: [...(item.versions || []), previousEntry],
  };
}

type PropagationMode = 'edited' | 'archived';

export function propagateImpact(
  data: DiscoveryData,
  entityType: string,
  entityId: string,
  mode: PropagationMode,
  impactedIds?: string[],
): { data: DiscoveryData; impactedCount: number } {
  if (mode === 'archived' || !impactedIds) {
    // Archive mode or no filter: full transitive cascade (original behavior)
    const downstream = getRelatedEntities(entityType, entityId, data);
    const statusMap = new Map<string, EntityStatus>();

    downstream.forEach(({ type, id }) => {
      if (type === entityType && id === entityId) return;
      let targetStatus: EntityStatus;
      if (mode === 'archived') {
        switch (type) {
          case 'fact': targetStatus = 'unsupported'; break;
          case 'insight': targetStatus = 'weak'; break;
          case 'recommendation': targetStatus = 'risky'; break;
          case 'output': targetStatus = 'needs_refresh'; break;
          default: return;
        }
      } else {
        targetStatus = type === 'output' ? 'needs_refresh' : 'needs_review';
      }
      statusMap.set(`${type}:${id}`, targetStatus);
    });

    const applyStatus = <T extends { version?: number; status?: EntityStatus }>(
      items: T[], idField: string, typeName: string,
    ): T[] =>
      items.map((item) => {
        const key = `${typeName}:${(item as any)[idField]}`;
        const newStatus = statusMap.get(key);
        return newStatus ? { ...item, status: newStatus } : item;
      });

    const updatedData: DiscoveryData = {
      ...data,
      facts: applyStatus(data.facts, 'fact_id', 'fact'),
      insights: applyStatus(data.insights, 'insight_id', 'insight'),
      recommendations: applyStatus(data.recommendations, 'recommendation_id', 'recommendation'),
      outputs: applyStatus(data.outputs, 'output_id', 'output'),
    };
    return { data: updatedData, impactedCount: statusMap.size };
  }

  // Lazy propagation: only mark impacted direct children (depth-1)
  const impactedSet = new Set(impactedIds);
  const statusMap = new Map<string, EntityStatus>();

  // Get direct children and filter to impacted ones
  const directChildren = getDirectChildren(entityType, entityId, data);
  const impactedChildren = directChildren.filter(c => impactedSet.has(c.id));

  for (const child of impactedChildren) {
    const targetStatus: EntityStatus = child.type === 'output' ? 'needs_refresh' : 'needs_review';
    statusMap.set(`${child.type}:${child.id}`, targetStatus);
  }

  const applyStatus = <T extends { version?: number; status?: EntityStatus }>(
    items: T[], idField: string, typeName: string,
  ): T[] =>
    items.map((item) => {
      const key = `${typeName}:${(item as any)[idField]}`;
      const newStatus = statusMap.get(key);
      return newStatus ? { ...item, status: newStatus } : item;
    });

  const updatedData: DiscoveryData = {
    ...data,
    facts: applyStatus(data.facts, 'fact_id', 'fact'),
    insights: applyStatus(data.insights, 'insight_id', 'insight'),
    recommendations: applyStatus(data.recommendations, 'recommendation_id', 'recommendation'),
    outputs: applyStatus(data.outputs, 'output_id', 'output'),
  };
  return { data: updatedData, impactedCount: statusMap.size };
}

export function clearStatus(data: DiscoveryData, entityType: string, entityId: string): DiscoveryData {
  const setValidated = <T extends { status?: EntityStatus }>(
    items: T[],
    idField: string,
  ): T[] =>
    items.map((item) =>
      (item as any)[idField] === entityId ? { ...item, status: 'validated' as EntityStatus } : item,
    );

  switch (entityType) {
    case 'input':
      return { ...data, inputs: setValidated(data.inputs, 'input_id') };
    case 'fact':
      return { ...data, facts: setValidated(data.facts, 'fact_id') };
    case 'insight':
      return { ...data, insights: setValidated(data.insights, 'insight_id') };
    case 'recommendation':
      return { ...data, recommendations: setValidated(data.recommendations, 'recommendation_id') };
    case 'output':
      return { ...data, outputs: setValidated(data.outputs, 'output_id') };
    default:
      return data;
  }
}

export function isActionableStatus(status?: EntityStatus): boolean {
  return !!status && status !== 'draft' && status !== 'validated';
}