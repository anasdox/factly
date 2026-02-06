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

async function createRoom(data: object): Promise<string> {
  const res = await fetch(`${BASE_URL}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return body.roomId;
}

async function getRoom(roomId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/rooms/${roomId}`);
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

async function deleteRoom(roomId: string): Promise<void> {
  await fetch(`${BASE_URL}/rooms/${roomId}`, { method: 'DELETE' });
}

describe('Server-Side Persistence', () => {

  afterAll(() => {
    // Clean up test DB file for isolation
    if (existsSync(DB_PATH)) {
      unlinkSync(DB_PATH);
    }
  });

  // @fsid:FS-RoomDataSurvivesRestart
  describe('FS-RoomDataSurvivesRestart', () => {
    it('room data is retrievable after a server restart', async () => {
      // Create a room
      const roomId = await createRoom(DISCOVERY_DATA);

      // Stop the server
      await stopServer();

      // Restart the server
      await startServer();

      // Retrieve the room — data should persist
      const room = await getRoom(roomId);
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
      const roomId = await createRoom(DISCOVERY_DATA);
      await deleteRoom(roomId);

      // Stop the server
      await stopServer();

      // Restart the server
      await startServer();

      // Room should still be gone
      const room = await getRoom(roomId);
      expect(room).toBeNull();
    }, 60000);
  });

  // @fsid:FS-StoragePathDeterministic
  describe('FS-StoragePathDeterministic', () => {
    it('rooms from different server lifecycles coexist', async () => {
      // Create a room in the current lifecycle
      const roomId1 = await createRoom({ ...DISCOVERY_DATA, title: 'Lifecycle 1' });

      // Restart
      await stopServer();
      await startServer();

      // Create a second room in the new lifecycle
      const roomId2 = await createRoom({ ...DISCOVERY_DATA, title: 'Lifecycle 2' });

      // Both rooms should be retrievable
      const room1 = await getRoom(roomId1);
      expect(room1).toBeDefined();
      expect(room1.title).toBe('Lifecycle 1');

      const room2 = await getRoom(roomId2);
      expect(room2).toBeDefined();
      expect(room2.title).toBe('Lifecycle 2');
    }, 60000);
  });
});
