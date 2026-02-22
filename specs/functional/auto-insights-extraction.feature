Feature: Auto Insights Extraction from Facts
  As an Analyst
  I want to select facts and extract insights from them using AI assistance
  So that I can derive higher-level conclusions faster while keeping full control over what enters the pipeline

  Context:
  - The Discovery goal is used as extraction context so that suggested insights are relevant to the analyst's research objective
  - The fact selection mechanism also improves manual insight creation by pre-filling related_facts

  Non-goals:
  - Fully automatic extraction without analyst validation
  - Extraction from entities other than facts (inputs, recommendations, outputs)
  - Modification of the original fact content
  - Persisting suggested insights that are rejected
  - Multi-column selection (selecting across facts and inputs simultaneously)

  @fsid:FS-SelectFacts
  Scenario: Select facts in the Facts column
    Given a Discovery with one or more Facts in the Facts column
    When the Analyst clicks on a Fact item
    Then the Fact is visually marked as selected
    And a selection toolbar appears showing the count of selected facts and available actions

  @fsid:FS-DeselectFact
  Scenario: Deselect a fact
    Given one or more Facts are selected
    When the Analyst clicks on an already selected Fact
    Then the Fact is visually unmarked
    And the selection toolbar updates the count
    And if no Facts remain selected the selection toolbar disappears

  @fsid:FS-ClearFactSelection
  Scenario: Clear all selected facts
    Given one or more Facts are selected
    When the Analyst clicks "Clear" on the selection toolbar
    Then all Facts are deselected
    And the selection toolbar disappears

  @fsid:FS-TriggerInsightsExtraction
  Scenario: Trigger insights extraction from selected facts
    Given one or more Facts are selected
    When the Analyst clicks "Generate Insights" on the selection toolbar
    Then the system sends the selected fact texts and the Discovery goal to the extraction service
    And a loading indicator is displayed on the selection toolbar
    And the extraction service uses the Discovery goal as context to return only goal-relevant insights

  @fsid:FS-DisplaySuggestedInsights
  Scenario: Display suggested insights after extraction
    Given the extraction service returns a list of suggested insights
    Then a Suggestions panel opens showing each suggested insight as a card
    And each card displays the suggested insight text
    And each card provides "Accept", "Edit", and "Reject" actions

  @fsid:FS-AcceptSuggestedInsight
  Scenario: Accept a suggested insight
    Given the Suggestions panel is showing suggested insights
    When the Analyst clicks "Accept" on a suggested insight card
    Then a new Insight is added to the Insights column with the suggested text
    And the new Insight is linked to the selected source Facts via related_facts
    And the accepted card is removed from the Suggestions panel

  @fsid:FS-EditSuggestedInsight
  Scenario: Edit a suggested insight before accepting
    Given the Suggestions panel is showing suggested insights
    When the Analyst clicks "Edit" on a suggested insight card
    Then the card becomes editable with the suggested text in an input field
    When the Analyst modifies the text and confirms
    Then a new Insight is added to the Insights column with the modified text
    And the new Insight is linked to the selected source Facts via related_facts
    And the edited card is removed from the Suggestions panel

  @fsid:FS-RejectSuggestedInsight
  Scenario: Reject a suggested insight
    Given the Suggestions panel is showing suggested insights
    When the Analyst clicks "Reject" on a suggested insight card
    Then the card is removed from the Suggestions panel
    And no Insight is added to the pipeline

  @fsid:FS-AcceptAllSuggestedInsights
  Scenario: Accept all remaining suggested insights
    Given the Suggestions panel is showing one or more suggested insights
    When the Analyst clicks "Accept All"
    Then each remaining suggested insight is added to the Insights column
    And each new Insight is linked to the selected source Facts via related_facts
    And the Suggestions panel closes

  @fsid:FS-RejectAllSuggestedInsights
  Scenario: Reject all remaining suggested insights
    Given the Suggestions panel is showing one or more suggested insights
    When the Analyst clicks "Reject All"
    Then all remaining suggested insight cards are removed
    And no Insights are added to the pipeline
    And the Suggestions panel closes

  @fsid:FS-CloseSuggestionsInsightsPanel
  Scenario: Close the Suggestions panel without acting on remaining suggestions
    Given the Suggestions panel is showing suggested insights
    When the Analyst closes the Suggestions panel
    Then the panel closes
    And remaining unprocessed suggestions are discarded
    And any previously accepted insights remain in the pipeline

  @fsid:FS-InsightsExtractionErrorDisplay
  Scenario: Display error when insights extraction fails
    Given the Analyst triggers insights extraction from selected facts
    When the extraction service returns an error
    Then a toast notification displays the error message
    And no Suggestions panel is opened
    And the loading indicator is removed

  @fsid:FS-ManualInsightFromSelection
  Scenario: Create an insight manually with pre-filled related facts
    Given one or more Facts are selected
    When the Analyst clicks "Add Insight" on the selection toolbar
    Then the Insight creation modal opens with related_facts pre-filled with the selected fact IDs
    And the Analyst can edit the insight text and related_facts before saving

  @fsid:FS-GenerateInsightsDisabledWithoutSelection
  Scenario: Generate Insights action is not available without selection
    Given no Facts are selected
    Then the selection toolbar is not expanded
    And the "Generate Insights" action is not available to the Analyst
