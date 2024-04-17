import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload } from '@fortawesome/free-solid-svg-icons';
import { faFileDownload } from '@fortawesome/free-solid-svg-icons';
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



  const factRefs = useRef<(HTMLDivElement | null)[]>([]);
  const insightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const recommendationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const outputRefs = useRef<(HTMLDivElement | null)[]>([]);

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

            createLine(startX, startY, endX, endY);
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

            createLine(startX, startY, endX, endY);
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

            createLine(startX, startY, endX, endY);
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

            createLine(startX, startY, endX, endY);
          }
        });
      }
    });
  }, []);

  const createLine = (startX: number, startY: number, endX: number, endY: number) => {
    const line = document.createElement('div');
    line.classList.add('line');

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
        <h1>{data.title}</h1>
        <div><span>{data.date} {'>'} {data.goal}</span></div>
        <div className="toolbar">
          <label htmlFor="file-input" className="toolbar-button">
            <FontAwesomeIcon icon={faUpload} />
          </label>
          <input
            id="file-input"
            type="file"
            accept=".json"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          <button onClick={handleExport} className="toolbar-button">
            <FontAwesomeIcon icon={faFileDownload} />
          </button>
        </div>
      </header>
      <main className="discovery-grid">
        {inputRefs ?
          <div className="column inputs">
            <h2>Inputs</h2>
            {data.inputs.map((input, index) => (
              <div
                ref={el => el ? setInputRef(el, index) : null}
                key={input.input_id}
                className="input-item item"
                onClick={() => window.open(input.url, '_blank', 'noopener')}>
                {input.title} (Type: {input.type})
              </div>
            ))}
            <button className="add-button" onClick={
              () => {
                setIsInputDialogVisible(true)
              }}> +</button >
              <ModalDialog isDialogVisible={isInputDialogVisible} closeDialog={() => setIsInputDialogVisible(false)}>
                <form>
                  <label htmlFor="input-title">Title</label>
                  <input id="input-title" type="text" value={currentInputTitle} onChange={ handleCurrentInputTitleChange}/>
                  <label htmlFor="input-url">URL</label>
                  <input id="input-url" type="text" value={currentInputUrl} onChange={ handleCurrentInputUrlChange}/>
                  <label htmlFor="input-type">Type</label>
                  <select id="input-type" value={currentInputType} onChange={ handleCurrentInputTypeChange}>
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="document">Document</option>
                    <option value="other">Other</option>
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
                }}>Add</button>

              </ModalDialog>
          </div >

          : ""}
        {
          factRefs ?
            <div className="column facts">
              <h2>Facts</h2>
              {data.facts.map((fact, index) => (
                <div
                  ref={el => el ? setFactRef(el, index) : null}
                  key={fact.fact_id}
                  className="fact-item item">
                  {fact.text}
                </div>
              ))}
              <button className="add-button" onClick={() => {/* Handle add input */ }}>+</button>
            </div>
            : ""
        }
        {
          insightRefs ?
            <div className="column insights">
              <h2>Insights</h2>
              {data.insights.map((insight, index) => (
                <div
                  ref={el => el ? setInsightRef(el, index) : null}
                  key={insight.insight_id}
                  className="insight-item item">
                  {insight.text}
                </div>
              ))}
              <button className="add-button" onClick={() => {/* Handle add input */ }}>+</button>
            </div>
            : ""
        }
        {
          recommendationRefs ?
            <div className="column recommendations">
              <h2>Recommendations</h2>
              {data.recommendations.map((recommendation, index) => (
                <div
                  ref={el => el ? setRecommendationRef(el, index) : null}
                  key={recommendation.recommendation_id}
                  className="recommendation-item item">
                  {recommendation.text}
                </div>
              ))}
              <button className="add-button" onClick={() => {/* Handle add input */ }}>+</button>
            </div>
            : ""
        }
        {
          outputRefs ?
            <div className="column outputs">
              <h2>Outputs</h2>
              {data.outputs.map((output, index) => (
                <div
                  ref={el => el ? setOutputRef(el, index) : null}
                  key={output.output_id}
                  className="output-item item">
                  {output.text}
                </div>
              ))}
              <button className="add-button" onClick={() => {/* Handle add input */ }}>+</button>
            </div>
            : ""
        }
      </main >
    </div >
  );
};

export default App;

