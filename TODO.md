# TODO

## Intent
Deliver M14: Staleness Propagation on Edit + M15: Semantic Deduplication + AI-Assisted Update Proposals — complete update lifecycle with immutable versioning, status-based impact propagation, semantic deduplication, and AI-proposed downstream updates.

## Preconditions
- M1–M13: Delivered (M13 demo validated 2026-02-08)
- ROADMAP.md updated with M13 delivered status

## Tasks
- [x] Write functional specs for M14+M15 (52 scenarios: staleness-propagation, ai-assisted-updates, semantic-deduplication)
- [x] UoR validation of functional specs
- [x] Write technical specs for M14+M15 (TS-StalenessPropagation, TS-AiAssistedUpdates, TS-SemanticDeduplication)
- [x] UoR validation of technical specs
- [x] Create IMPLEMENTATION_PLAN.md (14 slices, 3 cross-feature dependencies)
- [x] Write acceptance tests for M14+M15 (3 test files: staleness-propagation, ai-assisted-updates, semantic-deduplication)
- [x] UoR validation of implementation plan + acceptance tests
- [x] Implement M14+M15
- [x] All acceptance tests pass (38/38 M14+M15, 101/101 full suite)
- [x] Refactoring phase (ProposalPanel extraction, useMergeDialog hook, type safety fixes, backend validation helpers, constants, CSS standardization)
- [x] Demo and user validation (validated 2026-02-15)

## Validation
- All acceptance tests pass
- TypeScript compiles cleanly (frontend + backend)

## Done when
- Editing an upstream entity creates a new version with history preserved
- Downstream entities are marked with appropriate status (needs_review, needs_refresh, unsupported, weak, risky) based on the propagation matrix
- Visual indicators (status chip, version badge, stale border) show on affected items
- Analyst can confirm-valid to clear status, or trigger AI-assisted update proposals
- Backend AI proposes updated text for stale downstream items based on the change
- Analyst validates, edits, or rejects AI-proposed updates before they enter the pipeline
- Adding or accepting an entity triggers deduplication check (LLM when backend available, trigram fallback when offline)
- Merge dialog allows merge, keep-as-variant, or force-add for detected duplicates
- On-demand "Detect Duplicates" per column sends items to LLM for semantic grouping
- All CI gates green
- User validation complete
