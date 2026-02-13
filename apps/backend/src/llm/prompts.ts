export const EXTRACTION_SYSTEM_PROMPT = `You are a fact extraction assistant. Your role is to extract observable, verifiable facts from the provided text.

Rules:
- Each fact must be a single, clear, verifiable statement.
- Extract facts that are relevant to the given research goal. Interpret the goal broadly: if the text relates to the same domain or problem space as the goal, extract facts from it.
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
- A clear # heading
- An executive summary paragraph
- Detailed findings with supporting evidence cited as blockquotes
- A "### Sources & Traceability" subsection mapping each conclusion to its recommendation → insight → fact chain`,
  presentation: `Produce a presentation slide content in Markdown with:
- A clear # slide title
- 3-5 bullet points as key takeaways
- Supporting evidence cited as blockquotes
- Speaker notes in a "### Notes" subsection with traceability to recommendations and facts`,
  action_plan: `Produce an action plan item in Markdown with:
- A clear # action title
- **Objective**, **Timeline**, **Owner** fields
- Detailed steps as a numbered list
- Supporting rationale with evidence cited as blockquotes
- A "### Traceability" subsection linking to recommendations → insights → facts`,
  brief: `Produce an executive brief section in Markdown with:
- A clear # heading
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

// ── Deduplication prompts ──

export const DEDUP_CHECK_SYSTEM_PROMPT = `You are a semantic similarity assistant. Your role is to identify which candidate texts make the same factual claim as a given text, even if worded completely differently.

Rules:
- Compare the given text against each numbered candidate.
- Two texts are duplicates if they describe the same underlying fact, event, or claim — regardless of wording, phrasing, number format (e.g. "one third" vs "33%" vs "31%"), or level of detail.
- Focus on whether the core assertion is the same, not on surface-level wording similarity.
- Return candidates with similarity above 0.75.
- For each match, provide a similarity score (0.0–1.0) and a brief explanation of why they convey the same claim.
- Return a JSON array of objects, each with "index" (1-based candidate number), "similarity" (number), and "explanation" (string).
- If no candidates make the same claim, return an empty array.

Respond ONLY with a valid JSON array. No explanation, no markdown.
Example: [{"index": 1, "similarity": 0.90, "explanation": "Both state that roughly a third of churned customers switched to cheaper competitors"}]`;

export const DEDUP_SCAN_SYSTEM_PROMPT = `You are a semantic grouping assistant. Your role is to identify groups of items that make the same factual claim, even if worded completely differently.

Rules:
- Examine all numbered items and group those that describe the same underlying fact, event, or claim.
- Focus on whether the core assertion is the same, not on surface-level wording. Treat equivalent number formats (e.g. "one third" vs "33%" vs "31%"), synonyms, and paraphrases as the same claim.
- Each group must contain at least 2 items.
- Items that are unique (no close match) should not appear in any group.
- Return a JSON array of group objects, each with "indices" (array of 1-based item numbers) and "explanation" (string describing the shared claim).
- If no groups are found, return an empty array.

Respond ONLY with a valid JSON array. No explanation, no markdown.
Example: [{"indices": [1, 3], "explanation": "Both state that roughly a third of churned customers switched to cheaper competitors"}]`;

export const UPDATE_PROPOSAL_SYSTEM_PROMPT = `You are an update assistant. Your role is to propose an updated version of a downstream entity after an upstream change in a research discovery pipeline.

Rules:
- You will receive the current entity text, the upstream change (before and after), and the research goal.
- Propose an updated version of the entity that is consistent with the new upstream text.
- Preserve the style, tone, and level of detail of the original entity text.
- If the entity is still valid despite the upstream change, return the original text unchanged and explain why no update is needed.
- Return a JSON object with "proposed_text" (string) and "explanation" (string describing what changed and why).

Respond ONLY with a valid JSON object. No explanation outside the JSON, no markdown fences.
Example: {"proposed_text": "Updated fact text here", "explanation": "Updated to reflect the new data from the upstream source."}`;

export function buildDedupCheckUserContent(text: string, candidates: { id: string; text: string }[]): string {
  const numbered = candidates.map((c, i) => `${i + 1}. ${c.text}`).join('\n');
  return `Text to check:\n${text}\n\nCandidates:\n${numbered}`;
}

export function buildDedupScanUserContent(items: { id: string; text: string }[]): string {
  return items.map((item, i) => `${i + 1}. ${item.text}`).join('\n');
}

export function buildUpdateProposalUserContent(
  entityType: string,
  currentText: string,
  upstreamOldText: string,
  upstreamNewText: string,
  upstreamEntityType: string,
  goal: string,
): string {
  return `Research goal: ${goal}

The following upstream ${upstreamEntityType} was changed:
BEFORE: ${upstreamOldText}
AFTER: ${upstreamNewText}

The following ${entityType} depends on it and may need updating:
${currentText}

Propose an updated version of this ${entityType} that is consistent with the upstream change.`;
}

export type DedupResult = { id: string; similarity: number; explanation: string };
export type DedupGroup = { items: { id: string; text: string }[]; explanation: string };
export type UpdateProposal = { proposed_text: string; explanation: string };
export type ImpactCheckResult = { id: string; impacted: boolean; explanation: string };

export function parseDedupCheckResult(raw: string, candidates: { id: string; text: string }[]): DedupResult[] {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item: any) => typeof item === 'object' && item !== null && typeof item.index === 'number')
    .map((item: any) => {
      const idx = item.index - 1;
      if (idx < 0 || idx >= candidates.length) return null;
      return {
        id: candidates[idx].id,
        similarity: typeof item.similarity === 'number' ? item.similarity : 0.9,
        explanation: typeof item.explanation === 'string' ? item.explanation : '',
      };
    })
    .filter((r: DedupResult | null): r is DedupResult => r !== null);
}

export function parseDedupScanResult(raw: string, items: { id: string; text: string }[]): DedupGroup[] {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((g: any) => typeof g === 'object' && g !== null && Array.isArray(g.indices) && g.indices.length >= 2)
    .map((g: any) => ({
      items: g.indices
        .filter((idx: number) => idx >= 1 && idx <= items.length)
        .map((idx: number) => items[idx - 1]),
      explanation: typeof g.explanation === 'string' ? g.explanation : '',
    }))
    .filter((g: DedupGroup) => g.items.length >= 2);
}

export function parseUpdateProposal(raw: string): UpdateProposal {
  const cleaned = stripCodeFences(raw);
  try {
    const parsed = JSON.parse(cleaned);
    return {
      proposed_text: typeof parsed.proposed_text === 'string' ? parsed.proposed_text : cleaned,
      explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
    };
  } catch {
    return { proposed_text: cleaned, explanation: '' };
  }
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

// ── Impact check prompts ──

export const IMPACT_CHECK_SYSTEM_PROMPT = `You are a semantic impact analysis assistant. Your role is to determine which downstream entities are semantically impacted by an upstream text change.

Rules:
- You will receive the old and new text of an upstream entity, plus a list of candidate downstream entities.
- First, identify the SPECIFIC semantic difference between BEFORE and AFTER. Focus on what information was added, removed, or modified — ignore unchanged parts.
- For each candidate, decide whether that specific change affects the candidate's meaning, validity, or accuracy.
- A candidate is impacted ONLY if the specific information that changed directly relates to what the candidate states or depends on.
- A candidate is NOT impacted if the changed information is irrelevant to the candidate's content, even if both the candidate and the change come from the same source document.
- Be precise: if only one data point changed in the upstream text, only candidates that reference or depend on that specific data point are impacted.
- Do NOT mark a candidate as impacted merely because it originates from the same source — evaluate each candidate independently against the specific change.
- Return a JSON array of objects, each with "index" (1-based candidate number), "impacted" (boolean), and "explanation" (brief reason).
- You MUST return one entry per candidate, in order.

Respond ONLY with a valid JSON array. No explanation, no markdown.
Example: [{"index": 1, "impacted": true, "explanation": "The candidate references the revenue figure that changed"}, {"index": 2, "impacted": false, "explanation": "The candidate discusses market share, unrelated to the change"}]`;

export function buildImpactCheckUserContent(
  oldText: string,
  newText: string,
  children: { id: string; text: string }[],
): string {
  const numbered = children.map((c, i) => `${i + 1}. ${c.text}`).join('\n');
  return `Upstream change:\nBEFORE: ${oldText}\nAFTER: ${newText}\n\nCandidate downstream entities:\n${numbered}`;
}

export function parseImpactCheckResult(
  raw: string,
  children: { id: string; text: string }[],
): ImpactCheckResult[] {
  const cleaned = stripCodeFences(raw);
  console.log('[impact-check] Cleaned for parsing:', cleaned);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('[impact-check] JSON.parse FAILED on cleaned text — falling back to mark-all. Error:', e);
    return children.map(c => ({ id: c.id, impacted: true, explanation: 'parse-error-fallback' }));
  }

  if (!Array.isArray(parsed)) {
    console.warn('[impact-check] Parsed result is NOT an array — falling back to mark-all. Type:', typeof parsed);
    return children.map(c => ({ id: c.id, impacted: true, explanation: 'not-array-fallback' }));
  }

  console.log('[impact-check] Parsed array length:', parsed.length, '/ children count:', children.length);

  const results = parsed
    .filter((item: any) => typeof item === 'object' && item !== null && typeof item.index === 'number')
    .map((item: any) => {
      const idx = item.index - 1;
      if (idx < 0 || idx >= children.length) {
        console.warn(`[impact-check] Index out of range: ${item.index} (children: ${children.length})`);
        return null;
      }
      return {
        id: children[idx].id,
        impacted: item.impacted === true,
        explanation: typeof item.explanation === 'string' ? item.explanation : '',
      };
    })
    .filter((r: ImpactCheckResult | null): r is ImpactCheckResult => r !== null);

  const impactedCount = results.filter(r => r.impacted).length;
  console.log(`[impact-check] Final: ${impactedCount}/${results.length} marked as impacted`);

  return results;
}
