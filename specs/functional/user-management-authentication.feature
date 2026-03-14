Feature: User Management and Authentication
  As an analyst
  I want to optionally authenticate with a login and password
  So that I can access a personal space listing my created and visited discoveries

  Background:
    Given the system supports both anonymous and authenticated access
    And all discoveries are public and accessible via their link

  # --- User Creation (CLI) ---

  @fsid:FS-CreateUserViaCli
  Scenario: Create a user via make add-user
    Given an administrator runs "make add-user USER=alice PASS=secret123"
    Then a new user "alice" is created in data/users.json
    And the password is stored as a bcrypt hash, not plaintext

  @fsid:FS-CreateUserDuplicateRejected
  Scenario: Duplicate username is rejected
    Given a user "alice" already exists
    When an administrator runs "make add-user USER=alice PASS=newpass"
    Then the command fails with an error indicating the username already exists

  @fsid:FS-CreateUserMissingParams
  Scenario: Missing parameters are rejected
    When an administrator runs "make add-user" without USER or PASS
    Then the command fails with an error indicating required parameters

  # --- Authentication ---

  @fsid:FS-LoginWithValidCredentials
  Scenario: Login with valid credentials
    Given a user "alice" exists with password "secret123"
    When the user sends a POST /auth/login with username "alice" and password "secret123"
    Then the response status is 200
    And the response contains a JWT token

  @fsid:FS-LoginWithInvalidPassword
  Scenario: Login with invalid password
    Given a user "alice" exists
    When the user sends a POST /auth/login with username "alice" and a wrong password
    Then the response status is 401
    And the response contains an error message

  @fsid:FS-LoginWithNonexistentUser
  Scenario: Login with nonexistent user
    When the user sends a POST /auth/login with username "unknown" and any password
    Then the response status is 401
    And the response contains an error message

  @fsid:FS-LoginMissingFields
  Scenario: Login with missing fields
    When the user sends a POST /auth/login with an empty body
    Then the response status is 400
    And the response contains an error message

  # --- Anonymous Access Preserved ---

  @fsid:FS-AnonymousAccessPreserved
  Scenario: Anonymous users can access all existing routes
    Given no Authorization header is sent
    When the user accesses any existing API route (rooms, status, etc.)
    Then the response is the same as before authentication was introduced

  @fsid:FS-AnonymousCreateDiscovery
  Scenario: Anonymous user creates a discovery without owner
    Given no Authorization header is sent
    When the user creates a new discovery via POST /rooms
    Then the discovery is created successfully
    And the discovery has no owner

  # --- Authenticated Discovery Ownership ---

  @fsid:FS-AuthenticatedCreateDiscoverySetsOwner
  Scenario: Authenticated user creates a discovery with ownership
    Given the user is authenticated as "alice"
    When the user creates a new discovery via POST /rooms
    Then the discovery is created successfully
    And "alice" is set as the owner of the discovery

  @fsid:FS-OwnershipDoesNotRestrictAccess
  Scenario: Ownership does not restrict access to a discovery
    Given "alice" owns a discovery
    When an anonymous user or another authenticated user accesses the discovery via its link
    Then the discovery is fully accessible and modifiable

  # --- Personal Space ---

  @fsid:FS-PersonalSpaceListsOwnedDiscoveries
  Scenario: Personal space lists discoveries created by the user
    Given the user is authenticated as "alice"
    And "alice" has created 3 discoveries
    When the user requests GET /me/discoveries
    Then the response contains the 3 discoveries with title, goal, and date

  @fsid:FS-PersonalSpaceRequiresAuth
  Scenario: Personal space requires authentication
    Given no Authorization header is sent
    When the user requests GET /me/discoveries
    Then the response status is 401

  # --- Discovery Deletion Restricted to Owner ---

  @fsid:FS-OwnerCanDeleteDiscovery
  Scenario: Owner can delete their discovery
    Given the user is authenticated as "alice"
    And "alice" owns a discovery
    When "alice" sends a DELETE /rooms/:id
    Then the discovery is deleted successfully

  @fsid:FS-NonOwnerCannotDeleteDiscovery
  Scenario: Non-owner cannot delete a discovery
    Given the user is authenticated as "bob"
    And "alice" owns a discovery
    When "bob" sends a DELETE /rooms/:id
    Then the response status is 403
    And the response contains an error message

  @fsid:FS-AnonymousCannotDeleteOwnedDiscovery
  Scenario: Anonymous user cannot delete a discovery that has an owner
    Given no Authorization header is sent
    And "alice" owns a discovery
    When the user sends a DELETE /rooms/:id
    Then the response status is 403
    And the response contains an error message

  @fsid:FS-AnonymousCannotDeleteAnyDiscovery
  Scenario: Anonymous user cannot delete any discovery
    Given no Authorization header is sent
    And a discovery exists (with or without an owner)
    When the user sends a DELETE /rooms/:id
    Then the response status is 403
    And the response contains an error message

  # --- Shared With Me (visited discoveries) ---

  @fsid:FS-VisitedDiscoveryTracked
  Scenario: Opening a discovery while authenticated tracks it as visited
    Given the user is authenticated as "bob"
    And a discovery exists created by "alice"
    When "bob" opens the discovery via GET /rooms/:id with a valid token
    Then the discovery is added to bob's visited discoveries

  @fsid:FS-VisitedDiscoveryTrackingIdempotent
  Scenario: Opening the same discovery multiple times does not create duplicates
    Given the user is authenticated as "bob"
    And "bob" has already visited a discovery
    When "bob" opens the same discovery again
    Then the visited list still contains that discovery only once

  @fsid:FS-PersonalSpaceListsVisitedDiscoveries
  Scenario: Personal space lists visited discoveries separately from owned
    Given the user is authenticated as "bob"
    And "bob" has created 1 discovery and visited 2 others
    When "bob" requests GET /me/discoveries
    Then the response contains 1 discovery with role "owned" and 2 with role "visited"

  @fsid:FS-OwnDiscoveryNotInVisited
  Scenario: Visiting a discovery the user owns does not duplicate it as visited
    Given the user is authenticated as "alice"
    And "alice" owns a discovery
    When "alice" opens that discovery via GET /rooms/:id
    Then the discovery appears only as "owned" in the personal space, not as "visited"

  # --- JWT Validation ---

  @fsid:FS-ExpiredTokenRejected
  Scenario: Expired JWT token is rejected
    Given the user sends a request with an expired JWT token
    When any authenticated route is accessed
    Then the response status is 401
    And the response contains an error message

  @fsid:FS-InvalidTokenRejected
  Scenario: Invalid JWT token is rejected
    Given the user sends a request with a malformed JWT token
    When any authenticated route is accessed
    Then the response status is 401
    And the response contains an error message

  # --- Non-goals ---
  # - Private discoveries (all discoveries remain public)
  # - Self-registration (users created via CLI only)
  # - Password recovery or reset
  # - Admin UI for user management
  # - Role-based access control
  # - OAuth or social login
  # - Multi-factor authentication
  # - Manual save/bookmark (tracking is automatic on visit)
