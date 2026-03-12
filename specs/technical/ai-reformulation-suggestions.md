# AI-Assisted Reformulation Suggestions — Technical Specification

- **x-tsid:** TS-AiReformulationSuggestions
- **x-fsid-links:**
  - FS-ReformulateButtonVisibleInFactModal
  - FS-ReformulateButtonVisibleInInsightModal
  - FS-ReformulateButtonVisibleInRecommendationModal
  - FS-ReformulateButtonDisabledWhenTextEmpty
  - FS-ReformulateButtonEnabledWhenTextPresent
  - FS-TriggerReformulationOnClick
  - FS-DisplayReformulationSuggestions
  - FS-SelectSuggestionReplacesText
  - FS-EditAfterSelectingSuggestion
  - FS-DismissSuggestionsKeepsOriginal
  - FS-ReformulateAgainAfterEdit
  - FS-ReformulationUsesRelatedItemsContext
  - FS-ReformulationUsesDiscoveryGoal
  - FS-ReformulationErrorShowsMessage
  - FS-ReformulationTimeoutShowsMessage
  - FS-ReformulateButtonHiddenWhenNoLLM

## Overview

Add a backend endpoint that receives an item's text, type, related items context, and discovery goal, then uses the LLM to propose 2-3 alternative reformulations with justifications. Add a "Reformulate" button in the FactModal, InsightModal, and RecommendationModal components that triggers the endpoint and displays suggestions inline.

## Backend

### New endpoint: POST /reformulate

**Request body:**
```json
{
  "text": "string (required, non-empty)",
  "entity_type": "fact | insight | recommendation",
  "goal": "string (required, non-empty)",
  "related_items": [
    { "text": "string", "type": "input | fact | insight" }
  ]
}
```

**Validation rules:**
- `text` must be a non-empty string
- `entity_type` must be one of: `fact`, `insight`, `recommendation`
- `goal` must be a non-empty string
- `related_items` must be an array (can be empty)
- Each item in `related_items` must have `text` (string) and `type` (string)

**Success response (200):**
```json
{
  "suggestions": [
    {
      "text": "string",
      "justification": "string"
    }
  ]
}
```

**Error responses:**
- 400: Missing or invalid fields → `{ "error": "..." }`
- 502: LLM provider error → handled by shared `handleLLMError` helper
- 503: LLM not configured → `{ "error": "Extraction service not configured" }`

### LLM integration

**New method on LLMProvider interface (`provider.ts`):**
```typescript
interface LLMProvider {
  // ... existing methods ...
  reformulate(
    text: string,
    entityType: string,
    goal: string,
    relatedItems: { text: string; type: string }[],
  ): Promise<ReformulationSuggestion[]>;
}
```

**New type (`prompts.ts`):**
```typescript
export interface ReformulationSuggestion {
  text: string;
  justification: string;
}
```

**New prompt (`prompts.ts`):**

```typescript
export const REFORMULATION_SYSTEM_PROMPT = `You are a reformulation assistant. Your role is to propose alternative wordings for a given item (fact, insight, or recommendation) to improve its clarity, precision, or actionability.

Rules:
- Propose exactly 3 alternative reformulations.
- Each reformulation must preserve the original meaning while improving one or more of: clarity, precision, specificity, actionability.
- For facts: favor precise, verifiable, measurable language. Remove vague qualifiers.
- For insights: favor analytical depth, clear cause-effect or pattern-based language.
- For recommendations: favor concrete, actionable, specific phrasing with clear expected outcomes.
- Use vocabulary consistent with the provided related items context.
- Align reformulations with the research goal.
- For each suggestion, provide a short justification (1 sentence) explaining what the reformulation improves.
- Do not change the fundamental meaning or add new information not present in the original.
- Return a JSON array of objects, each with "text" (the reformulated item) and "justification" (why this reformulation is better).

Respond ONLY with a valid JSON array. No explanation, no markdown.
Example: [{"text": "Reformulated text here", "justification": "More specific with measurable outcome"}]`;
```

**User content builder (`prompts.ts`):**

```typescript
export function buildReformulationUserContent(
  text: string,
  entityType: string,
  goal: string,
  relatedItems: { text: string; type: string }[],
): string;
```

Content format:
```
Research goal: {goal}

Item type: {entityType}

Related items for context:
{relatedItems.map((item, i) => `${i + 1}. [${item.type}] ${item.text}`).join('\n')}

Text to reformulate:
{text}

Propose 3 alternative reformulations.
```

If `relatedItems` is empty, the "Related items for context" section is omitted.

**New parser (`prompts.ts`):**

```typescript
export function parseReformulationSuggestions(raw: string): ReformulationSuggestion[];
```

Parses the JSON array response. Falls back to empty array if parsing fails.

**Provider implementations:**
- `AnthropicProvider`, `OpenAIProvider`, `OpenAICompatibleProvider` each implement `reformulate` following the same pattern as existing methods (max_tokens: 2048, temperature: 0.5 — slightly higher for creative reformulation).

### Error handling
- LLM timeout: 30 seconds. On timeout → 502 with `{ "error": "Reformulation timed out" }`.
- LLM returns invalid JSON: log error, return 502 with `{ "error": "Reformulation returned invalid response" }`.
- LLM returns empty array: return 200 with `{ "suggestions": [] }`.

## Frontend

### Reformulate button in modals

Add to `FactModal.tsx`, `InsightModal.tsx`, and `RecommendationModal.tsx`:

**New props:**
```typescript
backendAvailable?: boolean;  // if already passed; controls button visibility
```

**Button placement:**
- Below the textarea field, aligned right.
- Icon: `faWandMagicSparkles` (magic wand) — consistent with existing extraction buttons.
- Label: "Reformulate"
- Disabled when: text field is empty.
- Hidden when: `backendAvailable` is false (LLM not configured).
- On click: calls `POST /reformulate` with current modal state.

**Loading state:**
- Button shows spinner while request is in progress.
- Button is disabled during loading.
- Text field remains editable during loading.

### Suggestions display (inline in modal)

When suggestions are returned, display them below the textarea:

```typescript
interface ReformulationSuggestion {
  text: string;
  justification: string;
}

// State in modal
const [suggestions, setSuggestions] = useState<ReformulationSuggestion[]>([]);
const [isReformulating, setIsReformulating] = useState(false);
```

**Suggestion list UI:**
- Rendered as a list of clickable cards below the text field.
- Each card shows:
  - The proposed text (primary content)
  - The justification in smaller/muted text below
- On click: the card's text replaces the textarea content, and the suggestions list is cleared.
- Dismiss: clicking outside the suggestions area, pressing Escape, or clicking a small "×" dismiss button clears the list without changing the text.

### Building the related items context

Each modal must resolve its related items to send as context:

**FactModal:** Resolve `related_inputs` IDs → get their `text` values from `discoveryData.inputs`. Send as `{ text, type: "input" }`.

**InsightModal:** Resolve `related_facts` IDs → get their `text` values from `discoveryData.facts`. Send as `{ text, type: "fact" }`.

**RecommendationModal:** Resolve `related_insights` IDs → get their `text` values from `discoveryData.insights`. Send as `{ text, type: "insight" }`.

### Request construction

```typescript
const handleReformulate = async () => {
  setIsReformulating(true);
  setSuggestions([]);
  try {
    const response = await fetch(`${backendUrl}/reformulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: currentText,
        entity_type: entityType, // 'fact' | 'insight' | 'recommendation'
        goal: discoveryData.goal,
        related_items: resolvedRelatedItems,
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Reformulation failed');
    }
    const data = await response.json();
    setSuggestions(data.suggestions);
  } catch (error) {
    // Show error via toast
  } finally {
    setIsReformulating(false);
  }
};
```

### Error display
- On error or timeout: show a toast notification (reuse existing Toast component).
- The text field content is preserved unchanged.

## Configuration

No new environment variables. Reuses existing `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`.

## Dependencies

No new npm packages. Reuses existing LLM SDKs and UI patterns.
