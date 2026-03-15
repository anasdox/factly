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

## No Active Feature
Next milestone to be decided by UoR.
