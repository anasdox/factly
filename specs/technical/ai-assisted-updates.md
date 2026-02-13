# AI-Assisted Update Proposals — Technical Specification

- **x-tsid:** TS-AiAssistedUpdates
- **x-fsid-links:**
  - FS-TriggerAiUpdateOnStaleItem
  - FS-DisplayAiUpdateProposal
  - FS-AcceptAiUpdateProposal
  - FS-EditAiUpdateProposal
  - FS-RejectAiUpdateProposal
  - FS-AiUpdateReceivesFullContext
  - FS-ProposeUpdateDisabledWhenBackendUnavailable
  - FS-ProposeUpdateNotShownForValidItems
  - FS-ProposeUpdateShownForAllActionableStatuses
  - FS-AiUpdateErrorDisplay
  - FS-AiUpdateForOutputProposesMarkdown

## Overview

Add a backend endpoint that receives a stale entity's text, the upstream change context, and the discovery goal, then uses the LLM to propose an updated version of the entity. Add a frontend proposal panel (reusing the SuggestionsPanel pattern) and a "Propose update" action in ItemWrapper for stale entities.

## Backend

### New endpoint: POST /propose/update

**Request body:**
```json
{
  "entity_type": "fact | insight | recommendation | output",
  "current_text": "string (required, non-empty)",
  "upstream_change": {
    "old_text": "string (required)",
    "new_text": "string (required)",
    "entity_type": "input | fact | insight | recommendation"
  },
  "goal": "string (required, non-empty)",
  "output_type": "report | presentation | action_plan | brief (required only when entity_type is output)"
}
```

**Validation rules:**
- `entity_type` must be one of: `fact`, `insight`, `recommendation`, `output`
- `current_text` must be a non-empty string
- `upstream_change` must be an object with `old_text` (string), `new_text` (string), and `entity_type` (string)
- `goal` must be a non-empty string
- `output_type` is required and validated when `entity_type` is `output`

**Success response (200):**
```json
{
  "proposed_text": "string",
  "explanation": "string"
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
  proposeUpdate(
    entityType: string,
    currentText: string,
    upstreamOldText: string,
    upstreamNewText: string,
    goal: string,
    outputType?: string,
  ): Promise<{ proposed_text: string; explanation: string }>;
}
```

**New prompts (`prompts.ts`):**

```typescript
export const UPDATE_PROPOSAL_SYSTEM_PROMPT = `You are an update assistant...`;
```

System prompt rules:
- Role: propose an updated version of a downstream entity after an upstream change
- The entity must remain consistent with the new upstream text
- Preserve the style, tone, and level of detail of the original entity text
- For outputs (type=output): produce Markdown format matching the output type instructions
- Return a JSON object with `proposed_text` (the updated text) and `explanation` (brief reason for the changes)
- If no update is needed (the entity is still valid), return the original text as `proposed_text` and explain why no change was needed

**User content builder (`prompts.ts`):**

```typescript
export function buildUpdateProposalUserContent(
  entityType: string,
  currentText: string,
  upstreamOldText: string,
  upstreamNewText: string,
  goal: string,
): string;
```

Content format:
```
Research goal: {goal}

The following upstream {upstreamEntityType} was changed:
BEFORE: {upstreamOldText}
AFTER: {upstreamNewText}

The following {entityType} depends on it and may need updating:
{currentText}

Propose an updated version of this {entityType} that is consistent with the upstream change.
```

**New parser (`prompts.ts`):**

```typescript
export function parseUpdateProposal(raw: string): { proposed_text: string; explanation: string };
```

Parses the JSON response. Falls back to treating the whole response as `proposed_text` with empty `explanation` if JSON parsing fails.

**Provider implementations:**
- `AnthropicProvider`, `OpenAIProvider`, `OpenAICompatibleProvider` each implement `proposeUpdate` following the same pattern as existing methods (max_tokens: 4096, temperature: 0.3).

### Error handling
- Uses shared `handleLLMError` helper (same as existing extraction endpoints).

## Frontend

### Propose update button (ItemWrapper.tsx)

New optional prop:
```typescript
onProposeUpdate?: () => void;
```

- Icon: `faArrowsRotate` (refresh arrows) or `faRobot` (robot)
- Rendered in the item toolbar when:
  - `onProposeUpdate` is provided
  - Entity `status` is actionable (not `draft`, not `validated`)
- Disabled when backend is unavailable (checked via `backendAvailable` prop)
- Tooltip when disabled: "Backend unavailable"
- On click: calls `onProposeUpdate()`

### Proposal panel (reuse SuggestionsPanel pattern)

When the Analyst clicks "Propose update" on a stale item, the List component:

1. Resolves the upstream change context:
   - Find the upstream entity that caused the staleness (follow `related_*` links upward)
   - Get the upstream entity's current text (`new_text`) and previous text from `versions[]` (`old_text`)
   - If no version history is available (upstream was from before versioning), use empty string for `old_text`

2. Sends `POST /propose/update` with the context

3. On success, opens a proposal panel showing:
   - Current text (read-only, for comparison)
   - Proposed text (with accept/edit/reject actions)
   - Explanation from the LLM

4. Accept flow:
   - Call `createNewVersion(item, proposedText)` to create a new version
   - Call `clearStatus(data, entityType, entityId)` to set status to `validated`
   - Optionally trigger `propagateImpact` if the accepted update itself is a substance change to downstream entities
   - Call `setData(updatedData)`
   - Close the proposal panel

5. Edit flow:
   - Make proposed text editable
   - On confirm, same as accept but with modified text

6. Reject flow:
   - Close the proposal panel
   - Entity text and status remain unchanged

### State management in List components

Each List component (FactList, InsightList, RecommendationList, OutputList) adds:
- `[proposalTarget, setProposalTarget] = useState<string | null>(null)` — ID of the entity being proposed for
- `[proposalData, setProposalData] = useState<{ proposed_text: string; explanation: string } | null>(null)`
- `[proposingUpdate, setProposingUpdate] = useState(false)` — loading state

Handler passed to ItemWrapper:
```typescript
const handleProposeUpdate = async (entityId: string) => {
  // 1. Resolve upstream context
  // 2. POST /propose/update
  // 3. setProposalData(result)
  // 4. setProposalTarget(entityId)
};
```

## Configuration

No new environment variables. Reuses existing `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`.

## Dependencies

No new npm packages. Reuses existing LLM SDKs and SuggestionsPanel UI pattern.
