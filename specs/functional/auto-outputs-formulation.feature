Feature: Auto Outputs Formulation from Recommendations
  As an Analyst
  I want to select recommendations and formulate typed outputs from them using AI assistance
  So that I can produce structured deliverables faster while keeping full control over what enters the pipeline

  Context:
  - The Discovery goal is used as formulation context so that suggested outputs are relevant to the analyst's research objective
  - The recommendation selection mechanism also improves manual output creation by pre-filling related_recommendations
  - Outputs have a type that determines the structure and tone of the generated content:
    - report: structured synthesis of findings
    - presentation: key points for a slide deck
    - action_plan: concrete steps with deadlines
    - brief: executive summary for decision makers

  Non-goals:
  - Fully automatic formulation without analyst validation
  - Formulation from entities other than recommendations (inputs, facts, insights)
  - Modification of the original recommendation content
  - Persisting suggested outputs that are rejected
  - Multi-column selection (selecting across recommendations and insights simultaneously)

  @fsid:FS-SelectRecommendations
  Scenario: Select recommendations in the Recommendations column
    Given a Discovery with one or more Recommendations in the Recommendations column
    When the Analyst clicks on a Recommendation item
    Then the Recommendation is visually marked as selected
    And a selection toolbar appears showing the count of selected recommendations and available actions

  @fsid:FS-DeselectRecommendation
  Scenario: Deselect a recommendation
    Given one or more Recommendations are selected
    When the Analyst clicks on an already selected Recommendation
    Then the Recommendation is visually unmarked
    And the selection toolbar updates the count
    And if no Recommendations remain selected the selection toolbar disappears

  @fsid:FS-ClearRecommendationSelection
  Scenario: Clear all selected recommendations
    Given one or more Recommendations are selected
    When the Analyst clicks "Clear Selection" on the selection toolbar
    Then all Recommendations are deselected
    And the selection toolbar disappears

  @fsid:FS-SelectOutputType
  Scenario: Select output type before formulation
    Given one or more Recommendations are selected
    Then the selection toolbar displays a dropdown with output types: "Report", "Presentation", "Action Plan", "Brief"
    And the dropdown defaults to "Report"

  @fsid:FS-TriggerOutputsFormulation
  Scenario: Trigger outputs formulation from selected recommendations
    Given one or more Recommendations are selected
    And an output type is selected in the dropdown
    When the Analyst clicks "Formulate Outputs" on the selection toolbar
    Then the system sends the selected recommendation texts, the output type, and the Discovery goal to the formulation service
    And a loading indicator is displayed on the selection toolbar
    And the formulation service uses the output type and Discovery goal as context to return type-appropriate outputs

  @fsid:FS-DisplaySuggestedOutputs
  Scenario: Display suggested outputs after formulation
    Given the formulation service returns a list of suggested outputs
    Then a Suggestions panel opens showing each suggested output as a card
    And each card displays the suggested output text
    And each card provides "Accept", "Edit", and "Reject" actions

  @fsid:FS-AcceptSuggestedOutput
  Scenario: Accept a suggested output
    Given the Suggestions panel is showing suggested outputs
    When the Analyst clicks "Accept" on a suggested output card
    Then a new Output is added to the Outputs column with the suggested text and selected type
    And the new Output is linked to the selected source Recommendations via related_recommendations
    And the accepted card is removed from the Suggestions panel

  @fsid:FS-EditSuggestedOutput
  Scenario: Edit a suggested output before accepting
    Given the Suggestions panel is showing suggested outputs
    When the Analyst clicks "Edit" on a suggested output card
    Then the card becomes editable with the suggested text in an input field
    When the Analyst modifies the text and confirms
    Then a new Output is added to the Outputs column with the modified text and selected type
    And the new Output is linked to the selected source Recommendations via related_recommendations
    And the edited card is removed from the Suggestions panel

  @fsid:FS-RejectSuggestedOutput
  Scenario: Reject a suggested output
    Given the Suggestions panel is showing suggested outputs
    When the Analyst clicks "Reject" on a suggested output card
    Then the card is removed from the Suggestions panel
    And no Output is added to the pipeline

  @fsid:FS-AcceptAllSuggestedOutputs
  Scenario: Accept all remaining suggested outputs
    Given the Suggestions panel is showing one or more suggested outputs
    When the Analyst clicks "Accept All"
    Then each remaining suggested output is added to the Outputs column with the selected type
    And each new Output is linked to the selected source Recommendations via related_recommendations
    And the Suggestions panel closes

  @fsid:FS-RejectAllSuggestedOutputs
  Scenario: Reject all remaining suggested outputs
    Given the Suggestions panel is showing one or more suggested outputs
    When the Analyst clicks "Reject All"
    Then all remaining suggested output cards are removed
    And no Outputs are added to the pipeline
    And the Suggestions panel closes

  @fsid:FS-CloseSuggestionsOutputsPanel
  Scenario: Close the Suggestions panel without acting on remaining suggestions
    Given the Suggestions panel is showing suggested outputs
    When the Analyst closes the Suggestions panel
    Then the panel closes
    And remaining unprocessed suggestions are discarded
    And any previously accepted outputs remain in the pipeline

  @fsid:FS-OutputsFormulationErrorDisplay
  Scenario: Display error when outputs formulation fails
    Given the Analyst triggers outputs formulation from selected recommendations
    When the formulation service returns an error
    Then a toast notification displays the error message
    And no Suggestions panel is opened
    And the loading indicator is removed

  @fsid:FS-ManualOutputFromSelection
  Scenario: Create an output manually with pre-filled related recommendations
    Given one or more Recommendations are selected
    When the Analyst clicks "Add Output" on the selection toolbar
    Then the Output creation modal opens with related_recommendations pre-filled with the selected recommendation IDs
    And the Analyst can edit the output text, type, and related_recommendations before saving

  @fsid:FS-FormulateOutputsDisabledWithoutSelection
  Scenario: Formulate Outputs action is not available without selection
    Given no Recommendations are selected
    Then no selection toolbar is displayed
    And the "Formulate Outputs" action is not available
