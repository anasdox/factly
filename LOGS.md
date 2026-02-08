# Logs

## Mode Changes

### 2026-02-07 — ungated → standard
- **Previous mode:** `ungated`
- **New mode:** `standard`
- **Reason:** Template and process development objective achieved. Switching back to standard BDD-first delivery for feature work.

### 2026-02-06 — reverse_engineering → standard
- **Previous mode:** `reverse_engineering`
- **New mode:** `standard`
- **Reason:** Reverse engineering onboarding objective achieved. Foundation artifacts, functional specs, technical specs, and acceptance tests are in place. Switching to standard BDD-first delivery for all future work.

## Decisions log

- **Date:** 2026-02-06
- **Decision:** M6 (Fix Room Lifecycle Bugs) validated as complete — all 5 bugs (BUG-01 to BUG-05) resolved in existing code.
- **Consequence:** Proceed to M7 assessment.

- **Date:** 2026-02-06
- **Decision:** M7 (Real-Time Collaborative Sessions) validated as complete — backend broadcast, frontend SSE reception, and last-write-wins strategy all implemented and tested.
- **Consequence:** Fixed stale documentation in AsyncAPI spec (removed incorrect BUG comments, corrected FSID reference). Proceed to M8.

- **Date:** 2026-02-07
- **Decision:** M10 (Auto Facts Extraction from Text) validated as complete — LLM provider abstraction, POST /extract/facts endpoint, frontend Extract Facts button, SuggestionsPanel, and InputModal textarea fix delivered.
- **Consequence:** Proceed to M11 (Auto Insights Extraction).

## Outcomes

- 2026-02-07: M11 implementation complete. Backend: POST /extract/insights endpoint with validation, extractInsights in both LLM providers. Frontend: fact selection mechanism (click-to-toggle), SelectionToolbar, AI insight generation via SuggestionsPanel, manual insight creation with pre-filled related_facts via InsightModal. Refactoring: extracted parseStringArray helper to deduplicate providers, extracted extractText per-provider helper, consolidated addInsightToData in FactList, stabilized handleCloseSuggestions with useCallback. All 8 backend acceptance tests pass.
- 2026-02-07: M10 demo validated. Refactoring: extracted shared LLM prompt, replaced dynamic requires with static imports, added max_tokens to OpenAI provider, fixed InputModal (textarea for text type, conditional URL/text field), fixed saveInput ignoring form data in add mode, removed default discovery loading in favor of localStorage persistence with welcome screen.

- 2026-02-06: Added `FS-ConcurrentUpdateLastWriteWins` scenario and acceptance test to document last-write-wins strategy as observable behavior.
- 2026-02-06: Fixed `traceability_check.sh` regex to support CamelCase FSID format.
- 2026-02-06: Corrected AsyncAPI spec — removed 2 stale BUG comments, fixed `FS-SseSubscribersNotRegistered` → `FS-SseSubscribersRegistered`.
