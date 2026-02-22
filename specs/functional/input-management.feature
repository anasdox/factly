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
    And the title field is empty
    And the type field defaults to "text"
    And the text field is empty
    And the URL field is hidden until type "web" is selected

  @fsid:FS-SaveNewInput
  Scenario: Save a new input
    Given the Input modal is open in "add" mode
    When the Analyst fills in the title and the content field for the selected type
    And selects a type
    And clicks "Add"
    Then a new Input is added to the Inputs column with a generated ID
    And the Input stores the selected type-specific data
    And the Input displays an icon matching its type and the title

  @fsid:FS-EditInput
  Scenario: Edit an existing input
    Given the Analyst hovers over an Input item
    When the Analyst clicks the edit icon on the item toolbar
    Then an Input modal opens in "edit" mode
    And the title and type fields are pre-filled with the current values
    And the type-specific content field is pre-filled with the current value

  @fsid:FS-SaveEditedInput
  Scenario: Save an edited input
    Given the Input modal is open in "edit" mode
    When the Analyst modifies the title, type, or the type-specific content field
    And clicks "Save"
    Then the Input is updated with the new values

  @fsid:FS-DeleteInput
  Scenario: Delete an input
    Given the Input modal is open in "edit" mode
    When the Analyst clicks "Delete"
    And confirms the deletion prompt
    Then the Input remains in the Inputs column
    And the Input is marked as archived/outdated

  @fsid:FS-ClickInputOpensUrl
  Scenario: Click an input item toggles selection
    Given the Analyst is viewing an Input item
    When the Analyst clicks on the Input item
    Then the Input item becomes selected

  @fsid:FS-InputTypeIcons
  Scenario: Input displays an icon for supported types and a fallback for unsupported types
    Given Inputs exist with supported and unsupported types
    Then the Input item displays the corresponding icon:
      | type                | icon             |
      | text                | file-alt         |
      | web                 | globe            |
      | unsupported (audio) | question-circle  |
