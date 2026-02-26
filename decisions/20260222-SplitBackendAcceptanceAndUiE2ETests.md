# Decision: Split Backend Acceptance and UI E2E Tests

**Date:** 2026-02-22
**Status:** Approved by UoR

## Context
The repository currently uses `tests/blackbox/` (Jest + Node environment) for acceptance testing. Many UI-oriented scenarios are represented as `test.todo()` placeholders because they require a real browser rendering environment (hover interactions, modal behavior, visual toolbars, and other user-driven workflows).

The traceability tooling historically counted FSIDs as covered based on plain text references, which allowed placeholder tests to appear covered even when no executable test existed.

## Problem
UI behaviors defined in functional specs are not being validated by executable tests in the current Node-based acceptance suite. This creates a gap between BDD specifications and actual verification, especially for CRUD workflows in the frontend (e.g., Output Management).

## Options Considered

1. **Keep all acceptance tests in Jest/Node** — Fast and simple, but UI workflows remain untested or require extensive mocking that does not reflect real browser behavior.
2. **Use RTL only for UI workflows** — Better than placeholders, but still misses end-to-end behavior across routing, localStorage, modals, and hover/overlay interactions.
3. **Split test strategy: backend acceptance in Jest/Node + UI workflows in Playwright E2E** — Adds tooling complexity, but aligns test execution environment with the behavior being specified.

## Decision
**Option 3: Split the strategy.**

- Keep `tests/blackbox/` for backend/API/domain acceptance tests (Jest, Node).
- Introduce `tests/e2e/` for browser-executed UI acceptance coverage (Playwright).
- Migrate `Output Management` from a placeholder acceptance file to executable Playwright E2E tests as the pilot.
- Update traceability checks to scan both `tests/blackbox` and `tests/e2e`.

## Consequences

- **Positive:** UI BDD scenarios can be validated in a real browser environment.
- **Positive:** Traceability becomes more honest once executable E2E tests are added.
- **Cost:** Additional tooling dependency (`@playwright/test`) and browser installation.
- **CI Impact:** CI pipeline must add an E2E job (frontend server startup + Playwright execution).
- **Migration Work:** Existing `test.todo()` UI placeholders need phased conversion to E2E tests.

## Related Hypotheses
- H1: Converting one UI feature (Output Management) to Playwright E2E will materially reduce ambiguity in acceptance coverage.
- H2: A split strategy will improve signal quality without slowing backend acceptance tests significantly.

## Affected Features
- Output Management (FS-AddOutput, FS-SaveNewOutput, FS-EditOutput, FS-SaveEditedOutput, FS-DeleteOutput)
- `tools/traceability/traceability_check.sh`
- `tests/blackbox/` (scope clarified as backend/API/domain)
- `tests/e2e/` (new UI E2E test suite)
