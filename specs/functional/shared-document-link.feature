Feature: Shared Document Link
  As an Analyst
  I want a document link to open the application whenever it is opened
  So that a colleague I send the link to sees the discovery, not raw data

  Non-goals:
  - Changing who may open or edit a shared document (documents stay public by link)
  - Changing the shape of document links already shared (`/documents/<id>` keeps working)
  - Changing the sign-in callback address registered with the identity provider
  - Preview cards or unfurling when a link is pasted into a chat tool

  @fsid:FS-OpenSharedDocumentLinkShowsApplication
  @status:bug
  Scenario: Opening a shared document link shows the application
    Given a document exists
    When an Analyst opens that document's link directly in a new browser tab
    Then the application is displayed
    And the application loads that document

  @fsid:FS-ReloadDocumentPageShowsApplication
  @status:bug
  Scenario: Reloading a document page keeps the application
    Given an Analyst is viewing a document in the application
    When the Analyst reloads the page
    Then the application is displayed again with the same document

  @fsid:FS-ApplicationStillReachesBackendServices
  Scenario: The application still reaches every backend service
    Given the application is served by its production web server
    When the application reads, saves or streams a document, signs in, or calls an AI service
    Then each request reaches the backend
    And no request to the backend is answered with the application page instead
