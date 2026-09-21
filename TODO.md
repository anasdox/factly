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
