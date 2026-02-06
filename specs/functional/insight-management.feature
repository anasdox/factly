Feature: Insight Management
  As an Analyst
  I want to add, edit, and delete insights linked to facts
  So that I can document interpretations derived from observed facts

  Non-goals:
  - Automatic insight generation from facts
  - Insight scoring or prioritization
  - Insight categorization or tagging

  @fsid:FS-AddInsight
  Scenario: Add a new insight
    Given the Analyst is viewing the Insights column
    When the Analyst clicks the add button
    Then an Insight modal opens in "add" mode
    And the text field is empty and the related facts list shows all available Facts

  @fsid:FS-SaveNewInsight
  Scenario: Save a new insight with related facts
    Given the Insight modal is open in "add" mode
    When the Analyst enters text and selects one or more related Facts
    And clicks "Add"
    Then a new Insight is added to the Insights column with a generated ID
    And the Insight is linked to the selected Facts

  @fsid:FS-EditInsight
  Scenario: Edit an existing insight
    Given the Analyst hovers over an Insight item
    When the Analyst clicks the edit icon on the item toolbar
    Then an Insight modal opens in "edit" mode
    And the text and related facts are pre-filled with the current values

  @fsid:FS-SaveEditedInsight
  Scenario: Save an edited insight
    Given the Insight modal is open in "edit" mode
    When the Analyst modifies the text or related facts
    And clicks "Save"
    Then the Insight is updated with the new values

  @fsid:FS-DeleteInsight
  Scenario: Delete an insight
    Given the Insight modal is open in "edit" mode
    When the Analyst clicks "Delete"
    And confirms the deletion prompt
    Then the Insight is removed from the Insights column
