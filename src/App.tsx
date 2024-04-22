import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faFileDownload } from '@fortawesome/free-solid-svg-icons';

import './App.css';
import InputList from './components/InputList';
import FactList from './components/FactList';
import InsightList from './components/InsightList';
import RecommendationList from './components/RecommendationList';
import OutputList from './components/OutputList';

const App: React.FC = () => {
  const [data, setData] = useState<DiscoveryData | null>(null);
  const inputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const factRefs = useRef<(HTMLDivElement | null)[]>([]);
  const insightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const recommendationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const outputRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();

    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = e => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setData(data as DiscoveryData);
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };

      fileReader.onerror = (error) => {
        console.error("Error reading file:", error);
      };
    }
  };

  const handleExport = () => {
    if (!data) return;

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.title.replace(/\s+/g, '_')}_export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


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
    line.style.left = `${startX}px`;
    line.style.top = `${startY}px`;
    line.style.width = `${length}px`;
    line.style.transform = `rotate(${angle}deg)`;
    line.style.transformOrigin = '0 0';

    document.body.appendChild(line);
  };

  function handleMouseEnter(entityType: string, entityId: string, data: DiscoveryData) {
    // Highlight the current entity
    const entityElement = document.getElementById(`${entityType}-${entityId}`);
    entityElement?.classList.add('highlighted');

    // Highlight all related entities and their links
    const relatedEntities = getRelatedEntities(entityType, entityId, data);
    const parentRelatedEntities = getParentRelatedEntities(entityType, entityId, data);

    [...relatedEntities, ...parentRelatedEntities].forEach((relatedEntity) => {
      const relatedElement = document.getElementById(`${relatedEntity.type}-${relatedEntity.id}`);
      relatedElement?.classList.add('highlighted');
      highlightLinks(entityType, entityId, relatedEntity.type, relatedEntity.id);
    });
  }

  function handleMouseLeave(entityType: string, entityId: string, data: DiscoveryData) {
    // Remove highlighting from the current entity
    const entityElement = document.getElementById(`${entityType}-${entityId}`);
    entityElement?.classList.remove('highlighted');

    // Remove highlighting from all related entities and their links
    const relatedEntities = getRelatedEntities(entityType, entityId, data);
    const parentRelatedEntities = getParentRelatedEntities(entityType, entityId, data);

    [...relatedEntities, ...parentRelatedEntities].forEach((relatedEntity) => {
      const relatedElement = document.getElementById(`${relatedEntity.type}-${relatedEntity.id}`);
      relatedElement?.classList.remove('highlighted');
      removeLinkHighlight(entityType, entityId, relatedEntity.type, relatedEntity.id);
    });
  }

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


  useEffect(() => {
    fetch('/data.json')
      .then((response) => response.json())
      .then((data: DiscoveryData) => {
        setData(data);
      });
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
        return () => {
          window.removeEventListener('resize', handleResize);
          const existingLines = document.querySelectorAll('.line');
          existingLines.forEach(line => line.remove());
        }
      }
    }
  }, [data, calculateAndDrawLines]);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="App">
      <header className='discovery-header'>
        <div className='discovery-details'>
          <div><h1>🔍{data.title}</h1></div>
          <div><h5>🎯{data.goal}</h5></div>
        </div>
        <div className="toolbar">
          <div>
            <label htmlFor="file-input">
              <FontAwesomeIcon icon={faUpload} size='1x' />
            </label>
            <input
              id="file-input"
              type="file"
              accept=".json"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>
          <div>
            <button onClick={handleExport} style={{ border: 'none', background: 'none' }}>
              <FontAwesomeIcon icon={faFileDownload} size='lg' />
            </button>
          </div>
        </div>
      </header>
      <main className="discovery-grid">
        {inputRefs ?
          <InputList
            inputRefs={inputRefs}
            handleMouseEnter={handleMouseEnter}
            handleMouseLeave={handleMouseLeave}
            setData={setData}
            data={data} />
          : ""}
        {
          factRefs ?
            <FactList
              factRefs={factRefs}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              setData={setData}
              data={data} />
            : ""}
        {
          insightRefs ?
            <InsightList
              insightRefs={insightRefs}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              setData={setData}
              data={data} />
            : ""
        }
        {
          recommendationRefs ?
            <RecommendationList
              recommendationRefs={recommendationRefs}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              setData={setData}
              data={data} />
            : ""
        }
        {
          outputRefs ?
            <OutputList
              outputRefs={outputRefs}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              setData={setData}
              data={data} />
            : ""
        }
      </main >
    </div >
  );
};

export default App;

