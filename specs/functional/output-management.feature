Feature: Output Management
  As an Analyst
  I want to add, edit, and delete outputs linked to recommendations
  So that I can document deliverables resulting from recommendations

  Non-goals:
  - Automatic output generation from recommendations
  - Output format templating (PDF, slides, etc.)
  - Output sharing or publishing

  @fsid:FS-AddOutput
  Scenario: Add a new output
    Given the Analyst is viewing the Outputs column
    When the Analyst clicks the add button
    Then an Output modal opens in "add" mode
    And the text field is empty and the related recommendations list shows all available Recommendations

  @fsid:FS-SaveNewOutput
  Scenario: Save a new output with related recommendations
    Given the Output modal is open in "add" mode
    When the Analyst enters text and selects one or more related Recommendations
    And clicks "Add"
    Then a new Output is added to the Outputs column with a generated ID
    And the Output is linked to the selected Recommendations

  @fsid:FS-EditOutput
  Scenario: Edit an existing output
    Given the Analyst hovers over an Output item
    When the Analyst clicks the edit icon on the item toolbar
    Then an Output modal opens in "edit" mode
    And the text and related recommendations are pre-filled with the current values

  @fsid:FS-SaveEditedOutput
  Scenario: Save an edited output
    Given the Output modal is open in "edit" mode
    When the Analyst modifies the text or related recommendations
    And clicks "Save"
    Then the Output is updated with the new values

  @fsid:FS-DeleteOutput
  Scenario: Delete an output
    Given the Output modal is open in "edit" mode
    When the Analyst clicks "Delete"
    And confirms the deletion prompt
    Then the Output is removed from the Outputs column
