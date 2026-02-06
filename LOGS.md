# Logs

## Mode Changes

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

## Outcomes

- 2026-02-06: Added `FS-ConcurrentUpdateLastWriteWins` scenario and acceptance test to document last-write-wins strategy as observable behavior.
- 2026-02-06: Fixed `traceability_check.sh` regex to support CamelCase FSID format.
- 2026-02-06: Corrected AsyncAPI spec — removed 2 stale BUG comments, fixed `FS-SseSubscribersNotRegistered` → `FS-SseSubscribersRegistered`.
