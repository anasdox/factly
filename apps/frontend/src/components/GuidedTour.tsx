import React, { useState, useEffect, useRef, useCallback } from 'react';
import { handleMouseEnter, handleMouseLeave } from '../lib';
import './GuidedTour.css';

type TourStep = {
  target: string;
  title: string;
  content: string;
  passiveContent?: string;
  actionRequired: boolean;
  advancesOn?: 'facts' | 'insights' | 'recommendations' | 'outputs';
};

const TOUR_STEPS: TourStep[] = [
  {
    target: '.discovery-header',
    title: 'Your Discovery',
    content: 'This is an example discovery analyzing customer churn. The title and goal guide your analysis. Let\'s walk through the full process together.',
    actionRequired: false,
  },
  {
    target: '.column.inputs',
    title: 'Step 1: Inputs',
    content: 'These are your raw sources. You have two survey-related inputs ready to analyze. Let\'s extract facts from the first one.',
    passiveContent: 'These are your raw sources — texts, URLs, or documents you want to analyze. Each input feeds into the next step.',
    actionRequired: false,
  },
  {
    target: '#input-ex-input-1',
    title: 'Extract Facts',
    content: 'Click the wand icon on this input to extract facts using AI.',
    passiveContent: 'In this example, facts have already been extracted from the inputs. Hover over an input to see which facts it produced.',
    actionRequired: true,
    advancesOn: 'facts',
  },
  {
    target: '.column.facts',
    title: 'Step 2: Facts',
    content: 'Great! AI extracted verified facts from your input. Each fact links back to its source. Now select all facts and click "Generate Insights".',
    passiveContent: 'Facts are verified statements extracted from your inputs. Each fact links back to its source. Select facts and click "Generate Insights" to find patterns.',
    actionRequired: true,
    advancesOn: 'insights',
  },
  {
    target: '.column.insights',
    title: 'Step 3: Insights',
    content: 'Insights identify patterns across your facts. Now select all insights and click "Generate Recommendations".',
    passiveContent: 'Insights identify patterns and meaning across multiple facts. Select insights and click "Generate Recommendations" to get action items.',
    actionRequired: true,
    advancesOn: 'recommendations',
  },
  {
    target: '.column.recommendations',
    title: 'Step 4: Recommendations',
    content: 'These are concrete action items. Select all recommendations, choose an output type, and click "Formulate Outputs".',
    passiveContent: 'Recommendations are concrete action items derived from your insights. Select them, choose an output type, and click "Formulate Outputs".',
    actionRequired: true,
    advancesOn: 'outputs',
  },
  {
    target: '.column.outputs',
    title: 'Step 5: Outputs',
    content: 'Your deliverable is ready! Every item traces back to its source. Hover over any item or click the tree icon to explore the full chain.',
    passiveContent: 'Outputs are your final deliverables — reports, action plans, or briefs. Every item traces back through the full chain. Hover over any item to see its connections.',
    actionRequired: false,
  },
  {
    target: '.toolbar',
    title: 'Your Turn!',
    content: 'You\'ve completed the full FIR process. Click the + icon to create your own discovery, or keep exploring this one.',
    actionRequired: false,
  },
];

type GuidedTourProps = {
  mode: 'interactive' | 'passive';
  data: DiscoveryData;
  onClose: () => void;
};

const SPOTLIGHT_PAD = 8;

const GuidedTour: React.FC<GuidedTourProps> = ({ mode, data, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const prevDataRef = useRef({
    facts: data.facts.length,
    insights: data.insights.length,
    recommendations: data.recommendations.length,
    outputs: data.outputs.length,
  });

  const step = TOUR_STEPS[currentStep];
  const isInteractive = mode === 'interactive';
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const nextDisabled = isInteractive && step.actionRequired;

  const positionSpotlight = useCallback(() => {
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);
    }
  }, [step.target]);

  // Position spotlight when step changes or on resize
  useEffect(() => {
    positionSpotlight();
    window.addEventListener('resize', positionSpotlight);
    window.addEventListener('scroll', positionSpotlight);
    return () => {
      window.removeEventListener('resize', positionSpotlight);
      window.removeEventListener('scroll', positionSpotlight);
    };
  }, [positionSpotlight]);

  // Reposition spotlight periodically to handle layout shifts (e.g. data loading)
  useEffect(() => {
    const interval = setInterval(positionSpotlight, 500);
    return () => clearInterval(interval);
  }, [positionSpotlight]);

  // Position tooltip relative to spotlight
  useEffect(() => {
    if (!spotlightRect || !tooltipRef.current) return;
    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Preferred: below the spotlight
    let top = spotlightRect.bottom + SPOTLIGHT_PAD + 12;
    let left = spotlightRect.left + spotlightRect.width / 2 - tooltipRect.width / 2;

    // If tooltip would go below viewport, place above
    if (top + tooltipRect.height > viewportH - 16) {
      top = spotlightRect.top - SPOTLIGHT_PAD - tooltipRect.height - 12;
    }

    // If still out of bounds (above), clamp to top
    if (top < 16) top = 16;

    // Clamp left to viewport
    if (left < 16) left = 16;
    if (left + tooltipRect.width > viewportW - 16) {
      left = viewportW - tooltipRect.width - 16;
    }

    setTooltipPos({ top, left });
  }, [spotlightRect, currentStep]);

  // Auto-advance when data changes (interactive mode, steps 3-6)
  useEffect(() => {
    if (!isInteractive) return;
    const prev = prevDataRef.current;
    const stepDef = TOUR_STEPS[currentStep];

    if (stepDef.advancesOn === 'facts' && data.facts.length > prev.facts) {
      setCurrentStep(s => s + 1);
    } else if (stepDef.advancesOn === 'insights' && data.insights.length > prev.insights) {
      setCurrentStep(s => s + 1);
    } else if (stepDef.advancesOn === 'recommendations' && data.recommendations.length > prev.recommendations) {
      setCurrentStep(s => s + 1);
    } else if (stepDef.advancesOn === 'outputs' && data.outputs.length > prev.outputs) {
      setCurrentStep(s => s + 1);
    }

    prevDataRef.current = {
      facts: data.facts.length,
      insights: data.insights.length,
      recommendations: data.recommendations.length,
      outputs: data.outputs.length,
    };
  }, [data, currentStep, isInteractive]);

  // Passive mode: trigger traceability highlighting on relevant steps
  useEffect(() => {
    if (isInteractive) return;

    // Steps 3-6 in passive mode: highlight items to show traceability
    if (currentStep === 2 && data.inputs.length > 0) {
      handleMouseEnter('input', data.inputs[0].input_id, data);
      return () => { handleMouseLeave('input', data.inputs[0].input_id, data); };
    }
    if (currentStep === 3 && data.facts.length > 0) {
      handleMouseEnter('fact', data.facts[0].fact_id, data);
      return () => { handleMouseLeave('fact', data.facts[0].fact_id, data); };
    }
    if (currentStep === 4 && data.insights.length > 0) {
      handleMouseEnter('insight', data.insights[0].insight_id, data);
      return () => { handleMouseLeave('insight', data.insights[0].insight_id, data); };
    }
    if (currentStep === 5 && data.recommendations.length > 0) {
      handleMouseEnter('recommendation', data.recommendations[0].recommendation_id, data);
      return () => { handleMouseLeave('recommendation', data.recommendations[0].recommendation_id, data); };
    }
  }, [currentStep, isInteractive, data]);

  // Show the wand toolbar for step 3 in interactive mode
  useEffect(() => {
    if (isInteractive && currentStep === 2) {
      const toolbar = document.getElementById('input-ex-input-1-toolbar');
      if (toolbar) {
        toolbar.style.display = 'flex';
        return () => { toolbar.style.display = ''; };
      }
    }
  }, [currentStep, isInteractive]);

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const content = (!isInteractive && step.passiveContent) ? step.passiveContent : step.content;
  const nextLabel = isLastStep ? 'Finish' : (nextDisabled ? 'Waiting...' : 'Next');

  return (
    <>
      {spotlightRect && (
        <div
          className="tour-spotlight"
          style={{
            top: spotlightRect.top - SPOTLIGHT_PAD,
            left: spotlightRect.left - SPOTLIGHT_PAD,
            width: spotlightRect.width + SPOTLIGHT_PAD * 2,
            height: spotlightRect.height + SPOTLIGHT_PAD * 2,
          }}
        />
      )}
      <div
        className="tour-tooltip"
        ref={tooltipRef}
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <div className="tour-tooltip-title">{step.title}</div>
        <div className="tour-tooltip-content">{content}</div>
        <div className="tour-tooltip-footer">
          <span className="tour-step-indicator">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>
          <div className="tour-tooltip-actions">
            <button className="tour-btn-skip" onClick={onClose}>Skip</button>
            <button
              className="tour-btn-next"
              onClick={handleNext}
              disabled={nextDisabled}
            >
              {nextLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuidedTour;
