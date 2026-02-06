# TODO

## Intent
Deliver M8: Server-Side Persistence — discovery data survives server restarts.

## Preconditions
- M1–M5: Delivered
- M6 (Fix Room Lifecycle Bugs): All 5 bugs resolved (BUG-01 to BUG-05)
- M7 (Real-Time Collaborative Sessions): Delivered
- Acceptance tests pass (11 suites, 18 passed, 43 todo)
- Traceability check passes
- Spec lint passes
- AGENTS_MODE=standard

## Tasks
- [x] Write functional spec for M8 (FS-RoomDataSurvivesRestart, FS-RoomDeletionSurvivesRestart, FS-StoragePathDeterministic)
- [x] Write technical spec for M8 (TS-ServerSidePersistence)
- [x] Write acceptance tests for M8 (3 tests, all pass)
- [x] Implement M8: replace keyv-file with @keyv/sqlite, deterministic path
- [x] Refactoring: error handler, DB path logging, remove keyv-file dependency
- [x] All acceptance tests pass (11 suites, 18 passed, 43 todo)
- [x] spec_lint: OK
- [x] traceability_check: OK
- [x] Demo and user validation (UoR validated 2026-02-06)

## Validation
- All acceptance tests pass
- `tools/spec-lint/spec_lint.sh` passes
- `tools/traceability/traceability_check.sh` passes

## Done when
- Discovery data survives server restarts
- Deleted rooms remain deleted after restart
- Rooms from different lifecycles coexist
- All CI gates green
- User validation complete
