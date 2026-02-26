# Blackbox Tests

This directory contains Node/Jest blackbox tests for backend/API/domain behaviors.

Browser UI workflows are covered in `tests/e2e/` (Playwright).

## Rules (from AGENTS.md)

- One test file per feature
- Tests are black-box (for HTTP, use `httptest` + fake downstream servers)
- Gherkin is not executable (no step binding)
- Each blackbox test MUST reference FSID(s)
- Tests MUST be user-validated before implementation
