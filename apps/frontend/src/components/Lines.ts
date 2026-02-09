import { useCallback } from "react";

export const useCalculateAndDrawLines = () => {
  const calculateAndDrawLines = useCallback((
    data: DiscoveryData,
    inputRefs: Array<HTMLDivElement | null>,
    factRefs: Array<HTMLDivElement | null>,
    insightRefs: Array<HTMLDivElement | null>,
    recommendationRefs: Array<HTMLDivElement | null>,
    outputRefs: Array<HTMLDivElement | null>
  
  ) => {
    const existingLines = document.querySelectorAll('.line');
    existingLines.forEach(line => line.remove());
  
    data.facts.forEach((fact, factIndex) => {
      if (factRefs && factRefs[factIndex]) {
        const factRect = factRefs[factIndex]!.getBoundingClientRect();
  
        fact.related_inputs.forEach(relatedInputId => {
  
          const inputIndex = data.inputs.findIndex(input => input.input_id === relatedInputId);
          const inputRef = inputRefs[inputIndex];
  
          if (inputRef) {
            const inputRect = inputRef.getBoundingClientRect();
  
            const startX = inputRect.right;
            const startY = inputRect.top + inputRect.height / 2;
            const endX = factRect.left;
            const endY = factRect.top + factRect.height / 2;
  
            createLine(startX, startY, endX, endY, 'input', relatedInputId, 'fact', fact.fact_id);
          }
        });
      }
    });
  
    data.insights.forEach((insight, insightIndex) => {
      if (insightRefs[insightIndex]) {
        const insightRect = insightRefs[insightIndex]!.getBoundingClientRect();
  
        insight.related_facts.forEach(relatedFactId => {
          const factIndex = data.facts.findIndex(fact => fact.fact_id === relatedFactId);
          const factRef = factRefs[factIndex];
  
          if (factRef) {
            const factRect = factRef.getBoundingClientRect();
  
            const startX = factRect.right;
            const startY = factRect.top + factRect.height / 2;
            const endX = insightRect.left;
            const endY = insightRect.top + insightRect.height / 2;
  
            createLine(startX, startY, endX, endY, 'fact', relatedFactId, 'insight', insight.insight_id);
          }
        });
      }
    });
  
    data.recommendations.forEach((recommendation, recommendationIndex) => {
      if (recommendationRefs[recommendationIndex]) {
        const recommendationRect = recommendationRefs[recommendationIndex]!.getBoundingClientRect();
  
        recommendation.related_insights.forEach(relatedInsightId => {
          const insightIndex = data.insights.findIndex(insight => insight.insight_id === relatedInsightId);
          const insightRef = insightRefs[insightIndex];
  
          if (insightRef) {
            const insightRect = insightRef.getBoundingClientRect();
  
            const startX = insightRect.right;
            const startY = insightRect.top + insightRect.height / 2;
            const endX = recommendationRect.left;
            const endY = recommendationRect.top + recommendationRect.height / 2;
  
            createLine(startX, startY, endX, endY, 'insight', relatedInsightId, 'recommendation', recommendation.recommendation_id);
          }
        });
      }
    });
  
    data.outputs.forEach((output, outputIndex) => {
      if (outputRefs[outputIndex]) {
        const outputRect = outputRefs[outputIndex]!.getBoundingClientRect();
  
        output.related_recommendations.forEach(relatedRecommendationId => {
          const recommendationIndex = data.recommendations.findIndex(
            recommendation => recommendation.recommendation_id === relatedRecommendationId
          );
          const recommendationRef = recommendationRefs[recommendationIndex];
  
          if (recommendationRef) {
            const recommendationRect = recommendationRef.getBoundingClientRect();
  
            const startX = recommendationRect.right;
            const startY = recommendationRect.top + recommendationRect.height / 2;
            const endX = outputRect.left;
            const endY = outputRect.top + outputRect.height / 2;
  
            createLine(startX, startY, endX, endY, 'recommendation', relatedRecommendationId, 'output', output.output_id);
          }
        });
      }
    });
  }, []);

  return (calculateAndDrawLines);
}


const createLine = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  sourceEntityType: string,
  sourceEntityId: string,
  targetEntityType: string,
  targetEntityId: string
) => {
  const line = document.createElement('div');
  line.classList.add('line');
  // Assign an ID to the line based on the entities it connects
  line.id = `link-${sourceEntityType}-${sourceEntityId}-to-${targetEntityType}-${targetEntityId}`;

  const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

  line.style.position = 'absolute';
  line.style.left = `${startX + window.scrollX}px`;
  line.style.top = `${startY + window.scrollY}px`;
  line.style.width = `${length}px`;
  line.style.transform = `rotate(${angle}deg)`;
  line.style.transformOrigin = '0 0';

  document.body.appendChild(line);
};



