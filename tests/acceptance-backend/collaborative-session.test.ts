/**
 * Acceptance tests for Collaborative Session feature.
 * @see specs/functional/collaborative-session.feature
 *
 * FSIDs covered:
 * - FS-JoinRoomViaSse
 * - FS-JoinRoomWithExistingCredentials
 * - FS-SseCredentialsGenerated
 * - FS-SendUpdateToRoom
 * - FS-ConcurrentUpdateLastWriteWins
 * - FS-BroadcastUpdateToSubscribers
 * - FS-SseSubscribersRegistered
 * - FS-SseDisconnection
 */

import { BASE_URL } from './helpers/backend-server';
import { connectSse } from './helpers/sse-client';

const VALID_DISCOVERY_DATA = {
  discovery_id: 'test-collab-001',
  title: 'Collab Discovery',
  goal: 'Test collaborative session',
  date: '2025-01-01',
  inputs: [],
  facts: [],
  insights: [],
  recommendations: [],
  outputs: [],
};

let roomId: string;

describe('Collaborative Session', () => {
  beforeAll(async () => {
    // Create a room for all tests
    const response = await fetch(`${BASE_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_DISCOVERY_DATA),
    });
    const body = await response.json();
    roomId = body.roomId;
  });

  // @fsid:FS-SseCredentialsGenerated
  describe('FS-SseCredentialsGenerated', () => {
    it('connecting without uuid or username receives generated credentials', async () => {
      const connection = await connectSse(`${BASE_URL}/events/${roomId}`);
      try {
        const messages = await connection.waitForMessages(1, 3000);
        expect(messages[0]).toHaveProperty('type', 'credentials');
        expect(messages[0]).toHaveProperty('uuid');
        expect(messages[0]).toHaveProperty('username');
        expect(messages[0].uuid).toBeTruthy();
        expect(messages[0].username).toBeTruthy();
      } finally {
        connection.close();
      }
    });
  });

  // @fsid:FS-JoinRoomViaSse
  describe('FS-JoinRoomViaSse', () => {
    it('SSE connection to a valid room returns a credentials message', async () => {
      const connection = await connectSse(`${BASE_URL}/events/${roomId}`);
      try {
        const messages = await connection.waitForMessages(1, 3000);
        expect(messages[0].type).toBe('credentials');
      } finally {
        connection.close();
      }
    });
  });

  // @fsid:FS-JoinRoomWithExistingCredentials
  describe('FS-JoinRoomWithExistingCredentials', () => {
    it('connecting with uuid and username query params receives them back', async () => {
      const testUuid = '550e8400-e29b-41d4-a716-446655440000';
      const testUsername = 'TestAnalyst';
      const url = `${BASE_URL}/events/${roomId}?uuid=${testUuid}&username=${testUsername}`;

      const connection = await connectSse(url);
      try {
        const messages = await connection.waitForMessages(1, 3000);
        expect(messages[0].type).toBe('credentials');
        expect(messages[0].uuid).toBe(testUuid);
        expect(messages[0].username).toBe(testUsername);
      } finally {
        connection.close();
      }
    });
  });

  // @fsid:FS-SendUpdateToRoom
  describe('FS-SendUpdateToRoom', () => {
    it('POST /rooms/:id/update with payload returns 204', async () => {
      const response = await fetch(`${BASE_URL}/rooms/${roomId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: { ...VALID_DISCOVERY_DATA, title: 'Updated Title' },
          senderUuid: '550e8400-e29b-41d4-a716-446655440000',
          username: 'TestAnalyst',
        }),
      });

      expect(response.status).toBe(204);
    });
  });

  // @fsid:FS-ConcurrentUpdateLastWriteWins
  describe('FS-ConcurrentUpdateLastWriteWins', () => {
    it('concurrent updates result in last-write-wins, no merge attempted', async () => {
      // Connect a subscriber to observe the final state
      const subscriber = await connectSse(`${BASE_URL}/events/${roomId}`);
      try {
        await subscriber.waitForMessages(1, 3000);
        const messageCountBefore = subscriber.messages.length;

        // Analyst A sends an update adding a fact
        const payloadA = {
          ...VALID_DISCOVERY_DATA,
          title: 'Update from A',
          facts: [{ fact_id: 'fact-a', content: 'Fact from Analyst A', source: '', related_inputs: [] }],
        };
        await fetch(`${BASE_URL}/rooms/${roomId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: payloadA, senderUuid: 'uuid-a', username: 'AnalystA' }),
        });

        // Analyst B sends an update without A's fact (simulates concurrent edit before receiving A's update)
        const payloadB = {
          ...VALID_DISCOVERY_DATA,
          title: 'Update from B',
          facts: [],
        };
        await fetch(`${BASE_URL}/rooms/${roomId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: payloadB, senderUuid: 'uuid-b', username: 'AnalystB' }),
        });

        // Wait for both broadcast messages
        const messages = await subscriber.waitForMessages(messageCountBefore + 2, 3000);
        const lastUpdate = messages[messages.length - 1];

        // Last write wins: B's update overwrites A's — A's fact is lost
        expect(lastUpdate.type).toBe('update');
        expect(lastUpdate.payload.title).toBe('Update from B');
        expect(lastUpdate.payload.facts).toEqual([]);

        // Verify stored state matches last write
        const roomResponse = await fetch(`${BASE_URL}/rooms/${roomId}`);
        const roomData = await roomResponse.json();
        expect(roomData.title).toBe('Update from B');
        expect(roomData.facts).toEqual([]);
      } finally {
        subscriber.close();
      }
    });
  });

  // @fsid:FS-BroadcastUpdateToSubscribers
  describe('FS-BroadcastUpdateToSubscribers', () => {
    it('sending an update broadcasts to other subscribers', async () => {
      // Connect a subscriber
      const subscriber = await connectSse(`${BASE_URL}/events/${roomId}`);
      try {
        // Wait for credentials message
        await subscriber.waitForMessages(1, 3000);
        const messageCountBefore = subscriber.messages.length;

        // Send an update from another client
        await fetch(`${BASE_URL}/rooms/${roomId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: { ...VALID_DISCOVERY_DATA, title: 'Broadcast Test' },
            senderUuid: 'another-uuid',
            username: 'AnotherAnalyst',
          }),
        });

        // Wait for the broadcast message to arrive
        const messages = await subscriber.waitForMessages(messageCountBefore + 1, 3000);
        const updateMsg = messages[messages.length - 1];
        expect(updateMsg.type).toBe('update');
        expect(updateMsg.payload.title).toBe('Broadcast Test');
      } finally {
        subscriber.close();
      }
    });
  });

  // @fsid:FS-SseSubscribersRegistered
  describe('FS-SseSubscribersRegistered', () => {
    it('after connecting, GET /status shows the client count for the room', async () => {
      const connection = await connectSse(`${BASE_URL}/events/${roomId}`);
      try {
        await connection.waitForMessages(1, 3000);

        const statusResponse = await fetch(`${BASE_URL}/status`);
        const status = await statusResponse.json();

        // Subscribers are now properly registered
        expect(status[roomId]).toBeGreaterThanOrEqual(1);
      } finally {
        connection.close();
      }
    });
  });

  // @fsid:FS-SseDisconnection
  describe('FS-SseDisconnection', () => {
    it('disconnecting a client removes it from subscribers', async () => {
      const connection = await connectSse(`${BASE_URL}/events/${roomId}`);
      await connection.waitForMessages(1, 3000);

      // Close the connection
      connection.close();

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify via status — client count should be 0 after disconnection
      const statusResponse = await fetch(`${BASE_URL}/status`);
      const status = await statusResponse.json();
      const clientCount = status[roomId] ?? 0;
      expect(clientCount).toBe(0);
    });
  });
});
