# Decision: Prefix the Backend API Path

**Date:** 2026-11-02
**Status:** Approved by UoR (option chosen 2026-11-02, Q&A "Bug: a shared document link shows raw JSON")

## Context
In production the frontend and backend share one origin, and nginx proxies a
list of backend path prefixes (`/documents`, `/feedback`, ...). The UI routes
`/documents/:id` and `/feedback` start with those same prefixes.

## Problem
Opening a document link directly (shared link, new tab, reload) returns the
backend's JSON instead of the application. Every new backend route also
requires a new nginx location, and `/benchmark` was never added.

## Options Considered
1. **Route by `Accept` header in nginx** — smallest change, but UI and API
   still share paths; any client that sends `Accept: text/html` to the API, or a
   UI route that collides with a future API route, breaks again.
2. **Prefix every backend call with `/api`** — one reserved namespace, one
   nginx location; the frontend build sets `REACT_APP_API_URL=/api`.
3. **Rename the UI route** — simple, but breaks every link already shared.

## Decision
**Option 2.** nginx proxies `/api/` to the backend with the prefix stripped, so
the backend and its OpenAPI contract are unchanged. `/auth/` stays proxied for
the identity provider's sign-in callback only, so the callback address
registered with Pocket ID does not change.

## Consequences
- **Positive:** UI and API paths can no longer collide; new backend routes need
  no nginx change.
- **Positive:** `/benchmark` becomes reachable in production.
- **Cost:** `/health` and `/status` move to `/api/health` and `/api/status` on
  the public host; external monitors must be updated.
- **Cost:** the regression test needs a Docker daemon.

## Related Hypotheses
- H1: a single reserved prefix removes this class of bug for every current and
  future UI route.

## Affected Features
- Shared Document Link (`specs/functional/shared-document-link.feature`)
- Every feature whose frontend calls the backend (transport only, no behavior change)
