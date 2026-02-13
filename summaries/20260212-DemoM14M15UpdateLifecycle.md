# Demo Note — M14+M15: Update Lifecycle

## Date
2026-02-12

## Demo environment
- **Backend:** `make restart-backend` (running on `localhost:3002`)
- **Frontend:** `make start-frontend` (running on `localhost:3000`)
- **LLM provider required** for AI-assisted updates and LLM dedup (set `LLM_PROVIDER` + credentials in `apps/backend/.env`). Trigram fallback works offline.

## Implemented scope

### M14 — Staleness Propagation on Edit
- Editing any entity text prompts "substance vs. wording" confirmation
- Substance edits: create immutable version (v2, v3...), preserve history in `versions[]`
- Downstream entities marked with propagation status: `needs_review`, `needs_refresh`, `unsupported`, `weak`, `risky`
- Visual indicators: status chip (colored badge), version badge (vN top-right), stale border (left colored border)
- Confirm-valid button (checkmark icon) clears actionable status back to `validated`
- Input archive (soft-delete) cascades with `archived` mode statuses
- Info toast notifications show impacted count
- All 4 CSS themes support status colors
- Backward-compatible: existing data without version fields loads as v1/draft

### M15 — Semantic Deduplication
- Adding a fact, insight, or recommendation triggers dedup check before insert
- LLM-powered semantic comparison via `POST /dedup/check` (when backend available)
- Local trigram fallback (Jaccard similarity, threshold 0.80) when offline
- Merge dialog with 4 options: merge into existing, keep as variant, force add, cancel
- `POST /dedup/scan` endpoint for on-demand column-wide duplicate detection
- Inputs explicitly excluded from dedup (per spec)
- Backend returns structured `{ duplicates }` / `{ groups }` JSON

### AI-Assisted Update Proposals
- Robot icon on stale entities triggers `POST /propose/update`
- AI receives: current text, upstream old/new text, entity type, goal
- ProposalPanel component: shows current vs. proposed text, with Accept/Edit/Reject
- Overlay mode for Facts/Insights (loading spinner included), inline for Outputs/Recommendations
- Accepted proposals create new version, clear status, propagate downstream
- Output proposals include Markdown format instruction via `output_type`
- Robot icon disabled (grayed) when backend unavailable

## Not implemented (per spec non-goals)
- Automatic re-generation of downstream entities (analyst triggers per item)
- Batch AI updates of all stale items at once
- Cross-type deduplication (e.g. Facts vs. Insights)
- Cross-Discovery deduplication
- On-demand "Detect Duplicates" button in column headers (backend endpoint exists, frontend button not wired — marked as `todo` in tests)

## Limitations
- On-demand dedup scan (`POST /dedup/scan`) is backend-ready but the frontend "Detect Duplicates" per-column button is not yet wired (28 todo tests cover these frontend-only scenarios)
- LLM dedup token cost scales with candidate count (capped to same-column items)
- `window.confirm()` is used for substance-vs-wording prompt (not a styled modal)

## Validation gates
| Gate | Result |
|------|--------|
| TypeScript (frontend) | PASS |
| TypeScript (backend) | PASS |
| M14+M15 acceptance tests | 38/38 PASS |
| Full acceptance tests | 101/101 PASS (28 todo) |
| Refactoring validated | PASS |
