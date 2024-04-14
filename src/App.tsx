import React, { useState, useEffect } from 'react';
import './App.css';

// Define types for the data structure
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
    goal:string;
    date: string;
    inputs: InputType[];
    facts: FactType[];
    insights: InsightType[];
    recommendations: RecommendationType[];
    outputs: OutputType[];
  };
  

// Main App Component
const App: React.FC = () => {
  const [data, setData] = useState<DiscoveryData | null>(null);
  const [inputRefs, setInputRefs] = useState<React.RefObject<HTMLDivElement>[] | null>(null);
  const [factRefs, setFactRefs] = useState<React.RefObject<HTMLDivElement>[] | null>(null);
  const [insightRefs, setInsightRefs] = useState<React.RefObject<HTMLDivElement>[] | null>(null);
  const [recommendationRefs, setRecommendationRefs] = useState<React.RefObject<HTMLDivElement>[] | null>(null);
  const [outputRefs, setOutputRefs] = useState<React.RefObject<HTMLDivElement>[] | null>(null);

  const calculateAndDrawLines = (
        data: DiscoveryData,
        inputRefs:React.RefObject<HTMLDivElement>[],
        factRefs:React.RefObject<HTMLDivElement>[],
        insightRefs:React.RefObject<HTMLDivElement>[],
        recommendationRefs:React.RefObject<HTMLDivElement>[],
        outputRefs:React.RefObject<HTMLDivElement>[]

    ) => {
    // Clear existing lines
    const existingLines = document.querySelectorAll('.line');
    existingLines.forEach(line => line.remove());
  
    // Create lines from inputs to their related facts
    data.facts.forEach((fact, factIndex) => {
      if (factRefs[factIndex].current) {
        // Get the bounding rectangle of the current fact element.
        // This provides information such as the size of the element and its position relative to the viewport.
        const factRect = factRefs[factIndex].current!.getBoundingClientRect();
        
        
        fact.related_inputs.forEach(relatedInputId => {
            const inputIndex = data.inputs.findIndex(input => input.input_id === relatedInputId);
            const inputRef = inputRefs[inputIndex];
            
            if (inputRef.current) {
              const inputRect = inputRef.current.getBoundingClientRect();
              
              // Calculate start and end points for the line
              const startX = inputRect.right;
              const startY = inputRect.top + inputRect.height / 2;
              const endX = factRect.left;
              const endY = factRect.top + factRect.height / 2;
      
              // Create a line and append it to the body
              createLine(startX, startY, endX, endY);
            }
        });
      }
    });

    data.insights.forEach((insight, insightIndex) => {
        if (insightRefs[insightIndex].current) {
          const insightRect = insightRefs[insightIndex].current!.getBoundingClientRect();
          
          insight.related_facts.forEach(relatedFactId => {
            // Find the related fact for this insight
            const factIndex = data.facts.findIndex(fact => fact.fact_id === relatedFactId);
            const factRef = factRefs[factIndex];
            
            if (factRef.current) {
                const factRect = factRef.current.getBoundingClientRect();
                
                // Calculate start and end points for the line
                const startX = factRect.right;
                const startY = factRect.top + factRect.height / 2;
                const endX = insightRect.left;
                const endY = insightRect.top + insightRect.height / 2;
        
                // Create a line and append it to the body
                createLine(startX, startY, endX, endY);
            }
          });
        }
    });
    
    data.recommendations.forEach((recommendation, recommendationIndex) => {
        if (recommendationRefs[recommendationIndex].current) {
            const recommendationRect = recommendationRefs[recommendationIndex].current!.getBoundingClientRect();
            
            recommendation.related_insights.forEach(relatedInsightId => {
            // Find the related fact for this recommendation
                const insightIndex = data.insights.findIndex(insight => insight.insight_id === relatedInsightId);
                const insightRef = insightRefs[insightIndex];
                
                if (insightRef.current) {
                const insightRect = insightRef.current.getBoundingClientRect();
                
                // Calculate start and end points for the line
                const startX = insightRect.right;
                const startY = insightRect.top + insightRect.height / 2;
                const endX = recommendationRect.left;
                const endY = recommendationRect.top + recommendationRect.height / 2;
        
                // Create a line and append it to the body
                createLine(startX, startY, endX, endY);
                }
            });
        }
    });

    data.outputs.forEach((output, outputIndex) => {
        if (outputRefs[outputIndex].current) {
            const outputRect = outputRefs[outputIndex].current!.getBoundingClientRect();
            
            output.related_recommendations.forEach(relatedRecommendationId => {
                // Find the related fact for this output
                const recommendationIndex = data.recommendations.findIndex(recommendation => recommendation.recommendation_id === relatedRecommendationId);
                const recommendationRef = recommendationRefs[recommendationIndex];
                
                if (recommendationRef.current) {
                const recommendationRect = recommendationRef.current.getBoundingClientRect();
                
                // Calculate start and end points for the line
                const startX = recommendationRect.right;
                const startY = recommendationRect.top + recommendationRect.height / 2;
                const endX = outputRect.left;
                const endY = outputRect.top + outputRect.height / 2;
        
                // Create a line and append it to the body
                createLine(startX, startY, endX, endY);
                }
            });
        }
    });
  };
  
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
    // Load the data from the public folder
    fetch('/data.json')
      .then((response) => response.json())
      .then((data: DiscoveryData) => setData(data));
  }, []);

  useEffect(() => {
    // This effect runs after the component mounts and whenever data changes
    if (data) {
        setInputRefs(data.inputs.map(() => React.createRef<HTMLDivElement>()));
        setFactRefs(data.facts.map(() => React.createRef<HTMLDivElement>()));
        setInsightRefs(data.insights.map(() => React.createRef<HTMLDivElement>()));
        setRecommendationRefs(data.recommendations.map(() => React.createRef<HTMLDivElement>()));
        setOutputRefs(data.outputs.map(() => React.createRef<HTMLDivElement>()));
        if ( inputRefs && factRefs && insightRefs && recommendationRefs && outputRefs) {
            calculateAndDrawLines(data, inputRefs, factRefs, insightRefs, recommendationRefs, outputRefs);
            const handleResize = () => {
                // Re-calculate and draw lines
                calculateAndDrawLines(data, inputRefs, factRefs, insightRefs, recommendationRefs, outputRefs);
            };

            window.addEventListener('resize', handleResize);
            return() => {
                window.removeEventListener('resize', handleResize);
            }
        }
    }

    // Optional: Clean-up function if you need to remove lines before redrawing
    return () => {
      // Remove existing lines from the document
      const existingLines = document.querySelectorAll('.line');
      existingLines.forEach(line => line.remove());
    };
  }, [data, factRefs, inputRefs, insightRefs, outputRefs, recommendationRefs]); // Depend on data changing

  // Render the app components only if data is loaded
  if (!data) return <div>Loading...</div>;

  return (
    <div className="App">
      <header className='discovery-header'>
        <span>{data.date}</span>
        <h1>{data.title}</h1>
        <span>{data.goal}</span>
      </header>
      <main className="discovery-grid">
      { inputRefs ?
        <div className="column inputs">
          <h2>Inputs</h2>
          {data.inputs.map((input, index) => (
            <div 
                ref={inputRefs[index]} 
                key={input.input_id} 
                className="input-item item" 
                onClick={() => window.open(input.url, '_blank', 'noopener')}>
                {input.title} (Type: {input.type})
            </div>
          ))}
          <button className="add-button" onClick={() => {/* Handle add input */}}>+</button>
        </div>
        : ""} 
        { factRefs ?
        <div className="column facts">
            <h2>Facts</h2>
          {data.facts.map((fact, index) => (
            <div ref={factRefs[index]} key={fact.fact_id} className="fact-item item">
              {fact.text}
            </div>
          ))}
          <button className="add-button" onClick={() => {/* Handle add input */}}>+</button>
        </div>
        : ""}
        { insightRefs ? 
        <div className="column insights">
            <h2>Insights</h2>
          {data.insights.map((insight, index) => (
            <div ref={insightRefs[index]} key={insight.insight_id} className="insight-item item">
              {insight.text}
            </div>
          ))}
          <button className="add-button" onClick={() => {/* Handle add input */}}>+</button>
        </div>
        : ""}
        { recommendationRefs ?           
        <div className="column recommendations">
            <h2>Recommendations</h2>
          {data.recommendations.map((recommendation, index) => (
            <div ref={recommendationRefs[index]} key={recommendation.recommendation_id} className="recommendation-item item">
              {recommendation.text}
            </div>
          ))}
          <button className="add-button" onClick={() => {/* Handle add input */}}>+</button>
        </div>
        : ""}
        { outputRefs ?
        <div className="column outputs">
            <h2>Outputs</h2>
          {data.outputs.map((output, index) => (
            <div ref={outputRefs[index]} key={output.output_id} className="output-item item">
              {output.text}
            </div>
          ))}
          <button className="add-button" onClick={() => {/* Handle add input */}}>+</button>
        </div>
        : ""}
      </main>
    </div>
  );
};

export default App;
