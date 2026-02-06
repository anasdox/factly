Feature: Fact Management
  As an Analyst
  I want to add, edit, and delete facts linked to inputs
  So that I can document verifiable statements extracted from source materials

  Non-goals:
  - Automatic fact extraction from input content
  - Fact validation or verification workflow
  - Fact categorization or tagging beyond text content

  @fsid:FS-AddFact
  Scenario: Add a new fact
    Given the Analyst is viewing the Facts column
    When the Analyst clicks the add button
    Then a Fact modal opens in "add" mode
    And the text field is empty and the related inputs list shows all available Inputs

  @fsid:FS-SaveNewFact
  Scenario: Save a new fact with related inputs
    Given the Fact modal is open in "add" mode
    When the Analyst enters text and selects one or more related Inputs
    And clicks "Add"
    Then a new Fact is added to the Facts column with a generated ID
    And the Fact is linked to the selected Inputs

  @fsid:FS-EditFact
  Scenario: Edit an existing fact
    Given the Analyst hovers over a Fact item
    When the Analyst clicks the edit icon on the item toolbar
    Then a Fact modal opens in "edit" mode
    And the text and related inputs are pre-filled with the current values

  @fsid:FS-SaveEditedFact
  Scenario: Save an edited fact
    Given the Fact modal is open in "edit" mode
    When the Analyst modifies the text or related inputs
    And clicks "Save"
    Then the Fact is updated with the new values

  @fsid:FS-DeleteFact
  Scenario: Delete a fact
    Given the Fact modal is open in "edit" mode
    When the Analyst clicks "Delete"
    And confirms the deletion prompt
    Then the Fact is removed from the Facts column

  @fsid:FS-FactDisplayBoldsNumbers
  Scenario: Fact text displays numbers in bold
    Given a Fact exists with text containing a number
    Then the first numeric value in the Fact text is displayed in bold
