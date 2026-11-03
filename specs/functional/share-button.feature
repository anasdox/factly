Feature: Share Button
  As an Analyst
  I want to copy the link of a saved discovery whenever I need it
  So that I can send it to a colleague, who then opens the same discovery

  Non-goals:
  - Per-person access rights (a discovery stays open to anyone holding its link)
  - Link expiry or revocation
  - Sending the link by email or to a chat tool from the application
  - Sharing a discovery that has not been saved yet
  - A share dialog: the button copies the link directly

  @fsid:FS-ShareButtonShownForSavedDiscovery
  Scenario: The Share button is shown on a saved discovery
    Given an Analyst is viewing a saved discovery
    Then a Share button is shown in the toolbar
    And it is shown whether or not the Analyst is signed in

  @fsid:FS-ShareButtonHiddenForUnsavedDiscovery
  Scenario: The Share button is not shown on a discovery that was never saved
    Given an Analyst is viewing a discovery that has not been saved
    Then no Share button is shown in the toolbar

  @fsid:FS-ShareButtonCopiesLink
  Scenario: Clicking Share copies the discovery's link
    Given an Analyst is viewing a saved discovery
    When the Analyst clicks the Share button
    Then the link that opens this discovery is in the clipboard
    And a message confirms that the link was copied

  @fsid:FS-ShareLinkShownWhenCopyFails
  Scenario: The link is shown when it cannot be copied
    Given an Analyst is viewing a saved discovery
    And the browser does not allow copying to the clipboard
    When the Analyst clicks the Share button
    Then a message says the link could not be copied
    And the message shows the link so the Analyst can copy it by hand

  @fsid:FS-ShareButtonAppearsAfterFirstSave
  Scenario: The Share button appears once a new discovery is saved
    Given an Analyst is signed in and viewing a discovery that has not been saved
    When the Analyst saves the discovery
    Then a Share button is shown in the toolbar
    And clicking it copies the link of the newly saved discovery
