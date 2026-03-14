# TODO

## Intent
Deliver M22: User Management and Authentication — optional login/password auth with JWT, personal discovery space (owned + saved), and `make add-user` CLI command. All discoveries remain public.

## Preconditions
- M1–M21: Delivered
- ROADMAP.md updated with M22
- Q&A recorded (4 questions: auth integration, session mechanism, CLI format, storage)

## Tasks
- [x] Problem understanding and blocking questions (4 Q&A)
- [x] Write functional specs for M22 (23 scenarios in user-management-authentication.feature)
- [x] UoR validation of functional specs
- [x] Write technical specs for M22 (TS-UserManagementAuthentication + OpenAPI updates)
- [x] UoR validation of technical specs
- [x] Create/update IMPLEMENTATION_PLAN.md (8 slices)
- [x] Write acceptance tests for M22 (23 tests in user-management-authentication.test.ts)
- [x] UoR validation of implementation plan + acceptance tests
- [x] Implement M22 (8 slices: user-store, JWT, middleware, login, ownership, visit tracking, nginx, frontend)
- [ ] All acceptance tests pass
- [x] TypeScript compiles cleanly (frontend + backend)
- [ ] Refactoring phase
- [ ] Demo and user validation

## Validation
- All acceptance tests pass
- TypeScript compiles cleanly (frontend + backend)
- Traceability check passes

## Done when
- `make add-user USER=login PASS=password` creates a user with hashed password in `data/users.json`
- `POST /auth/login` returns a JWT token for valid credentials
- Anonymous access to all existing routes is preserved (no auth required)
- Authenticated user is set as owner when creating a discovery
- Personal space lists "My discoveries" (created) and "Shared with me" (visited)
- All CI gates green
- User validation complete
