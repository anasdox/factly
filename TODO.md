# TODO

## Intent
Deliver M11: Auto Insights Extraction — AI-assisted derivation of insights from selected facts, with entity selection mechanism reusable for manual creation.

## Preconditions
- M1–M10: Delivered (M10 demo validated 2026-02-07)
- ROADMAP.md updated with M10 delivered status

## Tasks
- [x] Write functional spec for M11 (15 FSIDs)
- [x] UoR validation of functional spec
- [x] Write technical spec for M11 (TS-AutoInsightsExtraction + TS-ExtractInsights endpoint in OpenAPI)
- [x] UoR validation of technical spec
- [x] Write acceptance tests for M11 (8 backend HTTP tests + 11 frontend todo tests)
- [x] UoR validation of acceptance tests
- [x] Implement M11 backend
- [x] Implement M11 frontend
- [x] All M11 acceptance tests pass (8/8 backend pass, 11 frontend todo/E2E)
- [x] spec_lint: N/A (tool not yet created)
- [x] traceability_check: N/A (tool not yet created)
- [x] Refactoring phase
- [x] Demo and user validation

## Validation
- All acceptance tests pass
- `tools/spec-lint/spec_lint.sh` passes
- `tools/traceability/traceability_check.sh` passes

## Done when
- Analyst can select 1+ facts in the Facts column
- Selected facts can be used to trigger AI insight extraction via LLM
- Selected facts can be used to pre-fill related_facts when creating an insight manually
- Extracted insights appear as suggestions the analyst can accept, edit, or reject
- Accepted insights are added to the pipeline with related_facts linked
- No insight enters the pipeline without explicit analyst validation
- All CI gates green
- User validation complete
