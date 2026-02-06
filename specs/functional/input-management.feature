Feature: Input Management
  As an Analyst
  I want to add, edit, and delete inputs in a discovery
  So that I can register source materials for fact extraction

  Non-goals:
  - Fetching or previewing input content from URL
  - Uploading input files to the server
  - Automatic type detection from URL or file extension

  @fsid:FS-AddInput
  Scenario: Add a new input
    Given the Analyst is viewing the Inputs column
    When the Analyst clicks the add button
    Then an Input modal opens in "add" mode
    And the title, URL, and type fields are empty with type defaulting to "text"

  @fsid:FS-SaveNewInput
  Scenario: Save a new input
    Given the Input modal is open in "add" mode
    When the Analyst fills in the title, URL, and selects a type
    And clicks "Add"
    Then a new Input is added to the Inputs column with a generated ID
    And the Input displays an icon matching its type and the title

  @fsid:FS-EditInput
  Scenario: Edit an existing input
    Given the Analyst hovers over an Input item
    When the Analyst clicks the edit icon on the item toolbar
    Then an Input modal opens in "edit" mode
    And the title, URL, and type fields are pre-filled with the current values

  @fsid:FS-SaveEditedInput
  Scenario: Save an edited input
    Given the Input modal is open in "edit" mode
    When the Analyst modifies the title, URL, or type
    And clicks "Save"
    Then the Input is updated with the new values

  @fsid:FS-DeleteInput
  Scenario: Delete an input
    Given the Input modal is open in "edit" mode
    When the Analyst clicks "Delete"
    And confirms the deletion prompt
    Then the Input is removed from the Inputs column

  @fsid:FS-ClickInputOpensUrl
  Scenario: Click an input to open its URL
    Given the Analyst is viewing an Input with a URL
    When the Analyst clicks on the Input item
    Then the URL opens in a new browser tab

  @fsid:FS-InputTypeIcons
  Scenario: Input displays an icon matching its type
    Given an Input exists with a specific type
    Then the Input item displays the corresponding icon:
      | type  | icon          |
      | text  | file-alt      |
      | web   | globe         |
      | image | image         |
      | video | video         |
      | audio | file-audio    |
      | pdf   | file-pdf      |
      | csv   | file-csv      |
      | other | question-circle |
