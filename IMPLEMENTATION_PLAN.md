# Implementation Plan

## Context
- Planning scope: M22 — User Management and Authentication
- Roadmap links: M22
- Scope summary: Optional JWT auth with login/password. Users created via `make add-user`. Authenticated users own their discoveries and see visited ones. Only owners can delete. Anonymous access fully preserved.
- Assumptions: M1–M21 delivered. New dependencies: `bcrypt`, `jsonwebtoken`.

## Global feature sequencing
| Order | Feature | Depends on | FSIDs | Acceptance tests | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Backend: user-store module + add-user script + Makefile | — | FS-CreateUserViaCli, FS-CreateUserDuplicateRejected, FS-CreateUserMissingParams | user-management-authentication.test.ts | Planned |
| 2 | Backend: JWT module (sign/verify) | — | FS-ExpiredTokenRejected, FS-InvalidTokenRejected | user-management-authentication.test.ts | Planned |
| 3 | Backend: auth middleware (optionalAuth, requireAuth) | 2 | FS-AnonymousAccessPreserved, FS-PersonalSpaceRequiresAuth | user-management-authentication.test.ts | Planned |
| 4 | Backend: POST /auth/login endpoint | 1, 2 | FS-LoginWithValidCredentials, FS-LoginWithInvalidPassword, FS-LoginWithNonexistentUser, FS-LoginMissingFields | user-management-authentication.test.ts | Planned |
| 5 | Backend: ownership on POST /rooms + deletion auth on DELETE /rooms/:id | 3 | FS-AnonymousCreateDiscovery, FS-AuthenticatedCreateDiscoverySetsOwner, FS-OwnershipDoesNotRestrictAccess, FS-OwnerCanDeleteDiscovery, FS-NonOwnerCannotDeleteDiscovery, FS-AnonymousCannotDeleteOwnedDiscovery, FS-AnonymousCannotDeleteAnyDiscovery | user-management-authentication.test.ts | Planned |
| 6 | Backend: visit tracking on GET /rooms/:id + GET /me/discoveries | 3, 5 | FS-VisitedDiscoveryTracked, FS-VisitedDiscoveryTrackingIdempotent, FS-PersonalSpaceListsOwnedDiscoveries, FS-PersonalSpaceListsVisitedDiscoveries, FS-OwnDiscoveryNotInVisited | user-management-authentication.test.ts | Planned |
| 7 | Nginx: proxy /auth/ and /me/ routes | 4, 6 | — | — | Planned |
| 8 | Frontend: AuthContext + LoginPage + PersonalSpace + navigation | 4, 6, 7 | — | — | Planned |

## Cross-feature dependencies and blockers
| Dependency | Upstream | Downstream | Mitigation |
| --- | --- | --- | --- |
| User store | S1 | S4 (login) | Can hardcode test user |
| JWT module | S2 | S3 (middleware), S4 (login) | Deliver first |
| Auth middleware | S3 | S5 (ownership), S6 (visit tracking) | Core building block |
| Backend routes | S4, S5, S6 | S7 (nginx), S8 (frontend) | Frontend can dev against mock |

## Critical path
S1 + S2 (parallel) → S3 → S4 → S5 → S6 → S7 → S8

## Validation checkpoints
- [x] Functional specs validated (23 scenarios)
- [x] Technical specs validated (TS-UserManagementAuthentication + OpenAPI)
- [x] Acceptance tests written (23 tests)
- [ ] Acceptance tests validated by UoR
- [ ] Implementation done
- [ ] CI green
- [ ] Refactoring done
- [ ] Demo validated by UoR
