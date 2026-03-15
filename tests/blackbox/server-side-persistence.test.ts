/**
 * Acceptance tests for Server-Side Persistence feature.
 * @see specs/functional/server-side-persistence.feature
 *
 * FSIDs covered:
 * - FS-RoomDataSurvivesRestart
 * - FS-RoomDeletionSurvivesRestart
 * - FS-StoragePathDeterministic
 */

import { startServer, stopServer, BASE_URL } from './helpers/backend-server';
import { getTestToken, authHeaders } from './helpers/auth';
import { resolve } from 'path';
import { existsSync, unlinkSync } from 'fs';

const DB_PATH = resolve(__dirname, '../../apps/backend/data/factly.db');

const DISCOVERY_DATA = {
  discovery_id: 'persist-test-001',
  title: 'Persistence Test',
  goal: 'Verify data survives restart',
  date: '2025-01-01',
  inputs: [],
  facts: [],
  insights: [],
  recommendations: [],
  outputs: [],
};

async function createDocument(data: object): Promise<string> {
  const token = await getTestToken();
  const res = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return body.documentId;
}

async function getDocument(documentId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/documents/${documentId}`);
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

async function deleteDocument(documentId: string): Promise<void> {
  const token = await getTestToken();
  await fetch(`${BASE_URL}/documents/${documentId}`, { method: 'DELETE', headers: authHeaders(token) });
}

describe('Server-Side Persistence', () => {

  afterAll(async () => {
    // Stop server before deleting DB to avoid leaving a broken connection
    await stopServer();
    if (existsSync(DB_PATH)) {
      unlinkSync(DB_PATH);
    }
    // Restart with a fresh DB for subsequent test suites
    await startServer();
  });

  // @fsid:FS-RoomDataSurvivesRestart
  describe('FS-RoomDataSurvivesRestart', () => {
    it('room data is retrievable after a server restart', async () => {
      // Create a room
      const documentId = await createDocument(DISCOVERY_DATA);

      // Stop the server
      await stopServer();

      // Restart the server
      await startServer();

      // Retrieve the room — data should persist
      const room = await getDocument(documentId);
      expect(room).toBeDefined();
      expect(room.discovery_id).toBe(DISCOVERY_DATA.discovery_id);
      expect(room.title).toBe(DISCOVERY_DATA.title);
      expect(room.goal).toBe(DISCOVERY_DATA.goal);
    }, 60000);
  });

  // @fsid:FS-RoomDeletionSurvivesRestart
  describe('FS-RoomDeletionSurvivesRestart', () => {
    it('a deleted room remains deleted after a server restart', async () => {
      // Create and delete a room
      const documentId = await createDocument(DISCOVERY_DATA);
      await deleteDocument(documentId);

      // Stop the server
      await stopServer();

      // Restart the server
      await startServer();

      // Room should still be gone
      const room = await getDocument(documentId);
      expect(room).toBeNull();
    }, 60000);
  });

  // @fsid:FS-StoragePathDeterministic
  describe('FS-StoragePathDeterministic', () => {
    it('rooms from different server lifecycles coexist', async () => {
      // Create a room in the current lifecycle
      const documentId1 = await createDocument({ ...DISCOVERY_DATA, title: 'Lifecycle 1' });

      // Restart
      await stopServer();
      await startServer();

      // Create a second room in the new lifecycle
      const documentId2 = await createDocument({ ...DISCOVERY_DATA, title: 'Lifecycle 2' });

      // Both rooms should be retrievable
      const room1 = await getDocument(documentId1);
      expect(room1).toBeDefined();
      expect(room1.title).toBe('Lifecycle 1');

      const room2 = await getDocument(documentId2);
      expect(room2).toBeDefined();
      expect(room2.title).toBe('Lifecycle 2');
    }, 60000);
  });
});
