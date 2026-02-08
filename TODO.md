# TODO

## Intent
Deliver M12: Auto Recommendations Extraction — AI-assisted formulation of recommendations from selected insights, with selection mechanism reusable for manual creation.

## Preconditions
- M1–M11: Delivered (M11 demo validated 2026-02-07)
- ROADMAP.md updated with M11 delivered status

## Tasks
- [x] Write functional spec for M12 (15 FSIDs)
- [x] UoR validation of functional spec
- [x] Write technical spec for M12 (TS-AutoRecommendationsExtraction + POST /extract/recommendations)
- [x] UoR validation of technical spec
- [x] Write acceptance tests for M12 (8 backend HTTP + 11 frontend todo)
- [x] UoR validation of acceptance tests
- [x] Implement M12 backend
- [x] Implement M12 frontend
- [x] All M12 acceptance tests pass (8/8 backend pass, 11 frontend todo/E2E)
- [x] Refactoring phase
- [x] Demo and user validation

## Validation
- All acceptance tests pass
- TypeScript compiles cleanly (frontend + backend)

## Done when
- Analyst can select 1+ insights in the Insights column
- Selected insights can be used to trigger AI recommendation extraction via LLM
- Selected insights can be used to pre-fill related_insights when creating a recommendation manually
- Extracted recommendations appear as suggestions the analyst can accept, edit, or reject
- Accepted recommendations are added to the pipeline with related_insights linked
- No recommendation enters the pipeline without explicit analyst validation
- All CI gates green
- User validation complete
