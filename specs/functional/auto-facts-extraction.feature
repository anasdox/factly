Feature: Auto Facts Extraction from Selected Inputs
  As an Analyst
  I want to extract facts from a text Input using AI assistance
  So that I can populate the Facts column faster while keeping full control over what enters the pipeline

  Context:
  - The Discovery goal is used as extraction context so that suggested facts are relevant to the analyst's research objective

  Non-goals:
  - Fully automatic extraction without analyst validation
  - Modification of the original Input content
  - Persisting suggested facts that are rejected

  @fsid:FS-TriggerFactsExtraction
  Scenario: Trigger facts extraction from selected Inputs
    Given a Discovery with a goal and at least one selectable Input with extractable content
    When the Analyst selects one or more Inputs
    And clicks "Generate Facts" on the selection toolbar
    Then the system sends each selected Input content and the Discovery goal to the extraction service
    And a loading indicator is displayed on the selection toolbar
    And the extraction service uses the Discovery goal as context to return only goal-relevant facts

  @fsid:FS-DisplaySuggestedFacts
  Scenario: Display suggested facts after extraction
    Given the extraction service returns a list of suggested facts
    Then a Suggestions panel opens showing each suggested fact as a card
    And each card displays the suggested fact text
    And each card provides "Accept", "Edit", and "Reject" actions

  @fsid:FS-AcceptSuggestedFact
  Scenario: Accept a suggested fact
    Given the Suggestions panel is showing suggested facts for an Input
    When the Analyst clicks "Accept" on a suggested fact card
    Then a new Fact is added to the Facts column with the suggested text
    And the new Fact is linked to the source Input via related_inputs
    And the accepted card is removed from the Suggestions panel

  @fsid:FS-EditSuggestedFact
  Scenario: Edit a suggested fact before accepting
    Given the Suggestions panel is showing suggested facts for an Input
    When the Analyst clicks "Edit" on a suggested fact card
    Then the card becomes editable with the suggested text in an input field
    When the Analyst modifies the text and confirms
    Then a new Fact is added to the Facts column with the modified text
    And the new Fact is linked to the source Input via related_inputs
    And the edited card is removed from the Suggestions panel

  @fsid:FS-RejectSuggestedFact
  Scenario: Reject a suggested fact
    Given the Suggestions panel is showing suggested facts for an Input
    When the Analyst clicks "Reject" on a suggested fact card
    Then the card is removed from the Suggestions panel
    And no Fact is added to the pipeline

  @fsid:FS-AcceptAllSuggestedFacts
  Scenario: Accept all remaining suggested facts
    Given the Suggestions panel is showing one or more suggested facts
    When the Analyst clicks "Accept All"
    Then each remaining suggested fact is added to the Facts column
    And each new Fact is linked to the source Input via related_inputs
    And the Suggestions panel closes

  @fsid:FS-RejectAllSuggestedFacts
  Scenario: Reject all remaining suggested facts
    Given the Suggestions panel is showing one or more suggested facts
    When the Analyst clicks "Reject All"
    Then all remaining suggested fact cards are removed
    And no Facts are added to the pipeline
    And the Suggestions panel closes

  @fsid:FS-CloseSuggestionsPanel
  Scenario: Close the Suggestions panel without acting on remaining suggestions
    Given the Suggestions panel is showing suggested facts
    When the Analyst closes the Suggestions panel
    Then the panel closes
    And remaining unprocessed suggestions are discarded
    And any previously accepted facts remain in the pipeline

  @fsid:FS-ExtractionErrorDisplay
  Scenario: Display error when extraction fails
    Given the Analyst triggers facts extraction on a text Input
    When the extraction service returns an error
    Then a toast notification displays the error message
    And no Suggestions panel is opened
    And the loading indicator is removed

  @fsid:FS-ExtractFactsDisabledForNonText
  Scenario: Generate Facts action is available for selected non-text Inputs supported by the UI
    Given a Discovery contains a selectable Input of a non-text type supported by the UI
    When the Analyst selects that Input
    Then the "Generate Facts" action is displayed on the selection toolbar

  @fsid:FS-ExtractFactsDisabledForEmptyText
  Scenario: Generate Facts action remains available for selected text Inputs with empty content
    Given a Discovery contains a text Input with empty text content
    When the Analyst selects that Input
    Then the "Generate Facts" action is displayed on the selection toolbar
