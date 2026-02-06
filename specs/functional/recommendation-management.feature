Feature: Recommendation Management
  As an Analyst
  I want to add, edit, and delete recommendations linked to insights
  So that I can document actionable suggestions derived from insights

  Non-goals:
  - Automatic recommendation generation from insights
  - Recommendation prioritization or voting
  - Recommendation assignment to stakeholders

  @fsid:FS-AddRecommendation
  Scenario: Add a new recommendation
    Given the Analyst is viewing the Recommendations column
    When the Analyst clicks the add button
    Then a Recommendation modal opens in "add" mode
    And the text field is empty and the related insights list shows all available Insights

  @fsid:FS-SaveNewRecommendation
  Scenario: Save a new recommendation with related insights
    Given the Recommendation modal is open in "add" mode
    When the Analyst enters text and selects one or more related Insights
    And clicks "Add"
    Then a new Recommendation is added to the Recommendations column with a generated ID
    And the Recommendation is linked to the selected Insights

  @fsid:FS-EditRecommendation
  Scenario: Edit an existing recommendation
    Given the Analyst hovers over a Recommendation item
    When the Analyst clicks the edit icon on the item toolbar
    Then a Recommendation modal opens in "edit" mode
    And the text and related insights are pre-filled with the current values

  @fsid:FS-SaveEditedRecommendation
  Scenario: Save an edited recommendation
    Given the Recommendation modal is open in "edit" mode
    When the Analyst modifies the text or related insights
    And clicks "Save"
    Then the Recommendation is updated with the new values

  @fsid:FS-DeleteRecommendation
  Scenario: Delete a recommendation
    Given the Recommendation modal is open in "edit" mode
    When the Analyst clicks "Delete"
    And confirms the deletion prompt
    Then the Recommendation is removed from the Recommendations column
