# Implementation Plan

## Context
- Planning scope (program/release): M14 + M15 — Update Lifecycle (Staleness Propagation, AI-Assisted Updates, Semantic Deduplication)
- Roadmap links: M14 (Staleness Propagation on Edit), M15 (Semantic Deduplication)
- Planning horizon: Single release cycle
- Scope summary: Immutable versioning, status-based impact propagation, AI-proposed downstream updates, LLM-powered semantic deduplication with local trigram fallback
- Assumptions: M1–M13 delivered; existing LLM provider infrastructure reused; no new npm packages required for frontend

## Global feature sequencing
| Order | Feature | Outcome | Depends on | FSIDs | TSIDs | Acceptance tests | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Data model & types | All entity types extended with version/status fields, backward-compatible | — | FS-NewEntityDefaultStatus, FS-BackwardCompatibleLoad | TS-StalenessPropagation | staleness-propagation.test.ts | — | Planned |
| 2 | Consistency engine | Pure functions for createNewVersion, propagateImpact, clearStatus | 1 | FS-SubstanceEditCreatesVersion, FS-InputEditPropagatesDownstream, FS-InputArchiveCascade, FS-ConfirmValidClearsStatus | TS-StalenessPropagation | staleness-propagation.test.ts | — | Planned |
| 3 | Frontend dedup utilities | canonicalize, fingerprint, trigram similarity, findDuplicates | — | FS-TrigramFallbackWhenOffline, FS-DedupDisabledForInputs | TS-SemanticDeduplication | semantic-deduplication.test.ts | — | Planned |
| 4 | Backend: dedup endpoints | POST /dedup/check + POST /dedup/scan with LLM integration | — | FS-LlmSemanticComparison, FS-OnDemandDedupPerColumn | TS-SemanticDeduplication | semantic-deduplication.test.ts | — | Planned |
| 5 | Backend: propose update endpoint | POST /propose/update with LLM integration | — | FS-TriggerAiUpdateOnStaleItem, FS-AiUpdateReceivesFullContext | TS-AiAssistedUpdates | ai-assisted-updates.test.ts | — | Planned |
| 6 | CSS: theme variables + styles | Status color variables (4 themes), status-chip, version-badge, stale-border, merge-dialog, toast-info | — | FS-StatusColorMapping, FS-StaleBorderIndicator | TS-StalenessPropagation | — | — | Planned |
| 7 | ItemWrapper: visual treatment | Status chip, version badge, confirm-valid button, propose-update button, stale border | 2, 6 | FS-StatusChipDisplay, FS-VersionBadgeDisplay, FS-ConfirmValidClearsStatus, FS-ProposeUpdateShownForAllActionableStatuses | TS-StalenessPropagation, TS-AiAssistedUpdates | staleness-propagation.test.ts | — | Planned |
| 8 | Toast: info type | Add info toast alongside existing error toast | 6 | FS-PropagationToastNotification, FS-ArchiveToastNotification | TS-StalenessPropagation | — | — | Planned |
| 9 | MergeDialog component | New modal for dedup resolution (merge/variant/force) | 6 | FS-MergeDialogOptions, FS-MergeIntoExisting, FS-KeepAsVariant, FS-ForceAdd | TS-SemanticDeduplication | semantic-deduplication.test.ts | — | Planned |
| 10 | OutputList: versioned save + clear status | Simplest list (no downstream, no dedup) | 2, 7, 8 | FS-OutputEditNoPropagate | TS-StalenessPropagation | staleness-propagation.test.ts | — | Planned |
| 11 | RecommendationList: full lifecycle | Versioned save, propagation, dedup, propose-update | 2, 3, 5, 7, 8, 9 | FS-RecommendationEditPropagatesDownstream | TS-StalenessPropagation, TS-AiAssistedUpdates, TS-SemanticDeduplication | all 3 test files | — | Planned |
| 12 | InsightList: full lifecycle | Same pattern | 2, 3, 5, 7, 8, 9 | FS-InsightEditPropagatesDownstream | same | all 3 test files | — | Planned |
| 13 | FactList: full lifecycle | Same pattern | 2, 3, 5, 7, 8, 9 | FS-FactEditPropagatesDownstream | same | all 3 test files | — | Planned |
| 14 | InputList: full lifecycle + archive | Versioned save, archive (soft-delete), propagation, no dedup | 2, 7, 8 | FS-InputEditPropagatesDownstream, FS-InputArchiveCascade | TS-StalenessPropagation | staleness-propagation.test.ts | — | Planned |

## Cross-feature dependencies and blockers
| Dependency | Upstream | Downstream | Impact if late | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Data model types | Slice 1 (types.ts) | All other slices | Blocks all implementation | Deliver first, zero risk | — | Open |
| Consistency engine | Slice 2 (lib.ts) | Slices 7, 10–14 (all Lists + ItemWrapper) | Blocks save handlers and UI | Deliver immediately after types | — | Open |
| Backend LLM methods | Slices 4–5 (provider, prompts) | Frontend dedup + propose-update integration | Frontend can use local fallback for dedup | Trigram fallback available | — | Open |

## Delivery slices (optional detail)
| Slice | Feature link | Outcome | FSIDs | TSIDs | Acceptance tests | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1-Types | M14 | types.ts extended | FS-NewEntityDefaultStatus, FS-BackwardCompatibleLoad | TS-StalenessPropagation | staleness-propagation | — | Planned |
| S2-Engine | M14 | lib.ts consistency functions | FS-SubstanceEditCreatesVersion, FS-InputEditPropagatesDownstream | TS-StalenessPropagation | staleness-propagation | — | Planned |
| S3-DedupFE | M15 | dedup.ts local utilities | FS-TrigramFallbackWhenOffline | TS-SemanticDeduplication | semantic-deduplication | — | Planned |
| S4-DedupBE | M15 | Backend dedup endpoints + LLM | FS-LlmSemanticComparison | TS-SemanticDeduplication | semantic-deduplication | — | Planned |
| S5-ProposeBE | AI Updates | Backend propose endpoint + LLM | FS-TriggerAiUpdateOnStaleItem | TS-AiAssistedUpdates | ai-assisted-updates | — | Planned |
| S6-CSS | M14, M15 | Theme variables + new CSS rules | FS-StatusColorMapping | TS-StalenessPropagation | — | — | Planned |
| S7-ItemWrapper | M14, AI Updates | Visual treatment + toolbar buttons | FS-StatusChipDisplay, FS-VersionBadgeDisplay | TS-StalenessPropagation, TS-AiAssistedUpdates | staleness-propagation | — | Planned |
| S8-Toast | M14 | Info toast type | FS-PropagationToastNotification | TS-StalenessPropagation | — | — | Planned |
| S9-MergeDialog | M15 | Dedup resolution modal | FS-MergeDialogOptions | TS-SemanticDeduplication | semantic-deduplication | — | Planned |
| S10-Lists | M14, M15, AI Updates | All 5 List components updated | All remaining FSIDs | All 3 TSIDs | All 3 test files | — | Planned |

## Critical path and milestones
- Critical path: S1-Types → S2-Engine → S7-ItemWrapper → S10-Lists
- Milestone: M14+M15 Complete
  - Target date: —
  - Exit criteria: All acceptance tests pass, all 4 themes render correctly, export/import preserves version data

## Validation checkpoints
- [x] Functional specs validated for planned slices
- [x] Technical specs validated for planned slices
- [x] Acceptance tests validated for planned slices
- [x] Implementation done for current milestone
- [x] CI green (101/101 acceptance tests pass, TypeScript clean)
- [x] Refactoring validated (acceptance + full tests green — 101/101)
- [x] Demo prepared and validated by UoR (2026-02-15)

## Risks and trade-offs
- Risk: TypeScript downlevelIteration flag not enabled — Set operations with for..of fail
  - Trigger: Using for..of on Set in dedup.ts or lib.ts
  - Response: Use .forEach() instead of for..of on Sets (known constraint from previous experience)
- Risk: ESLint no-loop-func rule violation in propagateImpact
  - Trigger: Closures referencing mutable variables inside loops
  - Response: Use Map-based approach to avoid closures in loops
- Risk: LLM dedup token cost scales with existing items
  - Trigger: Columns with many items (>50) increase prompt size
  - Response: Cap candidates to same-column items; consider truncation for very large columns

## Open questions
- None currently

## Change log
- 2026-02-12:
  - Change: Initial plan created
  - Reason: Starting M14+M15 implementation with BDD-First process
