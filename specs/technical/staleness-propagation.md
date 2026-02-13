# Staleness Propagation on Edit — Technical Specification

- **x-tsid:** TS-StalenessPropagation
- **x-fsid-links:**
  - FS-TextEditCreatesVersion
  - FS-NonTextEditNoVersion
  - FS-VersionBadgeDisplay
  - FS-VersionBadgeHiddenForV1
  - FS-WaitingToastDuringImpactAnalysis
  - FS-InputEditPropagatesDownstream
  - FS-SmartPropagationLLMFiltering
  - FS-SmartPropagationFallbackMarkAll
  - FS-ArchiveCascadeRemainsTransitive
  - FS-PropagationOnlyAffectsRelated
  - FS-InputArchiveCascade
  - FS-FactEditPropagatesDownstream
  - FS-InsightEditPropagatesDownstream
  - FS-RecommendationEditPropagatesDownstream
  - FS-OutputEditNoPropagate
  - FS-StatusChipDisplay
  - FS-StatusChipNotShownForDraft
  - FS-StaleBorderIndicator
  - FS-StatusColorMapping
  - FS-ConfirmValidClearsStatus
  - FS-ConfirmValidNotShownForNonActionable
  - FS-PropagationToastNotification
  - FS-ArchiveToastNotification
  - FS-NewEntityDefaultStatus
  - FS-BackwardCompatibleLoad
  - FS-LazyLevelByLevelResolution
  - FS-ConfirmValidNoDownstreamPropagation
  - FS-ToolbarClickDoesNotSelectItem

## Overview

Extend the data model with versioning and status fields. Add a consistency engine in the frontend that creates new versions on substance edits and propagates status changes to downstream entities. Add visual indicators (status chip, version badge, stale border) to ItemWrapper and a confirm-valid action to clear actionable statuses.

## Data Model Changes (types.ts)

### New shared types

```typescript
type EntityStatus = 'draft' | 'validated' | 'outdated' | 'needs_review' | 'needs_refresh'
                  | 'unsupported' | 'weak' | 'risky';

type VersionEntry = { version: number; text: string; created_at: string };
```

### Extended entity fields (all optional, backward-compatible)

Each of `InputType`, `FactType`, `InsightType`, `RecommendationType`, `OutputType` gains:

```typescript
version?: number;         // default 1
status?: EntityStatus;    // default 'draft'
created_at?: string;      // ISO timestamp
versions?: VersionEntry[];// history of previous versions
```

### Per-entity allowed statuses

| Entity         | Allowed statuses                                       |
|----------------|-------------------------------------------------------|
| Input          | draft, validated, outdated                             |
| Fact           | draft, validated, outdated, unsupported, needs_review  |
| Insight        | draft, validated, outdated, needs_review, weak         |
| Recommendation | draft, validated, outdated, needs_review, risky        |
| Output         | draft, validated, outdated, needs_refresh              |

### Backward compatibility

- All new fields are optional with TypeScript `?`
- Missing `version` defaults to `1` at display/logic time
- Missing `status` defaults to `'draft'` at display/logic time
- Existing JSON imports load without error

## Consistency Engine (lib.ts)

### `createNewVersion(item: ItemType, newText: string): ItemType`

Pure function. Returns a new item with:
1. Previous `{ version, text, created_at }` pushed to `versions[]` history
2. `version` incremented by 1
3. `text` set to `newText`
4. `created_at` set to `new Date().toISOString()`
5. `status` set to `'validated'`

### `propagateImpact(data: DiscoveryData, entityType: string, entityId: string, mode: 'edited' | 'archived', impactedIds?: string[]): { data: DiscoveryData; impactedCount: number }`

Pure function. When `mode = 'edited'` with `impactedIds`, uses `getDirectChildren()` for depth-1 only (lazy propagation). When `mode = 'archived'` or no `impactedIds`, uses `getRelatedEntities()` for full transitive cascade.

**Propagation matrix for `mode = 'edited'` (lazy, depth-1 only):**

| Source entity   | Direct children only |
|----------------|----------------------|
| Input          | Facts → needs_review |
| Fact           | Insights → needs_review |
| Insight        | Recommendations → needs_review |
| Recommendation | Outputs → needs_refresh |

Deeper levels are NOT marked. They will be flagged when the Analyst resolves the stale item at the current level (edit or accept proposal).

**Propagation matrix for `mode = 'archived'` (Input only):**

| Source entity | Facts       | Insights | Recommendations | Outputs       |
|--------------|-------------|----------|-----------------|---------------|
| Input        | unsupported | weak     | risky           | needs_refresh |

Implementation:
1. If `mode = 'archived'` or no `impactedIds`: call `getRelatedEntities(entityType, entityId, data)` for full transitive cascade
2. If `mode = 'edited'` with `impactedIds`: call `getDirectChildren(entityType, entityId, data)` and filter to impacted IDs (depth-1 only)
3. For each affected entity, determine the target status from the matrix
4. Return updated `data` (immutable copy) and `impactedCount`

### `clearStatus(data: DiscoveryData, entityType: string, entityId: string): DiscoveryData`

Pure function. Sets the target entity's `status` to `'validated'`. Returns updated `data` (immutable copy).

## Save Handler Changes (all List components)

### Substance edit flow (InputList, FactList, InsightList, RecommendationList, OutputList)

When the Analyst saves an edit in the modal:

1. Compare old text vs new text. If unchanged, save normally (no classification needed).
2. If text changed:
     a. Call `createNewVersion(item, newText)` → get versioned item
     b. Call backend `checkImpact()` to determine which direct children are semantically impacted
     c. Call `propagateImpact(data, entityType, entityId, 'edited', impactedIds)` → get `{ data, impactedCount }` (depth-1 only)
     d. Show info toast: `"Updated to v{N}. {impactedCount} downstream item(s) marked for review."`
     e. Call `setData(updatedData)`

### Delete handler (InputList only — special case)

When the Analyst deletes an Input:
1. Instead of removing the Input, set its `status` to `'outdated'`
2. Call `propagateImpact(data, 'input', inputId, 'archived')` → get `{ data, impactedCount }`
3. Show info toast: `"Input archived. {impactedCount} downstream item(s) affected."`
4. Call `setData(updatedData)`

### Confirm-valid handler (all Lists via ItemWrapper)

Pass `onClearStatus` callback to ItemWrapper:
1. Call `clearStatus(data, entityType, entityId)` → get updated data
2. Call `setData(updatedData)`

## UI Changes

### ItemWrapper.tsx

New optional props:
```typescript
status?: EntityStatus;
version?: number;
onClearStatus?: () => void;
```

**Status chip:**
- Rendered when `status` is actionable (not `draft`, not `validated`)
- Small colored badge positioned top-left, similar to existing `output-type-badge`
- Text: status name with underscores replaced by spaces (e.g., "needs review")
- Color from CSS variable `--color-status-{statusName}`

**Version badge:**
- Rendered when `version > 1`
- Small subtle badge positioned top-right showing `v{version}`

**Confirm-valid button:**
- Added to the item toolbar (alongside edit and traceability buttons)
- Icon: `faCheck` (checkmark)
- Only rendered when `status` is actionable and `onClearStatus` is provided
- `onClick` calls `onClearStatus()`

**Stale border:**
- `wrapper` div gets a CSS class matching the status (e.g., `status-needs-review`)
- CSS applies a colored `border-left: 3px solid var(--border-status-{statusName})`

### Toast.tsx

Add support for `type` prop: `'error' | 'info'`:
- Error: existing red style (`.toast-error`)
- Info: blue/neutral style (`.toast-info`)

App.tsx adds `handleInfo` callback alongside existing `handleError`, passing type to Toast.

## CSS Changes

### index.css — Theme variables (all 4 themes)

Add to each theme block:
```css
--color-status-needs-review: <amber>;
--border-status-needs-review: <amber>;
--color-status-needs-refresh: <orange>;
--border-status-needs-refresh: <orange>;
--color-status-unsupported: <red>;
--border-status-unsupported: <red>;
--color-status-weak: <yellow>;
--border-status-weak: <yellow>;
--color-status-risky: <red-dark>;
--border-status-risky: <red-dark>;
```

Exact hex values per theme:
- **Light (default):** amber=#b45309, orange=#c2410c, red=#dc2626, yellow=#a16207, red-dark=#991b1b
- **Dark:** amber=#f59e0b, orange=#fb923c, red=#ef4444, yellow=#eab308, red-dark=#f87171
- **Colorful Light:** amber=#d97706, orange=#ea580c, red=#dc2626, yellow=#ca8a04, red-dark=#b91c1c
- **Colorful Dark:** amber=#fbbf24, orange=#fb923c, red=#f87171, yellow=#facc15, red-dark=#fca5a5

### App.css — New rules

```css
.status-chip { /* small badge top-left */ }
.version-badge { /* subtle badge top-right */ }
.wrapper.status-needs-review { border-left: 3px solid var(--border-status-needs-review); }
.wrapper.status-needs-refresh { border-left: 3px solid var(--border-status-needs-refresh); }
.wrapper.status-unsupported { border-left: 3px solid var(--border-status-unsupported); }
.wrapper.status-weak { border-left: 3px solid var(--border-status-weak); }
.wrapper.status-risky { border-left: 3px solid var(--border-status-risky); }
.toast-info { background-color: #2563eb; /* blue */ }
```

## Configuration

No new environment variables. No new packages.

## Dependencies

No new npm packages required. All changes are frontend-only.
