# Demo Notes — M8: Server-Side Persistence

## Date
2026-02-06

## Feature
M8: Server-Side Persistence

## Demo Environment
```bash
./demos/ServerSidePersistence/demo.sh
```
Prerequisites: `npm install` done in `apps/backend/`. The script starts/stops the backend automatically and cleans up the DB file on exit.

## Implemented Scope
- `keyv-file` (random temp path) replaced by `@keyv/sqlite` with deterministic path `apps/backend/data/factly.db`
- Room data survives server restarts
- Deleted rooms remain deleted after restart
- Rooms from different server lifecycles coexist
- Error handler on Keyv store
- DB path logged at startup
- `keyv-file` dependency removed

## Not Implemented Scope
- Migration of data from old temp-file storage
- Backup or replication
- Encryption at rest
- Automatic data pruning or expiration
- Multi-instance / clustered storage

## Limitations
- SQLite is single-writer; concurrent write-heavy workloads may block
- DB file grows without pruning — manual cleanup required if needed
- No migration path from previously created temp files (data is lost on upgrade)

## Validation Status
- [x] All acceptance tests pass (11 suites, 18 passed, 43 todo)
- [x] `tools/spec-lint/spec_lint.sh` passes
- [x] `tools/traceability/traceability_check.sh` passes
- [x] Refactoring phase completed

## User Validation
- [x] Demo presented to UoR
- [x] UoR approved merge (2026-02-06)
