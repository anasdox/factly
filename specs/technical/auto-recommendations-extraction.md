# Auto Recommendations Extraction from Insights — Technical Specification

- **x-tsid:** TS-AutoRecommendationsExtraction
- **x-fsid-links:**
  - FS-SelectInsights
  - FS-DeselectInsight
  - FS-ClearInsightSelection
  - FS-TriggerRecommendationsExtraction
  - FS-DisplaySuggestedRecommendations
  - FS-AcceptSuggestedRecommendation
  - FS-EditSuggestedRecommendation
  - FS-RejectSuggestedRecommendation
  - FS-AcceptAllSuggestedRecommendations
  - FS-RejectAllSuggestedRecommendations
  - FS-CloseSuggestionsRecommendationsPanel
  - FS-RecommendationsExtractionErrorDisplay
  - FS-ManualRecommendationFromSelection
  - FS-GenerateRecommendationsDisabledWithoutSelection

## Overview

Add an insight selection mechanism to the frontend and a new extraction endpoint to the backend. Selected insights can be used to trigger AI-assisted recommendation extraction or to pre-fill related_insights when creating a recommendation manually. The backend receives insight texts and the discovery goal, calls the existing LLM provider, and returns structured suggested recommendations. The frontend reuses the SuggestionsPanel pattern from M10/M11.

## Backend

### New endpoint: POST /extract/recommendations

**Request body:**
```json
{
  "insights": [
    { "insight_id": "string", "text": "string" }
  ],
  "goal": "string (required, non-empty)"
}
```

**Validation rules:**
- `insights` must be a non-empty array
- Each insight must have a non-empty `insight_id` (string) and non-empty `text` (string)
- `goal` must be a non-empty string

**Success response (200):**
```json
{
  "suggestions": [
    { "text": "string" }
  ],
  "insight_ids": ["string"]
}
```

**Error responses:**
- 400: Missing or invalid fields → `{ "error": "..." }`
- 502: LLM provider error → `{ "error": "Extraction service unavailable" }`
- 503: LLM not configured → `{ "error": "Extraction service not configured" }`

### LLM integration

**Extends the existing LLMProvider interface with a new method:**
```
interface LLMProvider {
  extractFacts(text: string, goal: string): Promise<string[]>
  extractInsights(facts: string[], goal: string): Promise<string[]>
  extractRecommendations(insights: string[], goal: string): Promise<string[]>
}
```

**New prompt (in `src/llm/prompts.ts`):**
- System prompt defines the role: formulate actionable recommendations from a set of analytical insights.
- Recommendations must be concrete, actionable proposals — not restatements of insights.
- Recommendations must not contain adjectives or subjective qualifiers.
- The discovery goal is injected as context.
- The insight texts are provided as numbered items.
- Response must be a JSON array of strings.
- Temperature: 0.2.

**Both AnthropicProvider and OpenAIProvider implement `extractRecommendations`** following the same pattern as `extractInsights` (max_tokens: 2048, temperature: 0.2, JSON array response, shared `parseStringArray` helper).

### Error handling
- Same pattern as POST /extract/insights: timeout → 502, invalid JSON → 502, empty array → 200 with empty suggestions.

## Frontend

### Insight selection mechanism

**Selection state** (in InsightList component):
- New state: `selectedInsightIds: Set<string>`
- Click on an insight item toggles selection (add/remove from set).
- Selected insights get a CSS class `selected` for visual distinction.
- New prop: `onError: (msg: string) => void` — passed from App.tsx.

**Selection toolbar** (inline in InsightList):
- Appears above the Insights column when `selectedInsightIds.size > 0`.
- Displays: "{N} insight(s) selected"
- Actions:
  - "Generate Recommendations" — triggers POST /extract/recommendations
  - "Add Recommendation" — opens RecommendationModal with related_insights pre-filled
  - "Clear Selection" — empties selection set

### Recommendations extraction flow

1. Analyst selects 1+ insights.
2. Clicks "Generate Recommendations" on selection toolbar.
3. Frontend sends `POST /extract/recommendations` with `{ insights: selectedInsights.map(i => ({ insight_id: i.insight_id, text: i.text })), goal: discoveryData.goal }`.
4. Loading indicator on selection toolbar during request.
5. On success: SuggestionsPanel opens (reused from M10/M11) with recommendation suggestions.
6. Accept/Edit/Reject flow identical to M11 but creates RecommendationType instead of InsightType.

### Recommendation creation from accepted suggestion

When a suggestion is accepted (single or bulk):
1. Generate a `recommendation_id`.
2. Create a `RecommendationType` with `{ recommendation_id, text: acceptedText, related_insights: Array.from(selectedInsightIds) }`.
3. Append to `discoveryData.recommendations`.

### Manual recommendation creation with pre-filled related_insights

When "Add Recommendation" is clicked on selection toolbar:
1. Open RecommendationModal in `add` mode.
2. Pre-fill `related_insights` with `Array.from(selectedInsightIds)`.
3. Analyst fills in text, adjusts related_insights if needed, saves.

## CSS

Reuse existing `.fact-selectable`, `.selected`, `.selection-toolbar` CSS classes — they apply generically to the insight column as well (class names are entity-agnostic).

## Configuration

No new environment variables. Reuses existing `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`.

## Dependencies

No new packages. Reuses existing LLM SDKs and SuggestionsPanel component.
