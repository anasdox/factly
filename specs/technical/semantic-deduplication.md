# Semantic Deduplication — Technical Specification

- **x-tsid:** TS-SemanticDeduplication
- **x-fsid-links:**
  - FS-DedupCheckOnManualAdd
  - FS-DedupCheckOnSuggestionAccept
  - FS-NoDuplicateDetected
  - FS-MergeDialogOptions
  - FS-MergeIntoExisting
  - FS-MergeWithUpdate
  - FS-KeepAsVariant
  - FS-ForceAdd
  - FS-LlmSemanticComparison
  - FS-TrigramFallbackWhenOffline
  - FS-OnDemandDedupPerColumn
  - FS-OnDemandDedupResultsDisplay
  - FS-OnDemandDedupNoResults
  - FS-DedupErrorFallsBackToLocal
  - FS-DedupDisabledForInputs
  - FS-OnDemandDedupDisabledWhenBackendUnavailable

## Overview

Add a backend deduplication endpoint that uses the LLM for semantic comparison. Add a frontend deduplication utility module with local trigram fallback. Add a MergeDialog component for duplicate resolution. Integrate dedup checks into the add/accept flows of FactList, InsightList, and RecommendationList.

## Backend

### New endpoint: POST /dedup/check

**Request body:**
```json
{
  "text": "string (required, non-empty)",
  "candidates": [
    { "id": "string", "text": "string" }
  ]
}
```

**Validation rules:**
- `text` must be a non-empty string
- `candidates` must be a non-empty array
- Each candidate must have a non-empty `id` (string) and non-empty `text` (string)

**Success response (200):**
```json
{
  "duplicates": [
    {
      "id": "string",
      "similarity": 0.92,
      "explanation": "string"
    }
  ]
}
```

- `duplicates` is an array of candidates deemed semantically equivalent (similarity > 0.85)
- Empty array if no duplicates found

**Error responses:**
- 400: Missing or invalid fields → `{ "error": "..." }`
- 502: LLM provider error → handled by shared `handleLLMError` helper
- 503: LLM not configured → `{ "error": "Extraction service not configured" }`

### New endpoint: POST /dedup/scan

For on-demand column-wide deduplication.

**Request body:**
```json
{
  "items": [
    { "id": "string", "text": "string" }
  ]
}
```

**Validation rules:**
- `items` must be an array with at least 2 elements
- Each item must have a non-empty `id` (string) and non-empty `text` (string)

**Success response (200):**
```json
{
  "groups": [
    {
      "items": [
        { "id": "string", "text": "string" }
      ],
      "explanation": "string"
    }
  ]
}
```

- `groups` is an array of duplicate groups (each with 2+ items)
- Empty array if no duplicate groups found

**Error responses:**
- Same as `/dedup/check`

### LLM integration

**New methods on LLMProvider interface (`provider.ts`):**
```typescript
interface LLMProvider {
  // ... existing methods ...
  checkDuplicates(text: string, candidates: { id: string; text: string }[]): Promise<DedupResult[]>;
  scanDuplicates(items: { id: string; text: string }[]): Promise<DedupGroup[]>;
}
```

**New types (`prompts.ts`):**
```typescript
export type DedupResult = { id: string; similarity: number; explanation: string };
export type DedupGroup = { items: { id: string; text: string }[]; explanation: string };
```

**New prompts (`prompts.ts`):**

```typescript
export const DEDUP_CHECK_SYSTEM_PROMPT = `You are a semantic similarity assistant...`;
```

Dedup check prompt rules:
- Compare the given text against each candidate
- Determine semantic equivalence (same meaning, even if different wording)
- Return only candidates with similarity > 0.85
- Return a JSON array of objects with `id`, `similarity` (0.0-1.0), and `explanation`
- If no duplicates, return an empty array

```typescript
export const DEDUP_SCAN_SYSTEM_PROMPT = `You are a semantic grouping assistant...`;
```

Dedup scan prompt rules:
- Group all items by semantic similarity
- Return only groups with 2+ items that are semantically equivalent
- Return a JSON array of group objects

**User content builders:**
```typescript
export function buildDedupCheckUserContent(text: string, candidates: { id: string; text: string }[]): string;
export function buildDedupScanUserContent(items: { id: string; text: string }[]): string;
```

**Parsers:**
```typescript
export function parseDedupCheckResult(raw: string): DedupResult[];
export function parseDedupScanResult(raw: string): DedupGroup[];
```

**Provider implementations:**
- `AnthropicProvider`, `OpenAIProvider`, `OpenAICompatibleProvider` each implement `checkDuplicates` and `scanDuplicates` following the standard pattern (max_tokens: 2048, temperature: 0.1 for precision).

## Frontend

### Deduplication utility module (dedup.ts — new file)

```typescript
/** Canonicalize text: lowercase, collapse whitespace, strip punctuation, trim */
export function canonicalize(text: string): string;

/** Compute DJB2 hash of canonicalized text as hex string */
export function computeFingerprint(text: string): string;

/** Compute trigram Jaccard similarity between two texts (0.0–1.0) */
export function trigramSimilarity(a: string, b: string): number;

/** Find duplicates locally using trigram similarity */
export function findDuplicatesLocal(
  newText: string,
  existingItems: { id: string; text: string }[],
  threshold?: number, // default 0.80
): { id: string; text: string; similarity: number }[];

/** Find duplicates: tries backend LLM first, falls back to local trigrams */
export async function findDuplicates(
  newText: string,
  existingItems: { id: string; text: string }[],
  backendAvailable: boolean,
): Promise<{ id: string; text: string; similarity: number; explanation?: string }[]>;
```

**Trigram implementation:**
1. Canonicalize both texts
2. Generate character trigrams (sliding window of 3)
3. Compute Jaccard coefficient: `|intersection| / |union|`
4. Use `Set` operations via `.forEach()` (no `for...of` to avoid `downlevelIteration` TS errors)

**`findDuplicates` implementation:**
1. If `backendAvailable`, try `POST /dedup/check`
2. On success, map backend results to return format
3. On error, fall back to `findDuplicatesLocal`
4. If `!backendAvailable`, use `findDuplicatesLocal` directly

### MergeDialog component (MergeDialog.tsx — new file)

**Props:**
```typescript
type MergeDialogProps = {
  isVisible: boolean;
  newText: string;
  existingItem: { id: string; text: string; similarity: number; explanation?: string };
  onMerge: () => void;
  onMergeWithUpdate: (updatedText: string) => void;
  onKeepAsVariant: () => void;
  onForceAdd: () => void;
  onClose: () => void;
};
```

**Layout:**
- Modal dialog (reusing existing dialog CSS pattern)
- Shows new text and existing item text side by side
- Shows similarity score and explanation (if available)
- Three action buttons: "Merge into existing", "Keep as variant", "Force add"
- "Merge into existing" has an optional "Edit existing" sub-action that makes existing text editable

### Integration into List components

**FactList, InsightList, RecommendationList** — modify the add/accept handlers:

```
1. Before adding the item, call findDuplicates(text, existingItems, backendAvailable)
2. If duplicates found:
   a. Show MergeDialog with the top duplicate
   b. Wait for user decision
   c. Merge → discard new item (optionally update existing via versioned edit)
   d. Keep as variant → add new item normally
   e. Force add → add new item normally
3. If no duplicates: add normally
```

**State additions per List component:**
```typescript
const [mergeDialogData, setMergeDialogData] = useState<{
  newText: string;
  existingItem: { id: string; text: string; similarity: number; explanation?: string };
  pendingAdd: () => void; // callback to execute the add
} | null>(null);
```

**On-demand column dedup (FactList, InsightList, RecommendationList):**
- Add "Detect Duplicates" button to column header (icon: `faMagnifyingGlass` or `faClone`)
- On click: send `POST /dedup/scan` with all items in the column
- Show results in a panel (reuse SuggestionsPanel pattern or a dedicated DedupResultsPanel)
- Each group offers "Merge" and "Keep both" actions
- Disabled when `!backendAvailable`

### InputList exclusion

No dedup check is triggered for Input entities. Inputs are source materials and inherently unique references.

## CSS Changes

### App.css — New rules

```css
.merge-dialog { /* modal overlay */ }
.merge-dialog-content { /* side-by-side comparison layout */ }
.merge-dialog-actions { /* button row */ }
.dedup-results-panel { /* on-demand scan results */ }
.dedup-group { /* group of similar items */ }
```

## Configuration

No new environment variables. Reuses existing `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`.

## Dependencies

No new npm packages. All dedup logic is implemented from scratch (canonicalization, trigram, DJB2 hash).
