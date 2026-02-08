Feature: Auto Recommendations Extraction from Insights
  As an Analyst
  I want to select insights and extract recommendations from them using AI assistance
  So that I can formulate actionable recommendations faster while keeping full control over what enters the pipeline

  Context:
  - The Discovery goal is used as extraction context so that suggested recommendations are relevant to the analyst's research objective
  - The insight selection mechanism also improves manual recommendation creation by pre-filling related_insights

  Non-goals:
  - Fully automatic extraction without analyst validation
  - Extraction from entities other than insights (inputs, facts, outputs)
  - Modification of the original insight content
  - Persisting suggested recommendations that are rejected
  - Multi-column selection (selecting across insights and facts simultaneously)

  @fsid:FS-SelectInsights
  Scenario: Select insights in the Insights column
    Given a Discovery with one or more Insights in the Insights column
    When the Analyst clicks on an Insight item
    Then the Insight is visually marked as selected
    And a selection toolbar appears showing the count of selected insights and available actions

  @fsid:FS-DeselectInsight
  Scenario: Deselect an insight
    Given one or more Insights are selected
    When the Analyst clicks on an already selected Insight
    Then the Insight is visually unmarked
    And the selection toolbar updates the count
    And if no Insights remain selected the selection toolbar disappears

  @fsid:FS-ClearInsightSelection
  Scenario: Clear all selected insights
    Given one or more Insights are selected
    When the Analyst clicks "Clear Selection" on the selection toolbar
    Then all Insights are deselected
    And the selection toolbar disappears

  @fsid:FS-TriggerRecommendationsExtraction
  Scenario: Trigger recommendations extraction from selected insights
    Given one or more Insights are selected
    When the Analyst clicks "Generate Recommendations" on the selection toolbar
    Then the system sends the selected insight texts and the Discovery goal to the extraction service
    And a loading indicator is displayed on the selection toolbar
    And the extraction service uses the Discovery goal as context to return only goal-relevant recommendations

  @fsid:FS-DisplaySuggestedRecommendations
  Scenario: Display suggested recommendations after extraction
    Given the extraction service returns a list of suggested recommendations
    Then a Suggestions panel opens showing each suggested recommendation as a card
    And each card displays the suggested recommendation text
    And each card provides "Accept", "Edit", and "Reject" actions

  @fsid:FS-AcceptSuggestedRecommendation
  Scenario: Accept a suggested recommendation
    Given the Suggestions panel is showing suggested recommendations
    When the Analyst clicks "Accept" on a suggested recommendation card
    Then a new Recommendation is added to the Recommendations column with the suggested text
    And the new Recommendation is linked to the selected source Insights via related_insights
    And the accepted card is removed from the Suggestions panel

  @fsid:FS-EditSuggestedRecommendation
  Scenario: Edit a suggested recommendation before accepting
    Given the Suggestions panel is showing suggested recommendations
    When the Analyst clicks "Edit" on a suggested recommendation card
    Then the card becomes editable with the suggested text in an input field
    When the Analyst modifies the text and confirms
    Then a new Recommendation is added to the Recommendations column with the modified text
    And the new Recommendation is linked to the selected source Insights via related_insights
    And the edited card is removed from the Suggestions panel

  @fsid:FS-RejectSuggestedRecommendation
  Scenario: Reject a suggested recommendation
    Given the Suggestions panel is showing suggested recommendations
    When the Analyst clicks "Reject" on a suggested recommendation card
    Then the card is removed from the Suggestions panel
    And no Recommendation is added to the pipeline

  @fsid:FS-AcceptAllSuggestedRecommendations
  Scenario: Accept all remaining suggested recommendations
    Given the Suggestions panel is showing one or more suggested recommendations
    When the Analyst clicks "Accept All"
    Then each remaining suggested recommendation is added to the Recommendations column
    And each new Recommendation is linked to the selected source Insights via related_insights
    And the Suggestions panel closes

  @fsid:FS-RejectAllSuggestedRecommendations
  Scenario: Reject all remaining suggested recommendations
    Given the Suggestions panel is showing one or more suggested recommendations
    When the Analyst clicks "Reject All"
    Then all remaining suggested recommendation cards are removed
    And no Recommendations are added to the pipeline
    And the Suggestions panel closes

  @fsid:FS-CloseSuggestionsRecommendationsPanel
  Scenario: Close the Suggestions panel without acting on remaining suggestions
    Given the Suggestions panel is showing suggested recommendations
    When the Analyst closes the Suggestions panel
    Then the panel closes
    And remaining unprocessed suggestions are discarded
    And any previously accepted recommendations remain in the pipeline

  @fsid:FS-RecommendationsExtractionErrorDisplay
  Scenario: Display error when recommendations extraction fails
    Given the Analyst triggers recommendations extraction from selected insights
    When the extraction service returns an error
    Then a toast notification displays the error message
    And no Suggestions panel is opened
    And the loading indicator is removed

  @fsid:FS-ManualRecommendationFromSelection
  Scenario: Create a recommendation manually with pre-filled related insights
    Given one or more Insights are selected
    When the Analyst clicks "Add Recommendation" on the selection toolbar
    Then the Recommendation creation modal opens with related_insights pre-filled with the selected insight IDs
    And the Analyst can edit the recommendation text and related_insights before saving

  @fsid:FS-GenerateRecommendationsDisabledWithoutSelection
  Scenario: Generate Recommendations action is not available without selection
    Given no Insights are selected
    Then no selection toolbar is displayed
    And the "Generate Recommendations" action is not available
