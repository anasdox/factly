Feature: AI-Assisted Reformulation Suggestions
  As an Analyst
  I want to get alternative reformulations when creating or editing a fact, insight, or recommendation
  So that I can improve the clarity, precision, or actionability of my items

  Non-goals:
  - Reformulation of inputs or outputs
  - Auto-reformulation without analyst action (must click "Reformulate")
  - Generating text from scratch when the field is empty
  - Replacing the analyst's text automatically (analyst must choose)
  - Reformulation of relationship fields (only the text field)
  - Batch reformulation of multiple items at once

  # --- Reformulate Button Visibility ---

  @fsid:FS-ReformulateButtonVisibleInFactModal
  Scenario: Reformulate button is visible in the fact create/edit modal
    Given the analyst opens the fact modal in add or edit mode
    Then a "Reformulate" button is visible near the text field

  @fsid:FS-ReformulateButtonVisibleInInsightModal
  Scenario: Reformulate button is visible in the insight create/edit modal
    Given the analyst opens the insight modal in add or edit mode
    Then a "Reformulate" button is visible near the text field

  @fsid:FS-ReformulateButtonVisibleInRecommendationModal
  Scenario: Reformulate button is visible in the recommendation create/edit modal
    Given the analyst opens the recommendation modal in add or edit mode
    Then a "Reformulate" button is visible near the text field

  # --- Disabled State ---

  @fsid:FS-ReformulateButtonDisabledWhenTextEmpty
  Scenario: Reformulate button is disabled when the text field is empty
    Given the analyst opens a fact, insight, or recommendation modal
    And the text field is empty
    Then the "Reformulate" button is disabled

  @fsid:FS-ReformulateButtonEnabledWhenTextPresent
  Scenario: Reformulate button is enabled when the text field has content
    Given the analyst opens a fact, insight, or recommendation modal
    And the text field contains text
    Then the "Reformulate" button is enabled

  # --- Triggering Reformulation ---

  @fsid:FS-TriggerReformulationOnClick
  Scenario: Clicking Reformulate sends the item text to the backend
    Given the analyst has entered text in the text field
    When the analyst clicks "Reformulate"
    Then a loading indicator appears on the button
    And the backend receives the item text, item type, and related items context

  @fsid:FS-DisplayReformulationSuggestions
  Scenario: Reformulation suggestions appear inline in the modal
    Given the analyst clicked "Reformulate"
    When the backend returns suggestions
    Then 2-3 alternative reformulations appear below the text field
    And each suggestion shows the proposed text and a short justification

  # --- Selecting a Suggestion ---

  @fsid:FS-SelectSuggestionReplacesText
  Scenario: Selecting a suggestion replaces the text field content
    Given reformulation suggestions are displayed
    When the analyst clicks on a suggestion
    Then the text field content is replaced with the selected suggestion text
    And the suggestions list is dismissed

  @fsid:FS-EditAfterSelectingSuggestion
  Scenario: Analyst can further edit after selecting a suggestion
    Given the analyst selected a reformulation suggestion
    Then the text field is editable
    And the analyst can modify the text before saving

  @fsid:FS-DismissSuggestionsKeepsOriginal
  Scenario: Dismissing suggestions keeps the original text
    Given reformulation suggestions are displayed
    When the analyst dismisses the suggestions (clicks outside or presses Escape)
    Then the text field retains the original text
    And the suggestions list is hidden

  # --- Re-triggering ---

  @fsid:FS-ReformulateAgainAfterEdit
  Scenario: Analyst can reformulate again after editing
    Given the analyst selected a suggestion or edited the text
    When the analyst clicks "Reformulate" again
    Then new suggestions are generated based on the current text field content

  # --- Context-Aware Reformulation ---

  @fsid:FS-ReformulationUsesRelatedItemsContext
  Scenario: Reformulation considers related items for context
    Given a fact has related inputs
    When the analyst clicks "Reformulate" on this fact
    Then the LLM receives the related inputs text as context
    And the suggestions use vocabulary consistent with the related items

  @fsid:FS-ReformulationUsesDiscoveryGoal
  Scenario: Reformulation considers the discovery goal
    Given the discovery has a defined goal
    When the analyst clicks "Reformulate"
    Then the LLM receives the discovery goal as context
    And the suggestions are aligned with the research goal

  # --- Error Handling ---

  @fsid:FS-ReformulationErrorShowsMessage
  Scenario: Backend error during reformulation shows a message
    Given the analyst clicked "Reformulate"
    When the backend returns an error
    Then an error message is displayed to the analyst
    And the original text field content is preserved

  @fsid:FS-ReformulationTimeoutShowsMessage
  Scenario: Timeout during reformulation shows a message
    Given the analyst clicked "Reformulate"
    When the request times out
    Then a timeout message is displayed to the analyst
    And the original text field content is preserved

  # --- LLM Service Unavailable ---

  @fsid:FS-ReformulateButtonHiddenWhenNoLLM
  Scenario: Reformulate button is hidden when LLM service is not configured
    Given the LLM service is not configured on the backend
    When the analyst opens a fact, insight, or recommendation modal
    Then the "Reformulate" button is not visible
