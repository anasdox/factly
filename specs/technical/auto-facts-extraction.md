# Auto Facts Extraction from Text — Technical Specification

- **x-tsid:** TS-AutoFactsExtraction
- **x-fsid-links:**
  - FS-TriggerFactsExtraction
  - FS-DisplaySuggestedFacts
  - FS-AcceptSuggestedFact
  - FS-EditSuggestedFact
  - FS-RejectSuggestedFact
  - FS-AcceptAllSuggestedFacts
  - FS-RejectAllSuggestedFacts
  - FS-CloseSuggestionsPanel
  - FS-ExtractionErrorDisplay
  - FS-ExtractFactsDisabledForNonText
  - FS-ExtractFactsDisabledForEmptyText

## Overview

Add an AI-assisted facts extraction endpoint to the backend and a Suggestions panel to the frontend. The backend receives input text and the discovery goal, calls an LLM provider, and returns structured suggested facts. The frontend displays suggestions for the analyst to accept, edit, or reject.

## Backend

### New endpoint: POST /extract/facts

**Request body:**
```json
{
  "input_text": "string (required, non-empty)",
  "goal": "string (required, non-empty)",
  "input_id": "string (required)"
}
```

**Success response (200):**
```json
{
  "suggestions": [
    { "text": "string" },
    { "text": "string" }
  ],
  "input_id": "string"
}
```

**Error responses:**
- 400: Missing or invalid fields → `{ "error": "..." }`
- 502: LLM provider error → `{ "error": "Extraction service unavailable" }`

### Validation rules
- `input_text` must be a non-empty string
- `goal` must be a non-empty string
- `input_id` must be a non-empty string

### LLM integration

**Provider abstraction:**
```
interface LLMProvider {
  extractFacts(text: string, goal: string): Promise<string[]>
}
```

- Provider is selected via environment variable `LLM_PROVIDER` (values: `anthropic`, `openai`).
- API key is read from environment variable `LLM_API_KEY`.
- The provider is instantiated at server startup. If `LLM_PROVIDER` or `LLM_API_KEY` is not set, the extraction endpoint returns 503 with `{ "error": "Extraction service not configured" }`.

**LLM prompt strategy:**
- System prompt defines the role: extract observable, verifiable facts from text.
- The discovery goal is injected as context: "Extract facts relevant to this research objective: {goal}".
- The input text is provided as user content.
- Response must be a JSON array of strings (each string is a fact).
- Temperature: low (0.2) to favor precision over creativity.

**Provider implementations:**
- `AnthropicProvider`: Uses `@anthropic-ai/sdk` with Claude model. Sends structured message with JSON response format.
- `OpenAIProvider`: Uses `openai` SDK with GPT model. Sends structured message with JSON response format.

### Error handling
- LLM timeout: 30 seconds. On timeout → 502 with `{ "error": "Extraction timed out" }`.
- LLM returns invalid JSON: log error, return 502 with `{ "error": "Extraction returned invalid response" }`.
- LLM returns empty array: return 200 with `{ "suggestions": [], "input_id": "..." }`.

## Frontend

### Extract Facts button
- Location: Input item toolbar (visible on hover, alongside edit button).
- Condition: only displayed if `input.type === "text"`.
- Condition: disabled if `input.text` is empty or undefined.
- Icon: magic wand (faWandMagicSparkles) or similar.
- On click: sends `POST /extract/facts` with `{ input_text: input.text, goal: discoveryData.goal, input_id: input.input_id }`.
- During request: button shows a spinner/loading state.

### Suggestions panel (new component: SuggestionsPanel)
- Renders as a modal or overlay panel.
- Props: `suggestions: string[]`, `inputId: string`, `onAccept(text, inputId)`, `onAcceptAll(texts[], inputId)`, `onClose()`.
- Each suggestion renders as a card with:
  - Fact text displayed
  - "Accept" button → calls `onAccept` with the text
  - "Edit" button → toggles card to editable mode (textarea), with "Confirm" and "Cancel"
  - "Reject" button → removes card from local list
- Bulk actions at panel top:
  - "Accept All" → calls `onAcceptAll` with all remaining suggestion texts
  - "Reject All" → closes panel, discards all remaining
- Close button (X) → discards remaining unprocessed suggestions

### Fact creation from accepted suggestion
When a suggestion is accepted (single or bulk):
1. Generate a `fact_id` (same UUID generation as existing manual flow).
2. Create a `FactType` with `{ fact_id, text: acceptedText, related_inputs: [inputId] }`.
3. Append to `discoveryData.facts`.
4. If in a Room, trigger the standard update broadcast.

## Configuration

New environment variables in `.env`:
- `LLM_PROVIDER`: `anthropic` | `openai` (required for extraction feature)
- `LLM_API_KEY`: API key for the selected provider (required for extraction feature)
- `LLM_MODEL`: Optional model override (defaults: `claude-sonnet-4-5-20250929` for Anthropic, `gpt-4o` for OpenAI)

## Dependencies

New npm packages (backend):
- `@anthropic-ai/sdk` (if using Anthropic)
- `openai` (if using OpenAI)

No new frontend dependencies required.
