# TODO

## Intent
Deliver M21: Internet Research for Input Discovery — a "Research" button in the Inputs column that searches the Internet based on the discovery goal, fetches and extracts page content, and proposes up to 10 input suggestions for analyst validation.

## Preconditions
- M1–M20: Delivered
- ROADMAP.md updated with M21
- Brave Search API key required (SEARCH_PROVIDER=brave, SEARCH_API_KEY)

## Tasks
- [x] Problem understanding and blocking questions (3 Q&A: search mechanism, result count, suggestion content)
- [x] Write functional specs for M21 (18 scenarios in internet-research-input-discovery.feature)
- [x] UoR validation of functional specs
- [x] Write technical specs for M21 (TS-InternetResearchInputDiscovery + TS-Research in OpenAPI)
- [x] UoR validation of technical specs
- [x] Create/update IMPLEMENTATION_PLAN.md (10 slices: search provider → page fetcher → prompts → provider → endpoint → query gen → nginx → component → button → status)
- [x] Write acceptance tests for M21 (15 tests in internet-research-input-discovery.test.ts)
- [x] UoR validation of implementation plan + acceptance tests
- [x] Implement M21 (10 slices: search provider, page fetcher, prompts, provider, endpoint, query gen, nginx, component, button, status)
- [x] All acceptance tests pass (193/193, 14 suites)
- [x] TypeScript compiles cleanly (frontend + backend)
- [x] Refactoring phase (static import in search provider, code review pass)
- [ ] Demo and user validation

## Validation
- All acceptance tests pass
- TypeScript compiles cleanly (frontend + backend)

## Done when
- "Research" button visible in Inputs column header when backend + search configured
- Button disabled when goal is empty
- Clicking triggers Internet search based on discovery goal
- Up to 10 suggestions displayed with title, summary, source URL, justification
- Accept adds new input of type "web" with URL preserved
- Edit inline before accepting works
- Reject removes suggestion, dismiss clears all
- Partial fetch failures show notice but display successful results
- Re-research replaces previous suggestions
- All CI gates green
- User validation complete
