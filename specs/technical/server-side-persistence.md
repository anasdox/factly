# Server-Side Persistence — Technical Specification

- **x-tsid:** TS-ServerSidePersistence
- **x-fsid-links:** [FS-RoomDataSurvivesRestart, FS-RoomDeletionSurvivesRestart, FS-StoragePathDeterministic]

## Change Summary

Replace the non-persistent `keyv-file` store (random temp-file path) with `@keyv/sqlite` using a deterministic file path.

## Current State

```typescript
import { KeyvFile } from 'keyv-file';
import * as os from 'os';

const store = new Keyv({
  store: new KeyvFile({
    filename: `${os.tmpdir()}/keyv-file/default-rnd-${Math.random().toString(36).slice(2)}.json`,
    encode: JSON.stringify,
    decode: JSON.parse
  })
});
```

Each server restart generates a new random filename, making previous data inaccessible.

## Target State

```typescript
import KeyvSqlite from '@keyv/sqlite';
import * as fs from 'fs';
import * as path from 'path';

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const store = new Keyv({
  store: new KeyvSqlite('sqlite://' + path.join(dataDir, 'factly.db'))
});
```

- **Storage backend:** `@keyv/sqlite` (already in `package.json` as `^3.6.7`)
- **Database path:** `apps/backend/data/factly.db` (deterministic)
- **Directory creation:** `fs.mkdirSync` with `{ recursive: true }` at startup
- **Interface:** Keyv `set`, `get`, `delete` — unchanged

## Files Modified

| File | Change |
|------|--------|
| `apps/backend/src/index.ts` | Replace `keyv-file` + `os` imports with `@keyv/sqlite` + `fs` + `path`; replace store constructor |
| `apps/backend/.gitignore` | Add `data/` entry |
| `apps/backend/package.json` | Remove `keyv-file` dependency (cleanup) |

## Constraints

- The `data/` directory MUST be created before the Keyv constructor is called.
- The `data/` directory MUST be gitignored.
- No changes to the Keyv interface (`set`, `get`, `delete`) or to any API endpoint behavior.
