import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faFileDownload} from '@fortawesome/free-solid-svg-icons';
import { faFileAlt, faImage, faVideo, faFileAudio, faFilePdf, faGlobe, faFileCsv, faQuestionCircle, faAdd } from '@fortawesome/free-solid-svg-icons';

import ModalDialog from "react-basic-modal-dialog";

import './App.css';

type InputType = {
  input_id: string;
  type: string;
  title: string;
  url: string;
};

type FactType = {
  fact_id: string;
  related_inputs: string[];
  text: string;
};

type InsightType = {
  insight_id: string;
  related_facts: string[];
  text: string;
};

type RecommendationType = {
  recommendation_id: string;
  related_insights: string[];
  text: string;
};

type OutputType = {
  output_id: string;
  related_recommendations: string[];
  text: string;
};

type DiscoveryData = {
  discovery_id: string;
  title: string;
  goal: string;
  date: string;
  inputs: InputType[];
  facts: FactType[];
  insights: InsightType[];
  recommendations: RecommendationType[];
  outputs: OutputType[];
};

const App: React.FC = () => {
  const [data, setData] = useState<DiscoveryData | null>(null);

  // Inputs
  const inputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isInputDialogVisible, setIsInputDialogVisible] = useState(false);
  const [currentInputTitle, setCurrentInputTitle] = useState("");
  const handleCurrentInputTitleChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setCurrentInputTitle(event.target.value);
  };
  const [currentInputType, setCurrentInputType] = useState("");
  const handleCurrentInputTypeChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setCurrentInputType(event.target.value);
  }
  const [currentInputUrl, setCurrentInputUrl] = useState("");
  const handleCurrentInputUrlChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setCurrentInputUrl(event.target.value);
  }

  // Facts
  const factRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isFactDialogVisible, setIsFactDialogVisible] = useState(false);
  const [currentFactText, setCurrentFactText] = useState("");
  const handleCurrentFactTextChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setCurrentFactText(event.target.value);
  };

  const [currentFactRelatedInputs, setCurrentRelatedInputs] = useState<string[]>([]);
  const handleCurrentRelatedInputsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions, (option) => (option as HTMLOptionElement).value);
    setCurrentRelatedInputs(selectedOptions);
  };

  // Insights
  const insightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isInsightDialogVisible, setIsInsightDialogVisible] = useState(false);
  const [currentInsightText, setCurrentInsightText] = useState("");
  const handleCurrentInsightTextChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setCurrentInsightText(event.target.value);
  };
  const [currentInsightRelatedFacts, setCurrentInsightRelatedFacts] = useState<string[]>([]);
  const handleCurrentInsightRelatedFactsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions, (option) => (option as HTMLOptionElement).value);
    setCurrentInsightRelatedFacts(selectedOptions);
  };

  // Recommendations
  const recommendationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isRecommendationDialogVisible, setIsRecommendationDialogVisible] = useState(false);
  const [currentRecommendationText, setCurrentRecommendationText] = useState("");
  const handleCurrentRecommendationTextChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setCurrentRecommendationText(event.target.value);
  };
  const [currentRecommendationRelatedInsights, setCurrentRecommendationRelatedInsights] = useState<string[]>([]);
  const handleCurrentRecommendationRelatedInsightsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions, (option) => (option as HTMLOptionElement).value);
    setCurrentRecommendationRelatedInsights(selectedOptions);
  };

  // Output
  const outputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isOutputDialogVisible, setIsOutputDialogVisible] = useState(false);
  const [currentOutputText, setCurrentOutputText] = useState("");
  const handleCurrentOutputTextChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setCurrentOutputText(event.target.value);
  };
  const [currentOutputRelatedRecommendations, setCurrentOutputRelatedRecommendations] = useState<string[]>([]);
  const handleCurrentOutputRelatedRecommendationsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions, (option) => (option as HTMLOptionElement).value);
    setCurrentOutputRelatedRecommendations(selectedOptions);
  };

  const setInputRef = useCallback((element: HTMLDivElement, index: number) => {
    inputRefs.current[index] = element;
  }, []);
  const setFactRef = useCallback((element: HTMLDivElement, index: number) => {
    factRefs.current[index] = element;
  }, []);
  const setInsightRef = useCallback((element: HTMLDivElement, index: number) => {
    insightRefs.current[index] = element;
  }, []);
  const setRecommendationRef = useCallback((element: HTMLDivElement, index: number) => {
    recommendationRefs.current[index] = element;
  }, []);
  const setOutputRef = useCallback((element: HTMLDivElement, index: number) => {
    outputRefs.current[index] = element;
  }, []);

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
          <div className="column inputs">
            <h2>📥Inputs</h2>
            {data.inputs.map((input, index) => (
              <div
                id={"input-" + input.input_id}
                ref={el => el ? setInputRef(el, index) : null}
                key={input.input_id}
                className="input-item item"
                onClick={() => window.open(input.url, '_blank', 'noopener')}
                onMouseEnter={() => handleMouseEnter("input", input.input_id, data)}
                onMouseLeave={() => handleMouseLeave("input", input.input_id, data)}
              >
                <div><FontAwesomeIcon color="#555" size={'2xl'}  icon={
                  input.type === "text" ? faFileAlt :
                  input.type === "image" ? faImage :
                  input.type === "video" ? faVideo :
                  input.type === "audio" ? faFileAudio :
                  input.type === "pdf" ? faFilePdf :
                  input.type === "web" ? faGlobe :
                  input.type === "csv" ? faFileCsv :
                  faQuestionCircle // 'other' or unknown type
                } /> </div><div>{input.title}</div>
              </div>
            ))}
            <button className="add-button" onClick={() => { setIsInputDialogVisible(true) }}><FontAwesomeIcon icon={faAdd} /></button >
            <ModalDialog isDialogVisible={isInputDialogVisible} closeDialog={() => setIsInputDialogVisible(false)}>
              <h2>Add Input</h2>
              <form>
                <label htmlFor="input-title">Title</label>
                <input id="input-title" type="text" onChange={handleCurrentInputTitleChange} />
                <label htmlFor="input-url">URL</label>
                <input id="input-url" type="text" onChange={handleCurrentInputUrlChange} />
                <label htmlFor="input-type">Type</label>
                <select id="input-type" onChange={handleCurrentInputTypeChange}>
                  <option value="text">Text</option>
                  <option value="web">Web</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="pdf">Pdf</option>
                </select>
              </form>
              <button onClick={() => setIsInputDialogVisible(false)}>Close</button>
              <button onClick={() => {
                const newInput: InputType = {
                  input_id: data.inputs[data.inputs.length - 1].input_id + 1,
                  title: currentInputTitle,
                  type: currentInputType,
                  url: currentInputUrl
                };

                setData((prevState) => prevState ? ({
                  ...prevState,
                  inputs: [...prevState.inputs, newInput]
                }) : prevState);
                setIsInputDialogVisible(false);
              }}>Save</button>

            </ModalDialog>
          </div >

          : ""}
        {
          factRefs ?
            <div className="column facts">
              <h2>📊Facts</h2>
              {data.facts.map((fact, index) => (
                <div
                  id={"fact-" + fact.fact_id}
                  ref={el => el ? setFactRef(el, index) : null}
                  key={fact.fact_id}
                  className="fact-item item"
                  onMouseEnter={() => handleMouseEnter("fact", fact.fact_id, data)}
                  onMouseLeave={() => handleMouseLeave("fact", fact.fact_id, data)}
                >
                  {fact.text}

                </div>
              ))}
              <button className="add-button fact-add-button" onClick={() => { setIsFactDialogVisible(true) }}><FontAwesomeIcon icon={faAdd} /></button>
              <ModalDialog isDialogVisible={isFactDialogVisible} closeDialog={() => setIsFactDialogVisible(false)}>
                <h2>Add Fact</h2>
                <form>
                  <label htmlFor="fact-text">Text</label>
                  <input id="fact-text" type="text" onChange={handleCurrentFactTextChange} />
                  <select id="fact-related-inputs" onChange={handleCurrentRelatedInputsChange} multiple>
                    {data.inputs ? data.inputs.map((input) => (<option key={input.input_id} value={input.input_id}>{input.title}</option>)) : ""}
                  </select>

                </form>
                <button onClick={() => setIsFactDialogVisible(false)}>Close</button>
                <button onClick={() => {
                  const newFact: FactType = {
                    fact_id: data.facts[data.facts.length - 1].fact_id + 1,
                    text: currentFactText,
                    related_inputs: currentFactRelatedInputs
                  };
                  setData((prevState) => prevState ? ({ ...prevState, facts: [...prevState.facts, newFact] }) : prevState);
                  setIsFactDialogVisible(false);
                }}>Save</button>

              </ModalDialog>
            </div>
            : ""
        }
        {
          insightRefs ?
            <div className="column insights">
              <h2>💡Insights</h2>
              {data.insights.map((insight, index) => (
                <div
                  id={"insight-" + insight.insight_id}
                  ref={el => el ? setInsightRef(el, index) : null}
                  key={insight.insight_id}
                  className="insight-item item"
                  onMouseEnter={() => handleMouseEnter("insight", insight.insight_id, data)}
                  onMouseLeave={() => handleMouseLeave("insight", insight.insight_id, data)}
                >
                  {insight.text}
                </div>
              ))}
              <button className="add-button insight-add-button" onClick={() => { setIsInsightDialogVisible(true) }}><FontAwesomeIcon icon={faAdd} /></button>
              <ModalDialog isDialogVisible={isInsightDialogVisible} closeDialog={() => setIsInsightDialogVisible(false)}>
                <h2>Add Insight</h2>
                <form>
                  <label htmlFor="insight-text">Text</label>
                  <input id="insight-text" type="text" onChange={handleCurrentInsightTextChange} />
                  <label htmlFor="insight-related-facts">Related Facts</label>
                  <select id="insight-related-facts" onChange={handleCurrentInsightRelatedFactsChange} multiple>
                    {data.facts.map(fact => (<option key={fact.fact_id} value={fact.fact_id}>{fact.text}</option>))}
                  </select>

                </form>
                <button onClick={() => setIsInsightDialogVisible(false)}>Close</button>
                <button onClick={() => {
                  const newInsight: InsightType = {
                    insight_id: data.insights[data.insights.length - 1].insight_id + 1,
                    text: currentInsightText,
                    related_facts: currentInsightRelatedFacts
                  };
                  setData((prevState) => prevState ? ({ ...prevState, insights: [...prevState.insights, newInsight] }) : prevState);
                  setIsInsightDialogVisible(false);
                }}>Save</button>
              </ModalDialog>

            </div>
            : ""
        }
        {
          recommendationRefs ?
            <div className="column recommendations">
              <h2>👍Recommendations</h2>
              {data.recommendations.map((recommendation, index) => (
                <div
                  id={"recommendation-" + recommendation.recommendation_id}
                  ref={el => el ? setRecommendationRef(el, index) : null}
                  key={recommendation.recommendation_id}
                  className="recommendation-item item"
                  onMouseEnter={() => handleMouseEnter("recommendation", recommendation.recommendation_id, data)}
                  onMouseLeave={() => handleMouseLeave("recommendation", recommendation.recommendation_id, data)}
                >
                  {recommendation.text}
                </div>
              ))}
              <button className="add-button recommendation-add-button" onClick={() => { setIsRecommendationDialogVisible(true) }}><FontAwesomeIcon icon={faAdd} /></button>
              <ModalDialog isDialogVisible={isRecommendationDialogVisible} onClose={() => setIsRecommendationDialogVisible(false)}>
                <h2>Add Recommendation</h2>
                <form onSubmit={(e) => { e.preventDefault(); }}>
                  <label htmlFor="recommendation-input">Text</label>
                  <input id="recommendation-input" type="text" onChange={handleCurrentRecommendationTextChange} />
                  <label htmlFor="recommendation-related-insights">Related Insights</label>
                  <select id="recommendation-related-insights" onChange={handleCurrentRecommendationRelatedInsightsChange} multiple>
                    {data.insights.map(insight => (<option key={insight.insight_id} value={insight.insight_id}>{insight.text}</option>))}
                  </select>
                </form>
                <button onClick={() => setIsRecommendationDialogVisible(false)}>Close</button>
                <button onClick={() => {
                  const newRecommendation: RecommendationType = {
                    recommendation_id: data.recommendations[data.recommendations.length - 1].recommendation_id + 1,
                    text: currentRecommendationText,
                    related_insights: currentRecommendationRelatedInsights
                  };
                  setData((prevState) => prevState ? ({ ...prevState, recommendations: [...prevState.recommendations, newRecommendation] }) : prevState);
                  setIsRecommendationDialogVisible(false);
                }}>Save</button>
              </ModalDialog>
            </div>
            : ""
        }
        {
          outputRefs ?
            <div className="column outputs">
              <h2>📤Outputs</h2>
              {data.outputs.map((output, index) => (
                <div
                  id={"output-" + output.output_id}
                  ref={el => el ? setOutputRef(el, index) : null}
                  key={output.output_id}
                  className="output-item item"
                  onMouseEnter={() => handleMouseEnter("output", output.output_id, data)}
                  onMouseLeave={() => handleMouseLeave("output", output.output_id, data)}
                >
                  {output.text}
                </div>
              ))}
              <button className="add-button" onClick={() => { setIsOutputDialogVisible(true) }}><FontAwesomeIcon icon={faAdd} /></button>
              <ModalDialog isDialogVisible={isOutputDialogVisible} onClose={() => setIsOutputDialogVisible(false)}>
                <h2>Add Output</h2>
                <form>
                  <label htmlFor="output-text">Text:</label>
                  <input type="text" id="output-text" onChange={handleCurrentOutputTextChange} />
                  <label htmlFor="related-recommendations">Related Recommendations:</label>
                  <select id="related-recommendations" multiple onChange={handleCurrentOutputRelatedRecommendationsChange}>
                    {data.recommendations.map((recommendation, index) => (
                      <option key={index} value={recommendation.recommendation_id}>{recommendation.text}</option>
                    ))}
                  </select>
                </form>
                <button onClick={() => setIsOutputDialogVisible(false)}>Close</button>
                <button onClick={() => {
                  const newOutput: OutputType = {
                    output_id: data.outputs[data.outputs.length - 1].output_id + 1,
                    text: currentOutputText,
                    related_recommendations: currentOutputRelatedRecommendations
                  };
                  setData((prevState) => prevState ? ({ ...prevState, outputs: [...prevState.outputs, newOutput] }) : prevState);
                  setIsOutputDialogVisible(false);
                }}>Save</button>
              </ModalDialog>

            </div>
            : ""
        }
      </main >
    </div >
  );
};

export default App;

