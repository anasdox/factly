import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import InputList from './components/InputList';
import FactList from './components/FactList';
import InsightList from './components/InsightList';
import RecommendationList from './components/RecommendationList';
import OutputList from './components/OutputList';
import { useCalculateAndDrawLines } from './components/Lines';
import { handleMouseEnter, handleMouseLeave } from './lib';
import ToolBar from './components/Toolbar';

const App: React.FC = () => {
  const [data, setData] = useState<DiscoveryData | null>(null);
  const inputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const factRefs = useRef<(HTMLDivElement | null)[]>([]);
  const insightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const recommendationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const outputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const calculateAndDrawLines = useCalculateAndDrawLines();

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
        <ToolBar
          data={data}
          setData={setData}
        />
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

