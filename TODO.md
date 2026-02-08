# TODO

## Intent
Deliver M13: Auto Outputs Formulation — AI-assisted formulation of structured outputs from selected recommendations, with selection mechanism reusable for manual creation.

## Preconditions
- M1–M12: Delivered (M12 demo validated 2026-02-07)
- ROADMAP.md updated with M12 delivered status

## Tasks
- [x] Write functional spec for M13 (16 FSIDs, with output types)
- [x] UoR validation of functional spec
- [x] Write technical spec for M13 (TS-AutoOutputsFormulation + POST /extract/outputs + output types)
- [x] UoR validation of technical spec
- [x] Write acceptance tests for M13 (14 backend HTTP + 12 frontend todo)
- [x] UoR validation of acceptance tests
- [x] Implement M13 backend
- [x] Implement M13 frontend
- [x] All M13 acceptance tests pass (16/16 suites, 63/63 tests)
- [ ] Refactoring phase
- [ ] Demo and user validation

## Validation
- All acceptance tests pass
- TypeScript compiles cleanly (frontend + backend)

## Done when
- Analyst can select 1+ recommendations in the Recommendations column
- Selected recommendations can be used to trigger AI output formulation via LLM
- Selected recommendations can be used to pre-fill related_recommendations when creating an output manually
- Formulated outputs appear as suggestions the analyst can accept, edit, or reject
- Accepted outputs are added to the pipeline with related_recommendations linked
- No output enters the pipeline without explicit analyst validation
- All CI gates green
- User validation complete
