Feature: Input Validation and Error Handling
  As an Analyst
  I want the backend to reject malformed requests with clear error messages
  So that I receive meaningful feedback instead of silent failures

  Non-goals:
  - Validation of nested entity content (items inside inputs, facts, etc.)
  - Rate limiting or throttling
  - Authentication or authorization
  - Frontend-side form validation before submission
  - Retry logic for transient errors

  @fsid:FS-RejectEmptyRoomBody
  Scenario: Reject empty body when creating a room
    Given the backend is running
    When a client sends POST /rooms with an empty body
    Then the backend responds with status 400
    And the response body contains an error message

  @fsid:FS-RejectMissingRequiredFields
  Scenario: Reject missing required fields when creating a room
    Given the backend is running
    When a client sends POST /rooms without the required field "title"
    Then the backend responds with status 400
    And the response body contains an error message that mentions the missing field

  @fsid:FS-RejectInvalidFieldTypes
  Scenario: Reject invalid field types when creating a room
    Given the backend is running
    When a client sends POST /rooms with "inputs" as a string instead of an array
    Then the backend responds with status 400
    And the response body contains an error message

  @fsid:FS-RejectInvalidUpdateBody
  Scenario: Reject invalid update body
    Given a room exists
    When a client sends POST /rooms/:id/update without the required field "payload"
    Then the backend responds with status 400
    And the response body contains an error message

  @fsid:FS-RejectInvalidRoomIdFormat
  Scenario: Reject invalid room ID format on REST routes
    Given the backend is running
    When a client sends GET /rooms/not-a-uuid
    Then the backend responds with status 400
    And the response body contains an error message about the invalid room ID format

  @fsid:FS-ReturnStructuredErrorResponse
  Scenario: Return structured error response
    Given the backend is running
    When a client triggers any validation error
    Then the response is JSON with the shape { "error": "<message>" }

  @fsid:FS-DisplayErrorToastOnBackendError
  Scenario: Display error toast when the backend returns an error
    Given the frontend is connected to the backend
    When the backend returns an error response to a room creation request
    Then the frontend displays a temporary toast notification with the error message
    And the toast disappears after a few seconds
