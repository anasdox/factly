# Acceptance Backend Tests

This directory contains Node/Jest acceptance tests for backend/API/domain behaviors.

Browser UI workflows are covered in `tests/e2e/` (Playwright).

## Rules (from AGENTS.md)

- One test file per feature
- Tests are black-box (for HTTP, use `httptest` + fake downstream servers)
- Gherkin is not executable (no step binding)
- Each acceptance test MUST reference FSID(s)
- Tests MUST be user-validated before implementation
