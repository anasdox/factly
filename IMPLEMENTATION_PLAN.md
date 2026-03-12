# Implementation Plan

## Context
- Planning scope (program/release): M20 — AI-Assisted Reformulation Suggestions
- Roadmap links: M20 (AI-Assisted Reformulation Suggestions)
- Planning horizon: Single release cycle
- Scope summary: "Reformulate" button in create/edit modals for facts, insights, and recommendations. Backend endpoint calls LLM with item text + related items context + goal, returns 2-3 suggestions with justifications. Analyst picks, edits, or dismisses.
- Assumptions: M1–M18 delivered; existing LLM provider infrastructure reused; no new npm packages required

## Global feature sequencing
| Order | Feature | Outcome | Depends on | FSIDs | TSIDs | Acceptance tests | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Backend: reformulation prompt + types | REFORMULATION_SYSTEM_PROMPT, buildReformulationUserContent, parseReformulationSuggestions, ReformulationSuggestion type | — | FS-ReformulationUsesRelatedItemsContext, FS-ReformulationUsesDiscoveryGoal | TS-AiReformulationSuggestions | ai-reformulation-suggestions.test.ts | — | Planned |
| 2 | Backend: LLMProvider reformulate method | New reformulate() on provider interface + Anthropic/OpenAI/OpenAI-compatible implementations | 1 | FS-TriggerReformulationOnClick, FS-ReformulateButtonHiddenWhenNoLLM | TS-AiReformulationSuggestions | ai-reformulation-suggestions.test.ts | — | Planned |
| 3 | Backend: POST /reformulate endpoint | Express route with validation, LLM call, error handling | 1, 2 | FS-TriggerReformulationOnClick, FS-DisplayReformulationSuggestions, FS-ReformulationErrorShowsMessage, FS-ReformulationTimeoutShowsMessage | TS-Reformulate | ai-reformulation-suggestions.test.ts | — | Planned |
| 4 | Frontend: Reformulate button + suggestions UI in FactModal | "Reformulate" button, loading state, inline suggestions list, selection/dismiss behavior | 3 | FS-ReformulateButtonVisibleInFactModal, FS-ReformulateButtonDisabledWhenTextEmpty, FS-ReformulateButtonEnabledWhenTextPresent, FS-DisplayReformulationSuggestions, FS-SelectSuggestionReplacesText, FS-EditAfterSelectingSuggestion, FS-DismissSuggestionsKeepsOriginal, FS-ReformulateAgainAfterEdit | TS-AiReformulationSuggestions | ai-reformulation-suggestions.test.ts | — | Planned |
| 5 | Frontend: Reformulate in InsightModal + RecommendationModal | Replicate reformulation UI from FactModal to InsightModal and RecommendationModal | 4 | FS-ReformulateButtonVisibleInInsightModal, FS-ReformulateButtonVisibleInRecommendationModal | TS-AiReformulationSuggestions | ai-reformulation-suggestions.test.ts | — | Planned |

## Cross-feature dependencies and blockers
| Dependency | Upstream | Downstream | Impact if late | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Reformulation types + prompt | Slice 1 (prompts.ts) | Slices 2, 3 (provider, endpoint) | Blocks backend | Deliver first, zero risk | — | Open |
| LLM provider method | Slice 2 (providers) | Slice 3 (endpoint) | Blocks the endpoint | Can mock for frontend development | — | Open |
| Backend endpoint | Slice 3 | Slices 4, 5 (frontend modals) | Frontend can develop against mock data | Define response contract early (done in OpenAPI) | — | Open |
| FactModal reformulation UI | Slice 4 | Slice 5 (other modals) | Identical pattern, low risk | Extract shared logic in slice 4 for reuse in slice 5 | — | Open |

## Critical path and milestones
- Critical path: S1-Prompt → S2-Provider → S3-Endpoint → S4-FactModal → S5-OtherModals
- No parallel track needed (small feature, sequential delivery)
- Milestone: M20 Complete
  - Target date: —
  - Exit criteria: All acceptance tests pass, "Reformulate" button works in all 3 modals, suggestions display with justifications, selection replaces text, dismiss preserves original

## Validation checkpoints
- [x] Functional specs validated (17 scenarios)
- [x] Technical specs validated (TS-AiReformulationSuggestions + TS-Reformulate in OpenAPI)
- [ ] Acceptance tests validated
- [ ] Implementation done
- [ ] CI green (all acceptance tests pass, TypeScript clean)
- [ ] Refactoring validated (acceptance + full tests green)
- [ ] Demo prepared and validated by UoR

## Risks and trade-offs
- Risk: LLM returns fewer than 3 suggestions or inconsistent JSON
  - Trigger: Some models may return 1-2 suggestions instead of 3
  - Response: Accept 1-3 suggestions; parseReformulationSuggestions handles variable-length arrays
- Risk: Reformulation latency perceived as slow in modal context
  - Trigger: LLM call takes 2-5 seconds while analyst waits in modal
  - Response: Clear loading spinner on button; text field remains editable during loading
- Risk: Suggestions for recommendations may not be actionable enough
  - Trigger: LLM reformulates recommendation as insight-like statement
  - Response: Prompt explicitly instructs per entity_type; analyst can dismiss and reformulate again

## Open questions
- None currently

## Change log
- 2026-03-12:
  - Change: New plan created for M20 (replacing M18 plan)
  - Reason: M18 delivered and validated; starting M20 AI-Assisted Reformulation Suggestions
