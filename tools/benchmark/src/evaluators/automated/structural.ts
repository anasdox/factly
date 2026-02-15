import { MetricScore } from '../types';

export function evaluateMarkdownStructure(text: string, outputType: string): MetricScore[] {
  const metrics: MetricScore[] = [];

  // Check for headings
  const hasHeadings = /^#{1,3}\s+.+/m.test(text);
  metrics.push({ name: 'has_headings', value: hasHeadings ? 1 : 0, type: 'auto' });

  // Check for blockquotes (citations)
  const blockquoteCount = (text.match(/^>\s+.+/gm) || []).length;
  metrics.push({ name: 'blockquote_count', value: blockquoteCount, type: 'auto' });
  metrics.push({ name: 'has_citations', value: blockquoteCount > 0 ? 1 : 0, type: 'auto' });

  // Check for sections (multiple headings)
  const headingCount = (text.match(/^#{1,3}\s+.+/gm) || []).length;
  metrics.push({ name: 'section_count', value: headingCount, type: 'auto' });

  // Check for bullet points
  const hasBullets = /^[-*]\s+.+/m.test(text);
  metrics.push({ name: 'has_bullets', value: hasBullets ? 1 : 0, type: 'auto' });

  // Type-specific checks
  if (outputType === 'action_plan') {
    const hasNumberedList = /^\d+\.\s+.+/m.test(text);
    metrics.push({ name: 'has_numbered_steps', value: hasNumberedList ? 1 : 0, type: 'auto' });
  }

  // Overall structural score
  const structuralChecks = [hasHeadings, blockquoteCount > 0, headingCount >= 2];
  const structuralScore = structuralChecks.filter(Boolean).length / structuralChecks.length;
  metrics.push({ name: 'structural_score', value: structuralScore, type: 'auto' });

  return metrics;
}
