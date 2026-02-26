# TODO

## Hotfix
Fix first-time room invite navigation so a user opening `?room=<id>` without local discovery data lands in the room directly instead of the welcome home screen.

- [x] Add/adjust BDD spec coverage for first-time room join via invite link
- [x] Add frontend regression test for initial room bootstrap from URL query
- [x] Fix frontend bootstrap flow so room data loads before welcome screen renders

## Test Governance Audit Hardening
Make acceptance traceability and spec linting reflect executable coverage instead of counting placeholder references.

- [x] Audit `tests/blackbox` for `test.todo` / placeholder patterns
- [x] Fix `tools/spec-lint/spec_lint.sh` acceptance test file glob (`*.test.ts`)
- [x] Tighten `tools/traceability/traceability_check.sh` to require executable `@fsid` blocks (not `test.todo`)
- [x] Generate updated `traceability-report.md` and review uncovered FSIDs

## E2E Pilot Migration (UI Acceptance)
Introduce Playwright for browser-based UI scenarios and migrate Output Management from placeholder acceptance tests to executable E2E coverage.

- [x] Add Playwright E2E test project scaffold in `tests/e2e/`
- [x] Migrate `Output Management` placeholder acceptance tests to Playwright E2E spec
- [x] Extend traceability scan to include `tests/e2e/`
- [x] Install Playwright dependency + browsers locally and run `tests/e2e/output-management.spec.ts`

## E2E UI Coverage Expansion
Continue migrating browser-only placeholder acceptance tests (`test.todo`) from `tests/blackbox/` to executable Playwright specs in `tests/e2e/`.

- [x] Migrate `Discovery Management` to Playwright E2E (`discovery-management.spec.ts`)
- [x] Migrate `Input Management` to Playwright E2E and align functional spec with current UI behavior
- [x] Migrate `Fact Management` to Playwright E2E (`fact-management.spec.ts`)
- [x] Migrate `Insight Management` to Playwright E2E (`insight-management.spec.ts`)
- [x] Migrate `Recommendation Management` to Playwright E2E (`recommendation-management.spec.ts`)
- [x] Migrate `Discovery Import/Export` to Playwright E2E and align `FS-LoadInitialData` with current UI behavior
- [x] Migrate `Relationship Visualization` to Playwright E2E and align hover-highlight specs with current UI behavior
- [x] Migrate remaining UI placeholders inside mixed acceptance files (`auto-*`, `ai-assisted-updates`, `staleness-propagation`, `semantic-deduplication`)
- [x] Add E2E coverage for remaining traceability gaps (`FS-DisplayErrorToastOnBackendError`, `FS-JoinRoomViaInviteFirstUse`)
- [x] Remove all `test.todo` from `tests/blackbox` and restore `traceability_check: OK`

## Intent
Deliver M18: Conversational Chat on Discovery — an analyst can chat with Factly about the current discovery to ask questions, get explanations, and request modifications (add/delete/edit items) with explicit confirmation before any change is applied.

## Preconditions
- M1–M17: Delivered (M16+M17 validated 2026-02-18)
- ROADMAP.md updated with M18

## Tasks
- [x] Problem understanding and blocking questions (4 Q&A: widget style, tool calling, streaming, context strategy)
- [x] Write functional specs for M18 (38 scenarios in conversational-chat.feature)
- [x] UoR validation of functional specs
- [x] Write technical specs for M18 (TS-ConversationalChat + TS-ChatMessage in OpenAPI)
- [x] UoR validation of technical specs
- [x] Create/update IMPLEMENTATION_PLAN.md (10 slices, 5 cross-feature dependencies)
- [x] Write acceptance tests for M18 (45 tests in conversational-chat.test.ts, all passing)
- [x] UoR validation of implementation plan + acceptance tests
- [x] Implement M18 (10 slices: types, prompts, provider, endpoint, hook, widget, @mention, action cards, history, integration)
- [x] All acceptance tests pass (49/49)
- [x] TypeScript compiles cleanly (frontend + backend)
- [x] Refactoring phase (minor: import ordering, generateId placement)
- [x] Demo and user validation (2026-02-18)

## Validation
- All acceptance tests pass
- TypeScript compiles cleanly (frontend + backend)

## Done when
- Chat panel accessible from an open discovery session
- Chat is context-aware (sees full discovery state)
- Analyst can ask Factly to add items (with confirmation)
- Analyst can ask Factly to delete items (with dependency warning + confirmation)
- Analyst can ask Factly to edit items (with before/after diff + confirmation)
- Analyst can ask questions about the discovery and get contextual answers
- Factly can proactively propose improvements and next steps
- No modification applied without explicit analyst confirmation
- Chat history persisted per discovery session
- All CI gates green
- User validation complete
