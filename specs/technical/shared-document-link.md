# Shared Document Link — Technical Specification

- **x-tsid:** TS-SharedDocumentLink
- **x-fsid-links:**
  - FS-OpenSharedDocumentLinkShowsApplication
  - FS-ReloadDocumentPageShowsApplication
  - FS-OpenFeedbackPageDirectlyShowsApplication
  - FS-ApplicationStillReachesBackendServices
- **Decision:** `decisions/20261102-PrefixBackendApiPath.md`

## Root cause

In production the frontend and the backend share one origin: the frontend image
is built with `REACT_APP_API_URL=` (empty), so the browser calls the backend at
`/documents/<id>`, `/feedback`, ... and nginx proxies those prefixes to the
backend. Two UI routes (`apps/frontend/src/index.tsx`) start with a proxied
prefix:

| UI route | nginx location that captures it | Result on a direct load |
| --- | --- | --- |
| `/documents/:id` | `location /documents` | backend JSON for the document |
| `/feedback` | `location /feedback` | backend JSON for the idea list |

Client-side navigation never asks nginx for the page, so the bug only shows on
a direct load: a shared link, a new tab, or a reload.

## Change

The backend is reached under one reserved prefix, `/api/`, that no UI route
uses. nginx strips the prefix before proxying, so **the backend, its routes and
`backend-rest-api.openapi.yaml` are unchanged**: the OpenAPI paths are relative
to the server base, which becomes `/api` behind the production web server.

### Frontend build (`apps/frontend/Dockerfile`)

```
ENV REACT_APP_API_URL=/api
```

Every backend call already goes through `API_URL` (`src/config.ts`); no source
file changes. Local development (`npm start`) keeps its default
`http://localhost:3002` and is not affected.

### Web server (`apps/frontend/nginx.conf.template`)

| Location | Proxies to | Settings |
| --- | --- | --- |
| `/api/` | `${BACKEND_URL}/` (prefix stripped) | `client_max_body_size 5m`, read timeout 120s |
| `/api/events/` | `${BACKEND_URL}/events/` | SSE: buffering and cache off, HTTP/1.1, empty `Connection`, timeouts 86400s |
| `/api/chat` | `${BACKEND_URL}/chat` | streamed: buffering and cache off, HTTP/1.1, empty `Connection`, timeouts 120s |
| `/auth/` | `${BACKEND_URL}/auth/` | kept, **only** for the sign-in callback |
| `/` | `index.html` fallback | unchanged |
| `/static/`, `= /index.html` | files | unchanged |

Removed: the top-level `/documents`, `/events`, `/extract`, `/research`,
`/feedback`, `/dedup`, `/check`, `/propose`, `/reformulate`, `/chat`, `/me/`,
`/health` and `/status` locations. `/benchmark`, called by the frontend but
never proxied before, is reachable as `/api/benchmark/...`.

### Sign-in callback

The identity provider redirects the browser to
`${OAUTH_CALLBACK_BASE_URL}/auth/<provider>/callback`; that address is
registered with Pocket ID and is not changed. Sign-in now starts at
`/api/auth/<provider>`; the state cookie it sets has `path=/auth`, so the
browser still sends it to the callback. No UI route starts with `/auth`.

## Observable contract (what the acceptance test checks)

Against the frontend nginx config, with a fake backend that records every
request it receives:

| Request | Expected |
| --- | --- |
| `GET /documents/<id>`, `Accept: text/html` | 200, the application page (`index.html`); the backend receives nothing |
| `GET /feedback`, `Accept: text/html` | 200, the application page; the backend receives nothing |
| `GET /api/documents/<id>` | the backend receives `GET /documents/<id>` and its JSON is returned |
| `POST /api/documents/<id>/update` | the backend receives `POST /documents/<id>/update` with the body |
| `GET /api/events/<id>?uuid=u` | the backend receives `GET /events/<id>?uuid=u`; events stream unbuffered |
| `POST /api/chat` | the backend receives `POST /chat`; tokens stream unbuffered |
| `GET /api/auth/providers` | the backend receives `GET /auth/providers` |
| `GET /auth/pocketid/callback?code=c&state=s` | the backend receives it unchanged |
| `POST /api/extract/facts`, `/api/feedback`, `/api/benchmark/...` | the backend receives the path without `/api` |

## Test harness

`tests/blackbox/shared-document-link.test.ts` starts the fake backend on the
host, then runs `nginx:alpine` in Docker with the real `nginx.conf.template`
and `entrypoint.sh` mounted, a stub `index.html`, and
`BACKEND_URL=http://host.docker.internal:<port>`
(`--add-host=host.docker.internal:host-gateway`). It requires a running Docker
daemon; the test fails with an explicit message when none is reachable rather
than skipping.

## Risks

| Risk | Mitigation |
| --- | --- |
| An external monitor polls `https://<host>/health` | Point it at `/api/health`; noted in the demo note |
| A stale `index.html` in a browser still calls the old paths | `index.html` is served `no-store`; a reload picks up the new bundle |
