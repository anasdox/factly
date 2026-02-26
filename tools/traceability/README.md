# Traceability Tool

This tool verifies that all FSIDs in functional specs are referenced by executable tests and produces a report.

## Behavior
- If `specs/functional/` does not exist, the script exits OK to reflect template state.
- If specs exist, missing executable coverage fails the check.
- Scans both `tests/blackbox/` (Jest/Node) and `tests/e2e/` (Playwright) when present.
- `test.todo()` references are reported as `TODO_ONLY` and do not count as coverage.

## Output
- `traceability-report.md` in the repository root

## Usage
Run:
```
sh ./tools/traceability/traceability_check.sh
```
