Feature: Room Management
  As an Analyst
  I want to create and manage collaborative rooms on the server
  So that multiple analysts can work on the same discovery in real time

  Non-goals:
  - Room listing or browsing
  - Room access control or passwords
  - Room expiration or automatic cleanup
  - Multiple rooms per discovery

  @fsid:FS-CreateRoom
  Scenario: Create a room from the current discovery
    Given the Analyst is viewing a discovery with a discovery_id
    When the Analyst clicks "Start Event Room" in the toolbar
    Then a room is created on the backend with the current discovery data
    And a modal displays the shareable room URL containing the room ID as a query parameter

  @fsid:FS-RetrieveRoom
  Scenario: Retrieve room data by ID
    Given a room exists on the backend with a specific ID
    When a client requests the room data by ID
    Then the backend returns the stored discovery data for that room

  @fsid:FS-DeleteRoom
  Scenario: Delete a room by ID
    Given multiple rooms exist on the backend
    When a client deletes a room by ID
    Then only the target room is deleted from the store
    And the subscribers and users maps are cleared for the target room only

  @fsid:FS-GetServerStatus
  Scenario: Get the number of connected clients per room
    Given rooms exist with connected SSE clients
    When a client requests the server status
    Then the backend returns a map of room IDs to connected client counts

  @fsid:FS-ValidateRoomId
  Scenario: Room ID must be a valid UUID v4
    Given a client attempts to connect to a room via SSE
    When the room ID is not a valid UUID v4 format
    Then the SSE connection is destroyed immediately
