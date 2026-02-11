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
  interactiveSelector?: string;
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
    interactiveSelector: '#input-ex-input-1',
  },
  {
    target: '.column.facts',
    title: 'Step 2: Facts',
    content: 'Great! AI extracted verified facts from your input. Each fact links back to its source. Now select all facts and click "Generate Insights".',
    passiveContent: 'Facts are verified statements extracted from your inputs. Each fact links back to its source. Select facts and click "Generate Insights" to find patterns.',
    actionRequired: true,
    advancesOn: 'insights',
    interactiveSelector: '.column.facts',
  },
  {
    target: '.column.insights',
    title: 'Step 3: Insights',
    content: 'Insights identify patterns across your facts. Now select all insights and click "Generate Recommendations".',
    passiveContent: 'Insights identify patterns and meaning across multiple facts. Select insights and click "Generate Recommendations" to get action items.',
    actionRequired: true,
    advancesOn: 'recommendations',
    interactiveSelector: '.column.insights',
  },
  {
    target: '.column.recommendations',
    title: 'Step 4: Recommendations',
    content: 'These are concrete action items. Select all recommendations, choose an output type, and click "Formulate Outputs".',
    passiveContent: 'Recommendations are concrete action items derived from your insights. Select them, choose an output type, and click "Formulate Outputs".',
    actionRequired: true,
    advancesOn: 'outputs',
    interactiveSelector: '.column.recommendations',
  },
  {
    target: '.column.outputs',
    title: 'Step 5: Outputs',
    content: 'Your deliverable is ready! Click on an output to preview it, or hover over items and click the tree icon to explore the full traceability chain.',
    passiveContent: 'Outputs are your final deliverables — reports, action plans, or briefs. Click on an output to preview it, or hover over any item to see its connections.',
    actionRequired: false,
    interactiveSelector: '.column.outputs',
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
    const margin = 16;
    const gap = SPOTLIGHT_PAD + 12;

    const centeredLeft = spotlightRect.left + spotlightRect.width / 2 - tooltipRect.width / 2;
    const centeredTop = spotlightRect.top + spotlightRect.height / 2 - tooltipRect.height / 2;

    const candidates = [
      { top: spotlightRect.bottom + gap, left: centeredLeft }, // below
      { top: spotlightRect.top - gap - tooltipRect.height, left: centeredLeft }, // above
      { top: centeredTop, left: spotlightRect.right + gap }, // right
      { top: centeredTop, left: spotlightRect.left - gap - tooltipRect.width }, // left
    ];

    const fitsViewport = (top: number, left: number) =>
      top >= margin &&
      left >= margin &&
      top + tooltipRect.height <= viewportH - margin &&
      left + tooltipRect.width <= viewportW - margin;

    const forbiddenRects: Array<{ top: number; left: number; right: number; bottom: number }> = [
      {
        top: spotlightRect.top - 4,
        left: spotlightRect.left - 4,
        right: spotlightRect.right + 4,
        bottom: spotlightRect.bottom + 4,
      },
    ];

    const suggestionsPanel = document.querySelector('.suggestions-panel');
    if (suggestionsPanel) {
      const panelRect = suggestionsPanel.getBoundingClientRect();
      forbiddenRects.push({
        top: panelRect.top - 8,
        left: panelRect.left - 8,
        right: panelRect.right + 8,
        bottom: panelRect.bottom + 8,
      });
    }

    const overlapsForbidden = (top: number, left: number) => {
      const right = left + tooltipRect.width;
      const bottom = top + tooltipRect.height;
      return forbiddenRects.some((rect) =>
        !(
          right < rect.left ||
          left > rect.right ||
          bottom < rect.top ||
          top > rect.bottom
        ),
      );
    };

    let chosen = candidates.find(
      (candidate) => fitsViewport(candidate.top, candidate.left) && !overlapsForbidden(candidate.top, candidate.left),
    );

    if (!chosen) {
      // Fallback: clamp the below position to viewport
      let top = candidates[0].top;
      let left = candidates[0].left;

      if (top + tooltipRect.height > viewportH - margin) {
        top = viewportH - tooltipRect.height - margin;
      }
      if (top < margin) top = margin;
      if (left < margin) left = margin;
      if (left + tooltipRect.width > viewportW - margin) {
        left = viewportW - tooltipRect.width - margin;
      }

      chosen = { top, left };
    }

    setTooltipPos({ top: chosen.top, left: chosen.left });
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

  // Elevate only the interactive area for the current step
  useEffect(() => {
    const selector = isInteractive ? step.interactiveSelector : undefined;
    if (!selector) return;
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add('tour-step-interactive');
    return () => { el.classList.remove('tour-step-interactive'); };
  }, [currentStep, isInteractive, step.interactiveSelector]);

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
      <div className="tour-blocker" />
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
