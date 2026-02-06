function getRelatedEntities(entityType: string, entityId: string, data: DiscoveryData) {
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

function getParentRelatedEntities(entityType: string, entityId: string, data: DiscoveryData) {
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