import * as fs from 'fs';
import * as path from 'path';
import Keyv from 'keyv';
import KeyvSqlite from '@keyv/sqlite';

// DATA_DIR lets a test drive its own store instead of sharing this one.
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'factly.db');

const store = new Keyv({
  store: new KeyvSqlite('sqlite://' + dbPath)
});

store.on('error', (err) => console.error('Keyv connection error:', err));

export { store, dbPath };
