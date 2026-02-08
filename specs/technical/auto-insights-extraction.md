# Auto Insights Extraction from Facts — Technical Specification

- **x-tsid:** TS-AutoInsightsExtraction
- **x-fsid-links:**
  - FS-SelectFacts
  - FS-DeselectFact
  - FS-ClearFactSelection
  - FS-TriggerInsightsExtraction
  - FS-DisplaySuggestedInsights
  - FS-AcceptSuggestedInsight
  - FS-EditSuggestedInsight
  - FS-RejectSuggestedInsight
  - FS-AcceptAllSuggestedInsights
  - FS-RejectAllSuggestedInsights
  - FS-CloseSuggestionsInsightsPanel
  - FS-InsightsExtractionErrorDisplay
  - FS-ManualInsightFromSelection
  - FS-GenerateInsightsDisabledWithoutSelection

## Overview

Add a fact selection mechanism to the frontend and a new extraction endpoint to the backend. Selected facts can be used to trigger AI-assisted insight extraction or to pre-fill related_facts when creating an insight manually. The backend receives fact texts and the discovery goal, calls the existing LLM provider, and returns structured suggested insights. The frontend reuses the SuggestionsPanel pattern from M10.

## Backend

### New endpoint: POST /extract/insights

**Request body:**
```json
{
  "facts": [
    { "fact_id": "string", "text": "string" }
  ],
  "goal": "string (required, non-empty)"
}
```

**Validation rules:**
- `facts` must be a non-empty array
- Each fact must have a non-empty `fact_id` (string) and non-empty `text` (string)
- `goal` must be a non-empty string

**Success response (200):**
```json
{
  "suggestions": [
    { "text": "string" }
  ],
  "fact_ids": ["string"]
}
```

**Error responses:**
- 400: Missing or invalid fields → `{ "error": "..." }`
- 502: LLM provider error → `{ "error": "Extraction service unavailable" }`
- 503: LLM not configured → `{ "error": "Extraction service not configured" }`

### LLM integration

**Reuses the existing LLMProvider interface with a new method:**
```
interface LLMProvider {
  extractFacts(text: string, goal: string): Promise<string[]>
  extractInsights(facts: string[], goal: string): Promise<string[]>
}
```

**New prompt (in `src/llm/prompts.ts`):**
- System prompt defines the role: derive analytical insights from a set of facts.
- Insights must be conclusions, implications, or patterns — not restatements of facts.
- Insights must not contain adjectives or subjective qualifiers.
- The discovery goal is injected as context.
- The fact texts are provided as numbered items.
- Response must be a JSON array of strings.
- Temperature: 0.2.

**Both AnthropicProvider and OpenAIProvider implement `extractInsights`** following the same pattern as `extractFacts` (max_tokens: 2048, temperature: 0.2, JSON array response).

### Error handling
- Same pattern as POST /extract/facts: timeout → 502, invalid JSON → 502, empty array → 200 with empty suggestions.

## Frontend

### Fact selection mechanism

**Selection state** (in FactList component):
- New state: `selectedFactIds: Set<string>`
- Click on a fact item toggles selection (add/remove from set).
- Selected facts get a CSS class `selected` for visual distinction.

**Selection toolbar** (new component: SelectionToolbar):
- Appears above the Facts column when `selectedFactIds.size > 0`.
- Displays: "{N} fact(s) selected"
- Actions:
  - "Generate Insights" — triggers POST /extract/insights
  - "Add Insight" — opens InsightModal with related_facts pre-filled
  - "Clear Selection" — empties selection set

### Insights extraction flow

1. Analyst selects 1+ facts.
2. Clicks "Generate Insights" on selection toolbar.
3. Frontend sends `POST /extract/insights` with `{ facts: selectedFacts.map(f => ({ fact_id: f.fact_id, text: f.text })), goal: discoveryData.goal }`.
4. Loading indicator on selection toolbar during request.
5. On success: SuggestionsPanel opens (reused from M10) with insight suggestions.
6. Accept/Edit/Reject flow identical to M10 but creates InsightType instead of FactType.

### Insight creation from accepted suggestion

When a suggestion is accepted (single or bulk):
1. Generate an `insight_id`.
2. Create an `InsightType` with `{ insight_id, text: acceptedText, related_facts: Array.from(selectedFactIds) }`.
3. Append to `discoveryData.insights`.

### Manual insight creation with pre-filled related_facts

When "Add Insight" is clicked on selection toolbar:
1. Open InsightModal in `add` mode.
2. Pre-fill `related_facts` with `Array.from(selectedFactIds)`.
3. Analyst fills in text, adjusts related_facts if needed, saves.

## Configuration

No new environment variables. Reuses existing `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`.

## Dependencies

No new packages. Reuses existing LLM SDKs and SuggestionsPanel component.
