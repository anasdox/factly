Feature: Server-Side Persistence
  As an Analyst
  I want discovery room data to survive server restarts
  So that I do not lose my work when the backend is restarted

  Non-goals:
  - Migration of data from the old temp-file storage
  - Backup or replication of the database
  - Encryption at rest
  - Automatic data pruning or expiration
  - Multi-instance or clustered storage

  @fsid:FS-RoomDataSurvivesRestart
  Scenario: Room data is retrievable after a server restart
    Given an Analyst has created a room with discovery data
    When the server is restarted
    Then the room data is still retrievable by its ID
    And the retrieved data matches the original discovery data

  @fsid:FS-RoomDeletionSurvivesRestart
  Scenario: A deleted room remains deleted after a server restart
    Given an Analyst has created a room with discovery data
    And the room has been deleted
    When the server is restarted
    Then the room data is no longer retrievable by its ID

  @fsid:FS-StoragePathDeterministic
  Scenario: Storage uses a deterministic path so rooms from different lifecycles coexist
    Given an Analyst has created a room during a first server lifecycle
    And the server has been restarted
    And the Analyst creates a second room during the new lifecycle
    Then both rooms are retrievable by their respective IDs
