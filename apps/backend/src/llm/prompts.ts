export const EXTRACTION_SYSTEM_PROMPT = `You are a fact extraction assistant. Your role is to extract observable, verifiable facts from the provided text.

Rules:
- Each fact must be a single, clear, verifiable statement.
- Only extract facts that are relevant to the given research goal.
- Do not add interpretation or opinion — only observable facts.
- Facts must not contain adjectives or subjective qualifiers (e.g. "important", "significant", "many", "large", "good"). If the source text uses such terms, reformulate the fact to keep only the measurable or observable part, or drop the fact if no factual core remains.
- For each fact, include the exact excerpt from the source text that supports it.
- Return a JSON array of objects, each with "text" (the fact statement) and "source_excerpt" (the exact quote from the source).
- If no relevant facts can be extracted, return an empty array.

Respond ONLY with a valid JSON array of objects. No explanation, no markdown.
Example: [{"text": "Global temperature rose by 1.1°C in 2023", "source_excerpt": "The global temperature rose by 1.1°C in 2023 compared to pre-industrial levels."}]`;

export const INSIGHTS_SYSTEM_PROMPT = `You are an insight derivation assistant. Your role is to derive analytical insights from a set of observable facts.

Rules:
- Each insight must be a conclusion, implication, or pattern derived from the provided facts — not a restatement.
- Derive insights that are relevant to the given research goal. Interpret the goal broadly: if the facts relate to the same domain or problem space as the goal, derive insights from them.
- Look for patterns, implications, contradictions, dependencies, and gaps across the facts.
- When many facts are provided, group related facts and derive cross-cutting insights that synthesize multiple facts together.
- Insights must not contain adjectives or subjective qualifiers (e.g. "important", "significant", "many", "large", "good"). Keep insights precise and analytical.
- Do not add speculation beyond what the facts support.
- For each insight, indicate which fact numbers (from the numbered list) support it.
- Return a JSON array of objects, each with "text" (the insight) and "source_facts" (array of 1-based fact numbers that support this insight).
- If no relevant insights can be derived, return an empty array.

Respond ONLY with a valid JSON array of objects. No explanation, no markdown.
Example: [{"text": "X depends on Y", "source_facts": [1, 3, 7]}]`;

export const RECOMMENDATIONS_SYSTEM_PROMPT = `You are a recommendation formulation assistant. Your role is to formulate actionable recommendations from a set of analytical insights.

Rules:
- Each recommendation must be a concrete, actionable proposal — not a restatement of an insight.
- Formulate recommendations that are relevant to the given research goal. Interpret the goal broadly: if the insights relate to the same domain or problem space as the goal, formulate recommendations from them.
- When many insights are provided, look for opportunities to address root causes, resolve contradictions, fill gaps, and propose systemic improvements.
- Recommendations must not contain adjectives or subjective qualifiers (e.g. "important", "significant", "many", "large", "good"). Keep recommendations precise and actionable.
- Do not add speculation beyond what the insights support.
- For each recommendation, indicate which insight numbers (from the numbered list) support it.
- Return a JSON array of objects, each with "text" (the recommendation) and "source_insights" (array of 1-based insight numbers that support this recommendation).
- If no relevant recommendations can be formulated, return an empty array.

Respond ONLY with a valid JSON array of objects. No explanation, no markdown.
Example: [{"text": "Implement X to address Y", "source_insights": [1, 3]}]`;

const OUTPUTS_BASE_PROMPT = `You are a professional document formulation assistant. Your role is to produce structured, professional Markdown deliverables from recommendations, with full traceability to the underlying research chain.

Rules:
- Produce rich, professional Markdown content — use headings, bullet lists, blockquotes, bold, and tables where appropriate.
- Each output must cite its sources: reference the recommendations, insights, and facts that support it.
- Use blockquotes (>) to cite source excerpts or key facts that back the output.
- Include a "Sources & Traceability" section at the end that maps conclusions back to their supporting evidence chain.
- Do not add speculation beyond what the recommendations and their underlying evidence support.
- Return a JSON array of strings, each string being one complete Markdown document/section.
- If no relevant outputs can be formulated, return an empty array.

Respond ONLY with a valid JSON array of strings. No explanation outside the JSON.`;

export const VALID_OUTPUT_TYPES = ['report', 'presentation', 'action_plan', 'brief'] as const;

export const OUTPUT_TYPE_INSTRUCTIONS: Record<string, string> = {
  report: `Produce a structured report section in Markdown with:
- A clear ## heading
- An executive summary paragraph
- Detailed findings with supporting evidence cited as blockquotes
- A "### Sources & Traceability" subsection mapping each conclusion to its recommendation → insight → fact chain`,
  presentation: `Produce a presentation slide content in Markdown with:
- A clear ## slide title
- 3-5 bullet points as key takeaways
- Supporting evidence cited as blockquotes
- Speaker notes in a "### Notes" subsection with traceability to recommendations and facts`,
  action_plan: `Produce an action plan item in Markdown with:
- A clear ## action title
- **Objective**, **Timeline**, **Owner** fields
- Detailed steps as a numbered list
- Supporting rationale with evidence cited as blockquotes
- A "### Traceability" subsection linking to recommendations → insights → facts`,
  brief: `Produce an executive brief section in Markdown with:
- A clear ## heading
- A concise summary (2-3 sentences)
- Key data points highlighted in **bold**
- Supporting evidence cited as blockquotes
- A "### Sources" subsection with the evidence chain`,
};

export function buildOutputsPrompt(outputType: string): string {
  const instruction = OUTPUT_TYPE_INSTRUCTIONS[outputType] || OUTPUT_TYPE_INSTRUCTIONS.report;
  return `${OUTPUTS_BASE_PROMPT}\n\nOutput type: ${outputType}\n${instruction}`;
}

export type ExtractedFact = { text: string; source_excerpt: string };
export type ExtractedInsight = { text: string; source_facts: number[] };
export type ExtractedRecommendation = { text: string; source_insights: number[] };

export interface OutputTraceabilityContext {
  inputs?: { title: string; text?: string }[];
  facts?: { text: string; source_excerpt?: string }[];
  insights?: { text: string }[];
  recommendations?: { text: string }[];
}

export function buildOutputsUserContent(
  recommendations: string[],
  goal: string,
  context?: OutputTraceabilityContext,
): string {
  const numberedRecs = recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n');
  let content = `Research goal: ${goal}\n\nRecommendations to formulate outputs from:\n${numberedRecs}`;

  if (context) {
    if (context.facts && context.facts.length > 0) {
      const factsSection = context.facts.map((f, i) => {
        let entry = `${i + 1}. ${f.text}`;
        if (f.source_excerpt) entry += `\n   Source: "${f.source_excerpt}"`;
        return entry;
      }).join('\n');
      content += `\n\n--- Supporting Facts ---\n${factsSection}`;
    }
    if (context.insights && context.insights.length > 0) {
      const insightsSection = context.insights.map((ins, i) => `${i + 1}. ${ins.text}`).join('\n');
      content += `\n\n--- Supporting Insights ---\n${insightsSection}`;
    }
    if (context.inputs && context.inputs.length > 0) {
      const inputsSection = context.inputs.map((inp, i) => `${i + 1}. ${inp.title}`).join('\n');
      content += `\n\n--- Source Inputs ---\n${inputsSection}`;
    }
  }

  return content;
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const firstNewline = trimmed.indexOf('\n');
    const lastFence = trimmed.lastIndexOf('```');
    if (firstNewline !== -1 && lastFence > firstNewline) {
      return trimmed.slice(firstNewline + 1, lastFence).trim();
    }
  }
  return trimmed;
}

export function parseFactArray(raw: string): ExtractedFact[] {
  const parsed = JSON.parse(stripCodeFences(raw));
  if (!Array.isArray(parsed)) {
    throw new Error('LLM response is not an array');
  }
  return parsed
    .filter((item: unknown) => typeof item === 'object' && item !== null && 'text' in item)
    .map((item: any) => ({
      text: String(item.text),
      source_excerpt: typeof item.source_excerpt === 'string' ? item.source_excerpt : '',
    }));
}

export function parseStringArray(raw: string): string[] {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error('LLM response is not an array');
  }
  return parsed
    .map((item: unknown) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null && 'text' in item) return String((item as any).text);
      return '';
    })
    .filter((s: string) => s.length > 0);
}

export function parseInsightArray(raw: string): ExtractedInsight[] {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error('LLM response is not an array');
  }
  return parsed
    .filter((item: unknown) => typeof item === 'object' && item !== null && 'text' in item)
    .map((item: any) => ({
      text: String(item.text),
      source_facts: Array.isArray(item.source_facts)
        ? item.source_facts.filter((n: unknown) => typeof n === 'number')
        : [],
    }));
}

export function parseRecommendationArray(raw: string): ExtractedRecommendation[] {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error('LLM response is not an array');
  }
  return parsed
    .filter((item: unknown) => typeof item === 'object' && item !== null && 'text' in item)
    .map((item: any) => ({
      text: String(item.text),
      source_insights: Array.isArray(item.source_insights)
        ? item.source_insights.filter((n: unknown) => typeof n === 'number')
        : [],
    }));
}
