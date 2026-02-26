/**
 * Acceptance tests for Input Validation and Error Handling feature.
 * @see specs/functional/input-validation-error-handling.feature
 *
 * FSIDs covered:
 * - FS-RejectEmptyRoomBody
 * - FS-RejectMissingRequiredFields
 * - FS-RejectInvalidFieldTypes
 * - FS-RejectInvalidUpdateBody
 * - FS-RejectInvalidRoomIdFormat
 * - FS-ReturnStructuredErrorResponse
 * - FS-DisplayErrorToastOnBackendError (covered in `tests/e2e/input-validation-error-handling.spec.ts`)
 */

import { BASE_URL } from './helpers/backend-server';

const VALID_DISCOVERY_DATA = {
  discovery_id: 'test-validation-001',
  title: 'Validation Test',
  goal: 'Test input validation',
  date: '2025-01-01',
  inputs: [],
  facts: [],
  insights: [],
  recommendations: [],
  outputs: [],
};

describe('Input Validation and Error Handling', () => {

  // @fsid:FS-RejectEmptyRoomBody
  describe('FS-RejectEmptyRoomBody', () => {
    it('POST /rooms with empty body returns 400', async () => {
      const response = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
    });
  });

  // @fsid:FS-RejectMissingRequiredFields
  describe('FS-RejectMissingRequiredFields', () => {
    it('POST /rooms without title returns 400 with message mentioning "title"', async () => {
      const { title, ...dataWithoutTitle } = VALID_DISCOVERY_DATA;
      const response = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithoutTitle),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/title/i);
    });
  });

  // @fsid:FS-RejectInvalidFieldTypes
  describe('FS-RejectInvalidFieldTypes', () => {
    it('POST /rooms with inputs as string instead of array returns 400', async () => {
      const response = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_DISCOVERY_DATA, inputs: 'not-an-array' }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });
  });

  // @fsid:FS-RejectInvalidUpdateBody
  describe('FS-RejectInvalidUpdateBody', () => {
    let roomId: string;

    beforeAll(async () => {
      const response = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DISCOVERY_DATA),
      });
      const body = await response.json();
      roomId = body.roomId;
    });

    it('POST /rooms/:id/update without payload returns 400', async () => {
      const response = await fetch(`${BASE_URL}/rooms/${roomId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderUuid: 'abc', username: 'user' }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });
  });

  // @fsid:FS-RejectInvalidRoomIdFormat
  describe('FS-RejectInvalidRoomIdFormat', () => {
    it('GET /rooms/not-a-uuid returns 400', async () => {
      const response = await fetch(`${BASE_URL}/rooms/not-a-uuid`);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    it('DELETE /rooms/not-a-uuid returns 400', async () => {
      const response = await fetch(`${BASE_URL}/rooms/not-a-uuid`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    it('POST /rooms/not-a-uuid/update returns 400', async () => {
      const response = await fetch(`${BASE_URL}/rooms/not-a-uuid/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: VALID_DISCOVERY_DATA,
          senderUuid: 'abc',
          username: 'user',
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });
  });

  // @fsid:FS-ReturnStructuredErrorResponse
  describe('FS-ReturnStructuredErrorResponse', () => {
    it('all validation errors return JSON with { error: string }', async () => {
      // Test with empty body on POST /rooms
      const response = await fetch(`${BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.headers.get('content-type')).toMatch(/application\/json/);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
      expect(body.error.length).toBeGreaterThan(0);
    });
  });
});
