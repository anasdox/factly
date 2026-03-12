# TODO

## Intent
Deliver M20: AI-Assisted Reformulation Suggestions — a "Reformulate" button in the create/edit modal proposes alternative wordings for facts, insights, and recommendations to improve clarity, precision, or actionability.

## Preconditions
- M1–M18: Delivered
- ROADMAP.md updated with M20

## Tasks
- [x] Problem understanding and blocking questions (3 Q&A: context scope, justification display, empty field behavior)
- [x] Write functional specs for M20 (17 scenarios in ai-reformulation-suggestions.feature)
- [x] UoR validation of functional specs
- [x] Write technical specs for M20 (TS-AiReformulationSuggestions + TS-Reformulate in OpenAPI)
- [ ] UoR validation of functional specs
- [ ] Write technical specs for M20
- [x] UoR validation of technical specs
- [x] Create/update IMPLEMENTATION_PLAN.md (5 slices: prompt+types → provider → endpoint → FactModal → other modals)
- [x] Write acceptance tests for M20 (22 tests in ai-reformulation-suggestions.test.ts)
- [x] UoR validation of implementation plan + acceptance tests
- [x] Implement M20 (5 slices: prompt+types, provider method, endpoint, FactModal, InsightModal+RecommendationModal)
- [x] All acceptance tests pass (22/22)
- [x] TypeScript compiles cleanly (frontend + backend)
- [x] Refactoring phase (extracted shared ReformulationSuggestion type, replaced inline styles with CSS class)
- [x] Demo and user validation (2026-03-12)

## Validation
- All acceptance tests pass
- TypeScript compiles cleanly (frontend + backend)

## Done when
- "Reformulate" button present in create/edit modal for facts, insights, and recommendations
- Analyst writes text first, then clicks "Reformulate" to get 2-3 suggestions
- Suggestions appear inline in the modal as a selectable list
- Analyst can pick a suggestion (replaces text field), edit further, or ignore
- No reformulation applied without analyst choice
- All CI gates green
- User validation complete
