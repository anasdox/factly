# Global Technical Architecture

## System Boundaries

```
┌─────────────┐         HTTP (REST)          ┌──────────────┐
│   Frontend   │ ──────────────────────────── │   Backend    │
│  React SPA   │                              │  Express API │
│  (browser)   │ ◄──── SSE (text/event-stream)│              │
└─────────────┘                               └──────┬───────┘
                                                     │
                                                     │ File I/O
                                                     ▼
                                              ┌──────────────┐
                                              │  Keyv Store  │
                                              │  (JSON file) │
                                              └──────────────┘
```

## External Actors

| Actor | Description |
|-------|-------------|
| Analyst | Human user interacting via the browser frontend |

No external services, databases, or third-party APIs are used.

## Applications

### Frontend (`apps/frontend`)

| Attribute | Value |
|-----------|-------|
| Technology | React 18, TypeScript, Create React App |
| Routing | React Router 6 (single route `/`) |
| State management | React useState/useEffect (local component state) |
| Real-time | EventSource (SSE client) |
| UI components | FontAwesome icons, react-basic-modal-dialog |
| Build | react-scripts (CRA) |
| Port | 3000 (default CRA) |

**Responsibilities:**
- Render the discovery pipeline as a 5-column grid with visual relationship lines.
- Provide CRUD modals for each entity type.
- Handle JSON import/export of discovery data.
- Connect to backend SSE for collaborative sessions.
- Manage user identity (uuid, username) in localStorage.

### Backend (`apps/backend`)

| Attribute | Value |
|-----------|-------|
| Technology | Node.js, TypeScript, Express 4.x |
| Execution | ts-node (no build step for dev) |
| Storage | Keyv + keyv-file (JSON file in OS temp directory) |
| Real-time | Server-Sent Events (native implementation) |
| Logging | Winston (JSON, console transport) |
| Port | 3002 |

**Responsibilities:**
- Persist room data (discovery sessions) via Keyv store.
- Manage SSE connections per room.
- Broadcast updates to connected clients (currently non-functional).
- Generate UUIDs for rooms and usernames for anonymous clients.

## Communication Patterns

| Pattern | Protocol | Direction | Usage |
|---------|----------|-----------|-------|
| REST | HTTP | Frontend → Backend | CRUD on rooms (`POST /rooms`, `GET /rooms/:id`, `DELETE /rooms/:id`) |
| REST | HTTP | Frontend → Backend | Room updates (`POST /rooms/:id/update`) |
| SSE | HTTP (text/event-stream) | Backend → Frontend | Real-time push of credentials and room updates (`GET /events/:roomId`) |
| Status | HTTP | Frontend → Backend | Connected clients count (`GET /status`) |

## Storage

| Store | Technology | Scope | Persistence |
|-------|-----------|-------|-------------|
| Room data | Keyv + keyv-file | Backend | Temporary file in `os.tmpdir()`, random filename per server restart |
| User identity | localStorage | Frontend (browser) | Per-browser, persistent |
| Discovery data | React state | Frontend (browser) | In-memory only, lost on page refresh unless exported |

## Non-Functional Expectations

| Aspect | Current State |
|--------|--------------|
| Reliability | No error handling on API routes; no retry logic on SSE disconnection |
| Security | No authentication, no authorization, no input validation; CORS open to all origins |
| Scalability | Single-process, in-memory subscriber maps; file-based storage |
| Observability | Winston logging (debug level, console only) |

## Top Risks and Trade-offs

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `store.clear()` in `stopRoom` deletes ALL rooms, not just the target | Data loss for all active sessions | Fix to delete only the target room |
| SSE subscribers map never initialized per room | Clients cannot join rooms via SSE | Initialize Set in subscribers map when room is created |
| Broadcast function exists but is never called | Real-time collaboration is non-functional | Uncomment and fix `POST /rooms/:id/update` handler |
| Temp-file storage with random name | All data lost on server restart | Move to persistent storage or deterministic file path |
| No input validation on `POST /rooms` | Arbitrary data accepted and stored | Add schema validation |
| Frontend fetches `/data.json` on load | Requires static file; no integration with backend for initial load | Load from backend room or prompt user |
