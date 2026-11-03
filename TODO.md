# TODO

## Current Status
M1–M23 delivered. Application ready for production deployment.

## Completed Today (Post-M22)
- [x] Remove `discovery_id` from data model (redundant with `document_id`)
- [x] Replace `?doc=uuid` URLs with `/documents/:id` routes
- [x] Remove `use-query-params` dependency
- [x] Restrict save to authenticated users
- [x] Redirect authenticated users to last document on `/`
- [x] Remove per-item "Propose AI update" button (redundant with bulk review)
- [x] Add `GET /health` endpoint with DB connectivity check
- [x] Add Docker HEALTHCHECK to both containers
- [x] Add missing nginx proxy routes (`/dedup`, `/check`, `/propose`, `/health`)
- [x] Migrate user store from JSON file to SQLite
- [x] Extract shared store module (`src/store.ts`)
- [x] Add rate limiting (LLM: 20/min, general: 120/min)
- [x] Add graceful shutdown (SIGTERM/SIGINT)
- [x] Update `.env.example` with all config options
- [x] Update `.gitignore` to exclude secret files
- [x] Write deployment guide in README
- [x] Update ROADMAP.md (M22 delivered, M23 delivered)

## Completed: Sign in with Pocket ID (M24)
Merged to `main`. Validated by UoR in the browser on 2026-09-21.

- [x] Functional spec — federated identity scenarios; two stale non-goals corrected
- [x] Technical spec — `specs/technical/federated-identity.md` + OpenAPI paths
- [x] Acceptance tests — `tests/blackbox/federated-identity.test.ts` (14, all green)
- [x] Implementation — Pocket ID provider, state/CSRF defence, form-encoded token
      exchange, `POST /auth/register` withdrawn with its sign-up UI
- [x] Pocket ID deployed at `https://id.betafactory.co` (own project, `../pocketid`)
- [x] Access gated by the `factly-users` group in Pocket ID
- [x] Passkey sign-in confirmed end to end by UoR
- [x] Demo note — `demos/FederatedIdentityPocketId/README.md`
- [x] Merged and deployed

## Completed: Discovery Language (M25)
Merged to `main`. Nine FSIDs, 15 acceptance tests, all green.

- [x] Functional spec — `specs/functional/discovery-language.feature`
- [x] Technical spec — `specs/technical/discovery-language.md`; also documents
      `/extract/recommendations` and `/extract/outputs`, live but previously
      absent from the OpenAPI contract
- [x] Acceptance tests — fake language model recording the system prompt
- [x] Implementation — `withLanguage`, seven languages, validated at generation
      and on save; excerpts never translated
- [x] Refactoring — language read the same way in all four endpoints
- [x] Demo note — `demos/DiscoveryLanguage/README.md`
- [ ] UoR to confirm in the browser

## Completed: Shared Document Link Fix (merged to `main`, deployed 2026-11-02)
Opening `/documents/<id>` directly returns backend JSON: nginx proxies the page
path to the backend. Fix: backend calls move under `/api/` (Q&A "Bug: a shared
document link shows raw JSON").

- [x] Decision record — `decisions/20261102-PrefixBackendApiPath.md` (no spec: bug fixes need no scenario, UoR 2026-11-02)
- [x] Regression test — `tests/blackbox/nginx-routing.test.ts`, real frontend nginx (Docker, or `NGINX_BIN`) in front of a fake backend; 24 red on the old config, 24 green on the fix
- [x] Implementation — nginx proxies `/api/` (prefix stripped) and `/auth/` (sign-in callback only); build sets `REACT_APP_API_URL=/api`
- [x] Full suite: no new failure (the 84 red are the pre-existing backend gap below); frontend typecheck + build green
- [x] Deployed to `factly.betafactory.co`: `/documents/<id>` and `/feedback` serve the application; `/api/*` reaches the backend; sign-in start, callback and event stream checked
- Note: public `/health` and `/status` are now `/api/health` and `/api/status`

## Completed: Share Button (M26)
First delivered 2026-11-02 as a dialog; simplified 2026-11-03 to copy in one click.

- [x] Functional spec — `specs/functional/share-button.feature` (5 FSIDs; dialog scenarios replaced by copy + copy-failure)
- [x] Technical spec — `specs/technical/share-button.md` (frontend only)
- [x] Acceptance tests — `tests/e2e/share-button.spec.ts` (6, green; 3 red before the change)
- [x] Implementation — Share click writes the link to the clipboard, info toast "Link copied to clipboard"; error toast with the link when the clipboard refuses; `ShareModal.tsx` removed
- [x] Full e2e suite: no new failure (33 pre-existing failures, identical on `main`)
- [x] Demo note — `demos/ShareButton/README.md`
- UoR: no human validation gate required (2026-11-03)

## Completed: Chat on reasoning models (bug fix, 2026-11-03)
Chat failed with "400 Function tools with reasoning_effort are not supported for
gpt-5.6-luna ... set reasoning_effort to 'none'".

- [x] Regression test — `tests/blackbox/chat-reasoning-model.test.ts` (6; 4 red before the fix), both OpenAI-style providers
- [x] Fix — `apps/backend/src/llm/request-fallbacks.ts`: retry with `reasoning_effort: 'none'`; chat stream also gets the temperature and token-parameter fallbacks
- [x] Full suite: 84 failures, all pre-existing (shared-backend / rate-limit gap); `bulk-review-workflow` fails the same 5 with or without the fix

## Completed: Reformulate an AI suggestion (M20 extension, 2026-11-03)
- [x] Functional spec — 5 FSIDs added to `specs/functional/ai-reformulation-suggestions.feature`
- [x] Technical spec — section in `specs/technical/ai-reformulation-suggestions.md` (frontend only, `/reformulate` unchanged)
- [x] Acceptance tests — `tests/e2e/reformulate-suggestions.spec.ts` (7, green; red before)
- [x] Implementation — `SuggestionsPanel` `reformulation` prop, wired in the facts, insights and recommendations panels
- [x] Full e2e: 88 passed, the same 33 pre-existing failures as `main`
- [x] Demo note — `demos/ReformulateSuggestions/README.md`
- Gap: `/reformulate` ignores the discovery language

## Open Question
How new users get an account is undecided. Pocket ID's `ALLOW_USER_SIGNUPS` is
`disabled`, so today an admin must create each user and send a login code.
Options are `withToken` (invite link, expiry and usage limit) or `open`.
`SIGNUP_DEFAULT_USER_GROUP_IDS` would auto-assign `factly-users`
(`0ed96aba-3f35-42d3-a824-16948d0104fa`). Awaiting UoR.

## Known Gaps (pre-existing, not introduced by this feature)
- Acceptance suite is red on `main`: 94 failures before this branch, unchanged by it.
  Local `apps/backend/.env` has no `JWT_SECRET`, and `server-side-persistence.test.ts`
  restarts the shared backend, leaving later suites without one.
- Traceability gate fails on 6 `REFERENCED_ONLY` FSIDs in `ai-assisted-updates`.
- Production OAuth for GitHub/Google remains unconfigured; web research needs
  `SEARCH_PROVIDER`/`SEARCH_API_KEY`.

## No Other Active Feature
Next milestone to be decided by UoR.
