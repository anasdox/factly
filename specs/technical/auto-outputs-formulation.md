# Auto Outputs Formulation from Recommendations — Technical Specification

- **x-tsid:** TS-AutoOutputsFormulation
- **x-fsid-links:**
  - FS-SelectRecommendations
  - FS-DeselectRecommendation
  - FS-ClearRecommendationSelection
  - FS-SelectOutputType
  - FS-TriggerOutputsFormulation
  - FS-DisplaySuggestedOutputs
  - FS-AcceptSuggestedOutput
  - FS-EditSuggestedOutput
  - FS-RejectSuggestedOutput
  - FS-AcceptAllSuggestedOutputs
  - FS-RejectAllSuggestedOutputs
  - FS-CloseSuggestionsOutputsPanel
  - FS-OutputsFormulationErrorDisplay
  - FS-ManualOutputFromSelection
  - FS-FormulateOutputsDisabledWithoutSelection

## Overview

Add a recommendation selection mechanism to the frontend and a new formulation endpoint to the backend. Selected recommendations can be used to trigger AI-assisted output formulation or to pre-fill related_recommendations when creating an output manually. Outputs have a **type** (`report`, `presentation`, `action_plan`, `brief`) that determines the LLM prompt and the structure of the generated content. The analyst selects the output type from a dropdown in the selection toolbar before triggering formulation.

## Output Types

| Type | Label | Description |
|------|-------|-------------|
| `report` | Report | Structured synthesis of findings |
| `presentation` | Presentation | Key points for a slide deck |
| `action_plan` | Action Plan | Concrete steps with deadlines |
| `brief` | Brief | Executive summary for decision makers |

## Data Model Change

**OutputType** gains a `type` field:
```typescript
type OutputType = {
  output_id: string;
  related_recommendations: string[];
  text: string;
  type: 'report' | 'presentation' | 'action_plan' | 'brief';
};
```

Existing outputs without a `type` field default to `'report'`.

## Backend

### New endpoint: POST /extract/outputs

**Request body:**
```json
{
  "recommendations": [
    { "recommendation_id": "string", "text": "string" }
  ],
  "goal": "string (required, non-empty)",
  "output_type": "report | presentation | action_plan | brief"
}
```

**Validation rules:**
- `recommendations` must be a non-empty array
- Each recommendation must have a non-empty `recommendation_id` (string) and non-empty `text` (string)
- `goal` must be a non-empty string
- `output_type` must be one of: `report`, `presentation`, `action_plan`, `brief`

**Success response (200):**
```json
{
  "suggestions": [
    { "text": "string" }
  ],
  "recommendation_ids": ["string"]
}
```

**Error responses:**
- 400: Missing or invalid fields → `{ "error": "..." }`
- 502: LLM provider error → handled by shared `handleLLMError` helper
- 503: LLM not configured → `{ "error": "Extraction service not configured" }`

### LLM integration

**Extends the existing LLMProvider interface with a new method:**
```
interface LLMProvider {
  extractFacts(text: string, goal: string): Promise<string[]>
  extractInsights(facts: string[], goal: string): Promise<string[]>
  extractRecommendations(insights: string[], goal: string): Promise<string[]>
  formulateOutputs(recommendations: string[], goal: string, outputType: string): Promise<string[]>
}
```

**Type-specific prompts (in `src/llm/prompts.ts`):**

One base prompt with a type-specific instruction map:

```typescript
const OUTPUT_TYPE_INSTRUCTIONS: Record<string, string> = {
  report: 'Each output must be a section of a structured report...',
  presentation: 'Each output must be a key point suitable for a slide...',
  action_plan: 'Each output must be a concrete action step with a clear deadline...',
  brief: 'Each output must be a concise executive summary point...',
};
```

The system prompt is constructed dynamically: base rules + type-specific instruction.

**Both AnthropicProvider and OpenAIProvider implement `formulateOutputs`** following the same pattern as `extractRecommendations` (max_tokens: 2048, temperature: 0.2, JSON array response, shared `parseStringArray` helper).

### Error handling
- Uses shared `handleLLMError` helper.

## Frontend

### Recommendation selection mechanism

**Selection state** (in RecommendationList component):
- Uses shared `useItemSelection()` hook → `{ selectedIds, toggleSelection, clearSelection }`
- Selected recommendations get CSS class `selected` for visual distinction.
- New prop: `onError: (msg: string) => void` — passed from App.tsx.

**Selection toolbar** (inline in RecommendationList):
- Appears above the Recommendations column when `selectedIds.size > 0`.
- Displays: "{N} recommendation(s) selected"
- **Output type dropdown**: `<select>` with options Report, Presentation, Action Plan, Brief. Defaults to "Report".
- Actions:
  - "Formulate Outputs" — triggers POST /extract/outputs with selected type
  - "Add Output" — opens OutputModal with related_recommendations pre-filled
  - "Clear Selection" — empties selection set

### Outputs formulation flow

1. Analyst selects 1+ recommendations.
2. Selects output type from dropdown (default: Report).
3. Clicks "Formulate Outputs" on selection toolbar.
4. Frontend sends `POST /extract/outputs` with `{ recommendations, goal, output_type }`.
5. Loading indicator on selection toolbar during request.
6. On success: SuggestionsPanel opens with output suggestions.
7. Accept/Edit/Reject flow creates OutputType with `type` set to the selected output type.

### Output creation from accepted suggestion

When a suggestion is accepted (single or bulk):
1. Generate an `output_id`.
2. Create an `OutputType` with `{ output_id, text: acceptedText, related_recommendations: Array.from(selectedIds), type: selectedOutputType }`.
3. Append to `discoveryData.outputs`.

### Manual output creation with pre-filled related_recommendations

When "Add Output" is clicked on selection toolbar:
1. Open OutputModal in `add` mode.
2. Pre-fill `related_recommendations` with `Array.from(selectedIds)`.
3. Analyst fills in text, chooses type, adjusts related_recommendations if needed, saves.

### OutputModal change

Add a `type` dropdown field to OutputModal (report/presentation/action_plan/brief).

## CSS

Reuses existing `.fact-selectable`, `.selected`, `.selection-toolbar` CSS classes.

## Configuration

No new environment variables. Reuses existing `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`.

## Dependencies

No new packages. Reuses existing LLM SDKs, SuggestionsPanel component, and useItemSelection hook.
