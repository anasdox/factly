# Implementation Plan

## Context
- Planning scope (program/release): M21 — Internet Research for Input Discovery
- Roadmap links: M21 (Internet Research for Input Discovery)
- Planning horizon: Single release cycle
- Scope summary: "Research" button in Inputs column. Backend calls Web Search API (Brave), fetches page content, LLM filters and structures up to 10 suggestions with title/summary/URL/justification. Analyst accepts, edits, or rejects suggestions as new inputs of type "web".
- Assumptions: M1–M20 delivered; cheerio already a dependency; new dependencies: none (Brave Search API via fetch); new env vars: SEARCH_PROVIDER, SEARCH_API_KEY, LLM_TEMP_RESEARCH

## Global feature sequencing
| Order | Feature | Outcome | Depends on | FSIDs | TSIDs | Acceptance tests | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Backend: Search provider abstraction + Brave implementation | SearchProvider interface, BraveProvider calling Brave Search API | — | FS-TriggerResearchSendsGoal | TS-InternetResearchInputDiscovery | internet-research-input-discovery.test.ts | — | Planned |
| 2 | Backend: Page fetcher | fetchPageContent() using fetch + cheerio, parallel with timeout, truncation | — | FS-ResearchPageFetchPartialFailure | TS-InternetResearchInputDiscovery | internet-research-input-discovery.test.ts | — | Planned |
| 3 | Backend: Research LLM prompt + types | RESEARCH_SYSTEM_PROMPT, ResearchSuggestion type, buildResearchUserContent(), parseResearchSuggestions() | — | FS-ResearchReturnsUpToTenSuggestions, FS-SuggestionDisplaysTitle, FS-SuggestionDisplaysSummary, FS-SuggestionDisplaysSourceUrl, FS-SuggestionDisplaysRelevanceJustification | TS-InternetResearchInputDiscovery | internet-research-input-discovery.test.ts | — | Planned |
| 4 | Backend: LLM provider research() method | Add research() to LLMProvider interface + all 3 implementations | 3 | FS-TriggerResearchSendsGoal | TS-InternetResearchInputDiscovery | internet-research-input-discovery.test.ts | — | Planned |
| 5 | Backend: POST /research endpoint | Express route: validate → search → fetch pages → LLM filter → respond | 1, 2, 3, 4 | FS-TriggerResearchSendsGoal, FS-ResearchReturnsUpToTenSuggestions, FS-ResearchErrorDisplaysMessage, FS-ResearchNoResultsDisplaysMessage, FS-ResearchPageFetchPartialFailure | TS-Research | internet-research-input-discovery.test.ts | — | Planned |
| 6 | Backend: Search query generation via LLM | LLM generates 2-3 search queries from goal for broader coverage | 3, 4 | FS-TriggerResearchSendsGoal | TS-InternetResearchInputDiscovery | internet-research-input-discovery.test.ts | — | Planned |
| 7 | Nginx: Add /research proxy route | proxy_pass with 120s timeout | 5 | — | — | — | — | Planned |
| 8 | Frontend: ResearchSuggestions component | Suggestion cards with title, summary, URL, justification, accept/edit/reject/dismiss | 5 | FS-SuggestionDisplaysTitle, FS-SuggestionDisplaysSummary, FS-SuggestionDisplaysSourceUrl, FS-SuggestionDisplaysRelevanceJustification, FS-AcceptSuggestionAddsInput, FS-RejectSuggestionRemovesIt, FS-EditSuggestionBeforeAccepting, FS-AcceptMultipleSuggestions, FS-DismissAllSuggestions | TS-InternetResearchInputDiscovery | internet-research-input-discovery.test.ts | — | Planned |
| 9 | Frontend: Research button in InputList + searchAvailable status | Button in Inputs column header, disabled without goal, hidden without backend/search | 5, 8 | FS-ResearchButtonVisibleInInputColumn, FS-ResearchButtonDisabledWithoutGoal, FS-ResearchButtonDisabledWithoutBackend, FS-ReResearchAllowed | TS-InternetResearchInputDiscovery | internet-research-input-discovery.test.ts | — | Planned |
| 10 | Backend: searchAvailable in /status response | Return searchAvailable flag based on SEARCH_PROVIDER + SEARCH_API_KEY config | — | FS-ResearchButtonDisabledWithoutBackend | TS-InternetResearchInputDiscovery | internet-research-input-discovery.test.ts | — | Planned |

## Cross-feature dependencies and blockers
| Dependency | Upstream | Downstream | Impact if late | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Search provider | Slice 1 (search provider) | Slice 5 (endpoint) | Blocks endpoint | Can mock search results | — | Open |
| Page fetcher | Slice 2 (page fetcher) | Slice 5 (endpoint) | Blocks endpoint | Can mock page content | — | Open |
| LLM prompt + types | Slice 3 (prompts) | Slices 4, 5, 6 (provider, endpoint, query gen) | Blocks all LLM work | Deliver first | — | Open |
| LLM provider method | Slice 4 (provider) | Slices 5, 6 (endpoint, query gen) | Blocks endpoint | Can mock LLM | — | Open |
| Backend endpoint | Slice 5 (endpoint) | Slices 7, 8, 9 (nginx, frontend) | Frontend can dev against mock | Contract defined in OpenAPI | — | Open |
| ResearchSuggestions component | Slice 8 | Slice 9 (button integration) | Blocks button wiring | Can develop in parallel | — | Open |

## Critical path and milestones
- Critical path: S3-Prompt → S4-Provider → (S1-Search + S2-Fetcher parallel) → S5-Endpoint → S7-Nginx → S8-Component → S9-Button
- S1 and S2 can be developed in parallel (no dependency between them)
- S6 (query generation) can be done alongside S5
- S10 (status flag) is independent
- Milestone: M21 Complete
  - Exit criteria: All acceptance tests pass, "Research" button works in Inputs column, up to 10 suggestions displayed with title/summary/URL/justification, accept adds web input, reject removes suggestion, edit inline works, dismiss clears all

## Validation checkpoints
- [x] Functional specs validated (18 scenarios)
- [x] Technical specs validated (TS-InternetResearchInputDiscovery + TS-Research in OpenAPI)
- [ ] Acceptance tests validated
- [ ] Implementation done
- [ ] CI green (all acceptance tests pass, TypeScript clean)
- [ ] Refactoring validated (acceptance + full tests green)
- [ ] Demo prepared and validated by UoR

## Risks and trade-offs
- Risk: Brave Search API rate limits (2000 free requests/month)
  - Trigger: Heavy usage exceeds free tier
  - Response: Monitor usage; consider caching search results for identical goals
- Risk: Page fetch failures (sites blocking bots, timeouts, paywalls)
  - Trigger: Many pages return empty or blocked content
  - Response: Partial failure handling (show what worked); set reasonable timeout (10s)
- Risk: LLM context window limits with 20 pages of content
  - Trigger: 20 pages × 5000 chars = 100K chars may exceed model limits
  - Response: Truncate total content to fit context; prioritize pages with best snippets
- Risk: Total endpoint latency (search + fetch + LLM) may be too slow
  - Trigger: 15s search + 10s fetch + 60s LLM = up to 85s
  - Response: Parallel page fetching; clear progress indicator in UI; 120s nginx timeout
- Risk: Extracted content quality varies (boilerplate, ads, cookie notices)
  - Trigger: cheerio extraction picks up non-content text
  - Response: Strip common boilerplate elements (nav, footer, aside, script, style); LLM filters noise

## Open questions
- None currently

## Change log
- 2026-03-13:
  - Change: New plan created for M21 (replacing M20 plan)
  - Reason: M20 delivered and validated; starting M21 Internet Research for Input Discovery
