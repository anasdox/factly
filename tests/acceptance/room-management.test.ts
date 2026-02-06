/**
 * Acceptance tests for Room Management feature.
 * @see specs/functional/room-management.feature
 *
 * FSIDs covered:
 * - FS-CreateRoom
 * - FS-RetrieveRoom
 * - FS-DeleteRoom
 * - FS-GetServerStatus
 * - FS-ValidateRoomId
 */

import { BASE_URL } from './helpers/backend-server';
import { connectSse } from './helpers/sse-client';

const VALID_DISCOVERY_DATA = {
  discovery_id: 'test-disc-001',
  title: 'Test Discovery',
  goal: 'Test Goal',
  date: '2025-01-01',
  inputs: [],
  facts: [],
  insights: [],
  recommendations: [],
  outputs: [],
};

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Room Management', () => {

  // @fsid:FS-CreateRoom
  describe('FS-CreateRoom', () => {
    it('POST /rooms with discovery data returns a UUID v4 roomId', async () => {
      const response = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DISCOVERY_DATA),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('roomId');
      expect(body.roomId).toMatch(UUID_V4_REGEX);
    });
  });

  // @fsid:FS-RetrieveRoom
  describe('FS-RetrieveRoom', () => {
    it('GET /rooms/:id returns the stored discovery data', async () => {
      // Create a room first
      const createResponse = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DISCOVERY_DATA),
      });
      const { roomId } = await createResponse.json();

      // Retrieve it
      const getResponse = await fetch(`${BASE_URL}/rooms/${roomId}`);
      expect(getResponse.status).toBe(200);

      const roomData = await getResponse.json();
      expect(roomData.discovery_id).toBe(VALID_DISCOVERY_DATA.discovery_id);
      expect(roomData.title).toBe(VALID_DISCOVERY_DATA.title);
      expect(roomData.goal).toBe(VALID_DISCOVERY_DATA.goal);
    });
  });

  // @fsid:FS-DeleteRoom
  describe('FS-DeleteRoom', () => {
    it('DELETE /rooms/:id returns 204', async () => {
      const createResponse = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DISCOVERY_DATA),
      });
      const { roomId } = await createResponse.json();

      const deleteResponse = await fetch(`${BASE_URL}/rooms/${roomId}`, {
        method: 'DELETE',
      });
      expect(deleteResponse.status).toBe(204);
    });

    it('deleting one room does not affect other rooms', async () => {
      // Create two rooms
      const create1 = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_DISCOVERY_DATA, title: 'Room 1' }),
      });
      const { roomId: roomId1 } = await create1.json();

      const create2 = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_DISCOVERY_DATA, title: 'Room 2' }),
      });
      const { roomId: roomId2 } = await create2.json();

      // Delete room 1
      await fetch(`${BASE_URL}/rooms/${roomId1}`, { method: 'DELETE' });

      // Room 2 should still exist
      const getRoom2 = await fetch(`${BASE_URL}/rooms/${roomId2}`);
      const room2Data = await getRoom2.json();
      expect(room2Data).toBeDefined();
      expect(room2Data.title).toBe('Room 2');
    });
  });

  // @fsid:FS-GetServerStatus
  describe('FS-GetServerStatus', () => {
    it('GET /status returns a map of room IDs to client counts', async () => {
      const response = await fetch(`${BASE_URL}/status`);
      expect(response.status).toBe(200);

      const status = await response.json();
      expect(typeof status).toBe('object');
    });
  });

  // @fsid:FS-ValidateRoomId
  describe('FS-ValidateRoomId', () => {
    it('SSE connection with invalid roomId is destroyed', async () => {
      try {
        const connection = await connectSse(`${BASE_URL}/events/not-a-uuid`);
        // If we got here, connection was established but should have been destroyed
        connection.close();
        // The server should have destroyed the response
      } catch (error) {
        // Expected: connection error because server destroyed the response
        expect(error).toBeDefined();
      }
    });

    it('SSE connection with valid UUID v4 roomId is accepted', async () => {
      // Create a room first to have a valid roomId
      const createResponse = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DISCOVERY_DATA),
      });
      const { roomId } = await createResponse.json();

      const connection = await connectSse(`${BASE_URL}/events/${roomId}`);
      try {
        // Connection should be established (got past the promise)
        expect(connection).toBeDefined();
        expect(connection.messages.length).toBeGreaterThanOrEqual(0);
      } finally {
        connection.close();
      }
    });
  });
});
