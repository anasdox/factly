Feature: Collaborative Session
  As an Analyst
  I want to join a room and receive real-time updates from other analysts
  So that we can collaboratively build a discovery pipeline

  Non-goals:
  - Conflict resolution for concurrent edits (last-write-wins is the accepted strategy)
  - Incremental or delta synchronization (full-state replacement is used)
  - Throttling or debouncing of update frequency
  - Presence indicators (who is currently viewing)
  - Chat or messaging between analysts
  - Cursor sharing or co-editing within a single entity

  @fsid:FS-JoinRoomViaSse
  Scenario: Join a room via SSE and receive credentials
    Given a room exists with a valid room ID
    When an Analyst opens the application with a "room" query parameter
    Then the frontend fetches the room data from the backend
    And opens an SSE connection to the room
    And receives a "credentials" message with a uuid and username
    And stores the uuid and username in localStorage

  @fsid:FS-JoinRoomViaInviteFirstUse
  Scenario: First-time user opening a room link lands in the room directly
    Given a room exists with a valid room ID
    And the browser has no locally saved discovery
    When an Analyst opens the application with a "room" query parameter for that room
    Then the frontend does not display the welcome home screen before room bootstrap completes
    And the frontend fetches the room data from the backend
    And the room discovery is displayed once the room data is loaded

  @fsid:FS-JoinRoomWithExistingCredentials
  Scenario: Join a room with existing credentials from localStorage
    Given the Analyst has a uuid and username stored in localStorage
    When the Analyst opens the application with a "room" query parameter
    Then the SSE connection URL includes the stored uuid and username as query parameters

  @fsid:FS-SseCredentialsGenerated
  Scenario: SSE connection generates credentials when not provided
    Given an Analyst connects to a room via SSE without uuid or username
    Then the backend generates a UUID and a friendly username
    And sends them to the client as a "credentials" message

  @fsid:FS-SendUpdateToRoom
  Scenario: Discovery changes are sent to the backend room
    Given the Analyst is connected to a room
    When the Analyst modifies any entity in the discovery (add, edit, or delete)
    Then the frontend sends the full updated discovery data to the backend via POST /rooms/:id/update
    And the payload includes the discovery data, username, and sender uuid

  @fsid:FS-ConcurrentUpdateLastWriteWins
  Scenario: Concurrent updates follow last-write-wins strategy
    Given two Analysts are connected to the same room
    When both modify the discovery simultaneously
    Then the last update received by the backend overwrites the previous one
    And no merge or conflict resolution is attempted

  @fsid:FS-BroadcastUpdateToSubscribers
  Scenario: Backend broadcasts updates to other subscribers
    Given multiple Analysts are connected to the same room via SSE
    When one Analyst sends an update to the room
    Then the backend broadcasts the updated payload to all other subscribers
    And the sender does not receive their own update

  @fsid:FS-SseSubscribersRegistered
  Scenario: SSE subscribers are registered in the subscribers map
    Given a room exists on the backend
    When an Analyst connects to the room via SSE
    Then the subscriber Set for that room is initialized
    And the socket is added to the subscribers map
    And the server status reflects the connected client count

  @fsid:FS-SseDisconnection
  Scenario: SSE client disconnection cleanup
    Given an Analyst is connected to a room via SSE
    When the Analyst closes the browser or the connection drops
    Then the backend removes the socket from the room's subscribers
    And removes the username from the room's users map
