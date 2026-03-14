# User Management and Authentication — Technical Specification

- **x-tsid:** TS-UserManagementAuthentication
- **x-fsid-links:**
  - FS-CreateUserViaCli
  - FS-CreateUserDuplicateRejected
  - FS-CreateUserMissingParams
  - FS-LoginWithValidCredentials
  - FS-LoginWithInvalidPassword
  - FS-LoginWithNonexistentUser
  - FS-LoginMissingFields
  - FS-AnonymousAccessPreserved
  - FS-AnonymousCreateDiscovery
  - FS-AuthenticatedCreateDiscoverySetsOwner
  - FS-OwnershipDoesNotRestrictAccess
  - FS-PersonalSpaceListsOwnedDiscoveries
  - FS-PersonalSpaceRequiresAuth
  - FS-OwnerCanDeleteDiscovery
  - FS-NonOwnerCannotDeleteDiscovery
  - FS-AnonymousCannotDeleteOwnedDiscovery
  - FS-AnonymousCannotDeleteAnyDiscovery
  - FS-VisitedDiscoveryTracked
  - FS-VisitedDiscoveryTrackingIdempotent
  - FS-PersonalSpaceListsVisitedDiscoveries
  - FS-OwnDiscoveryNotInVisited
  - FS-ExpiredTokenRejected
  - FS-InvalidTokenRejected

## Overview

Add optional JWT-based authentication to the backend. Users are created via `make add-user` and stored in `data/users.json` with bcrypt-hashed passwords. Authenticated users are automatically set as owner of discoveries they create and can retrieve them from a personal space. All existing routes remain accessible without authentication (anonymous access preserved).

## Backend

### User Storage

File: `data/users.json`

```json
[
  {
    "username": "alice",
    "password_hash": "$2b$10$...",
    "created_at": "2026-03-14T10:00:00.000Z"
  }
]
```

New module: `apps/backend/src/auth/user-store.ts`

```typescript
export interface User {
  username: string;
  password_hash: string;
  created_at: string;
}

export function loadUsers(): User[];
export function saveUsers(users: User[]): void;
export function findUser(username: string): User | undefined;
```

- Reads/writes `data/users.json`.
- File is created on first `make add-user` if it doesn't exist.
- File path configurable via `USERS_FILE` env var (default: `data/users.json`).

### CLI: add-user script

New script: `apps/backend/scripts/add-user.ts`

- Reads `USER` and `PASS` from env (passed by Makefile).
- Validates both are non-empty.
- Checks username uniqueness.
- Hashes password with `bcrypt` (cost factor 10).
- Appends to `data/users.json`.
- Exits with code 0 on success, 1 on error (with message to stderr).

Makefile entry (project root `Makefile`):

```makefile
add-user:
	@test -n "$(USER)" || (echo "Error: USER is required" && exit 1)
	@test -n "$(PASS)" || (echo "Error: PASS is required" && exit 1)
	cd apps/backend && npx tsx scripts/add-user.ts
```

### JWT Authentication

New module: `apps/backend/src/auth/jwt.ts`

```typescript
export function signToken(username: string): string;
export function verifyToken(token: string): { username: string } | null;
```

- Signs with `JWT_SECRET` env var (required for auth features).
- Algorithm: HS256.
- Expiration: 24h (configurable via `JWT_EXPIRATION`, default `24h`).
- Payload: `{ username, iat, exp }`.

### Auth Middleware

New module: `apps/backend/src/auth/middleware.ts`

```typescript
// Optional auth: extracts user from token if present, continues without if absent
export function optionalAuth(req, res, next): void;

// Required auth: returns 401 if no valid token
export function requireAuth(req, res, next): void;
```

- `optionalAuth`: reads `Authorization: Bearer <token>` header. If present, verifies and sets `req.user = { username }`. If absent or invalid, sets `req.user = null` and continues.
- `requireAuth`: same as optionalAuth but returns 401 if `req.user` is null after verification.
- Both handle: missing header, malformed token, expired token, invalid signature.

### Discovery Ownership

Extend stored discovery data with optional `owner` field:

```typescript
// Added to the room data stored in Keyv
interface StoredDiscovery {
  data: DiscoveryData;
  owner?: string;      // username of the creator (null for anonymous)
  visited_by?: string[]; // usernames who have opened this discovery
}
```

Modify `POST /rooms`:
- Apply `optionalAuth` middleware.
- If `req.user` is set, store `owner: req.user.username` alongside discovery data.
- If `req.user` is null, store `owner: null`.
- Initialize `visited_by: []`.

Modify `GET /rooms/:id`:
- Apply `optionalAuth` middleware.
- If `req.user` is set and `req.user.username !== owner`:
  - Add `req.user.username` to `visited_by` (idempotent — skip if already present).
  - Persist the updated record.
- If `req.user` is the owner, do not add to `visited_by`.

### Discovery Deletion Authorization

Modify `DELETE /rooms/:id`:
- Apply `optionalAuth` middleware.
- Load the discovery and check its `owner` field:
  - If `req.user` is null (anonymous): return 403.
  - If `owner` is set and `req.user.username === owner`: allow deletion.
  - Otherwise (non-owner, or discovery has no owner): return 403.

Deletion requires authentication AND ownership. A discovery created anonymously (no owner) cannot be deleted by anyone.

### New Endpoints

#### POST /auth/login

**Request body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Flow:**
1. Validate username and password are non-empty strings.
2. Look up user in `data/users.json`.
3. Compare password with bcrypt hash.
4. If match, return JWT token.
5. If no match or user not found, return 401.

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error responses:**
- 400: Missing username or password.
- 401: Invalid credentials.

#### GET /me/discoveries

**Middleware:** `requireAuth`

**Flow:**
1. Scan all stored discoveries.
2. Collect those where `owner === req.user.username` (role: `"owned"`).
3. Collect those where `visited_by` includes `req.user.username` (role: `"visited"`).
4. Return both sets with the `role` field distinguishing them.

**Response (200):**
```json
{
  "discoveries": [
    {
      "discovery_id": "uuid",
      "title": "Discovery title",
      "goal": "Discovery goal",
      "date": "2026-03-14",
      "role": "owned"
    },
    {
      "discovery_id": "uuid",
      "title": "Another discovery",
      "goal": "Another goal",
      "date": "2026-03-13",
      "role": "visited"
    }
  ]
}
```

**Error responses:**
- 401: Not authenticated.

### Nginx Proxy

Add to `apps/frontend/nginx.conf.template`:

```nginx
location /auth/ {
    proxy_pass ${BACKEND_URL}/auth/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /me/ {
    proxy_pass ${BACKEND_URL}/me/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes (for auth) | — | Secret key for JWT signing |
| `JWT_EXPIRATION` | No | `24h` | JWT token expiration duration |
| `USERS_FILE` | No | `data/users.json` | Path to the users JSON file |

### Dependencies

- `bcrypt` — password hashing (new dependency)
- `jsonwebtoken` — JWT sign/verify (new dependency)

## Frontend

### Login Page (new component: LoginPage.tsx)

- Route: `/login`
- Simple form: username + password fields + submit button.
- On submit: `POST /auth/login` → store JWT in localStorage.
- On success: redirect to personal space (`/me`).
- On error: display error message.

### Personal Space (new component: PersonalSpace.tsx)

- Route: `/me`
- Requires auth: if no token in localStorage, redirect to `/login`.
- Fetches `GET /me/discoveries` with `Authorization` header.
- Displays two sections: "My discoveries" (owned) and "Shared with me" (visited).
- Each discovery card shows: title, goal, date, and a link to open it.

### Auth Context (new: AuthContext.tsx)

- React context providing: `{ user, token, login, logout, isAuthenticated }`.
- `token` read from localStorage on mount.
- `login(username, password)`: calls POST /auth/login, stores token.
- `logout()`: clears token from localStorage.
- All API calls that need auth use `token` from context for the `Authorization` header.

### Navigation

- If not authenticated: show "Login" link in header.
- If authenticated: show username + "My space" link + "Logout" button in header.
