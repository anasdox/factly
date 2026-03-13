Feature: Internet Research for Input Discovery
  As an Analyst
  I want to search the Internet for sources relevant to my discovery goal
  So that I can populate the pipeline with quality inputs without manual source hunting

  Non-goals:
  - Research based on existing inputs (search uses goal only)
  - Automatic addition of inputs without analyst validation
  - Credibility scoring or source trustworthiness assessment
  - Full-text archiving of web pages
  - Research for entity types other than inputs (facts, insights, recommendations, outputs)
  - Replacing the existing manual input creation flow

  # --- Research Button Visibility and State ---

  @fsid:FS-ResearchButtonVisibleInInputColumn
  Scenario: Research button is visible in the input column
    Given the analyst has an open discovery with a goal
    Then a "Research" button is visible in the Inputs column header area

  @fsid:FS-ResearchButtonDisabledWithoutGoal
  Scenario: Research button is disabled when the discovery has no goal
    Given the analyst has an open discovery with an empty goal
    Then the "Research" button is disabled
    And a tooltip indicates that a goal is required

  @fsid:FS-ResearchButtonDisabledWithoutBackend
  Scenario: Research button is hidden when the backend is unavailable
    Given the backend is not reachable
    Then the "Research" button is not visible

  # --- Triggering Research ---

  @fsid:FS-TriggerResearchSendsGoal
  Scenario: Triggering research sends the discovery goal to the backend
    Given the analyst has a discovery with goal "Understand climate change impact on agriculture"
    When the analyst clicks the "Research" button
    Then the system sends the discovery goal to the backend for Internet research
    And a loading indicator is displayed while the search is in progress

  @fsid:FS-ResearchReturnsUpToTenSuggestions
  Scenario: Research returns up to 10 input suggestions
    Given the analyst triggers a research
    When the backend completes the Internet search and content extraction
    Then up to 10 input suggestions are displayed
    And each suggestion contains a title, a summary of extracted content, a source URL, and a relevance justification

  # --- Suggestion Presentation ---

  @fsid:FS-SuggestionDisplaysTitle
  Scenario: Each suggestion displays a title
    Given research suggestions are displayed
    Then each suggestion shows a title derived from the web page

  @fsid:FS-SuggestionDisplaysSummary
  Scenario: Each suggestion displays an extracted content summary
    Given research suggestions are displayed
    Then each suggestion shows a summary of the key points relevant to the discovery goal

  @fsid:FS-SuggestionDisplaysSourceUrl
  Scenario: Each suggestion displays the source URL
    Given research suggestions are displayed
    Then each suggestion shows a clickable source URL

  @fsid:FS-SuggestionDisplaysRelevanceJustification
  Scenario: Each suggestion displays a relevance justification
    Given research suggestions are displayed
    Then each suggestion shows a short justification explaining why this source is relevant to the goal

  # --- Accept, Edit, Reject ---

  @fsid:FS-AcceptSuggestionAddsInput
  Scenario: Accepting a suggestion adds it as a new input
    Given research suggestions are displayed
    When the analyst accepts a suggestion
    Then a new input of type "web" is added to the pipeline
    And the input text contains the extracted summary
    And the source URL is preserved in the input

  @fsid:FS-RejectSuggestionRemovesIt
  Scenario: Rejecting a suggestion removes it from the list
    Given research suggestions are displayed
    When the analyst rejects a suggestion
    Then the suggestion is removed from the list
    And no input is added to the pipeline

  @fsid:FS-EditSuggestionBeforeAccepting
  Scenario: Editing a suggestion before accepting
    Given research suggestions are displayed
    When the analyst edits a suggestion's text
    And then accepts it
    Then the modified text is used as the input text
    And the source URL is preserved

  @fsid:FS-AcceptMultipleSuggestions
  Scenario: Accepting multiple suggestions adds multiple inputs
    Given research suggestions are displayed
    When the analyst accepts 3 out of 10 suggestions
    Then 3 new inputs of type "web" are added to the pipeline

  @fsid:FS-DismissAllSuggestions
  Scenario: Dismissing the suggestion panel discards all remaining suggestions
    Given research suggestions are displayed
    When the analyst dismisses the suggestion panel
    Then all remaining suggestions are discarded
    And no additional inputs are added

  # --- Error Handling ---

  @fsid:FS-ResearchErrorDisplaysMessage
  Scenario: Search API error displays an error message
    Given the analyst triggers a research
    When the search API returns an error
    Then an error message is displayed to the analyst
    And the analyst can retry the research

  @fsid:FS-ResearchNoResultsDisplaysMessage
  Scenario: No relevant results found displays a message
    Given the analyst triggers a research
    When the search returns no results relevant to the goal
    Then a message indicates that no relevant sources were found
    And the analyst can retry with a different goal

  @fsid:FS-ResearchPageFetchPartialFailure
  Scenario: Some pages fail to load but other results are still shown
    Given the analyst triggers a research
    When some web pages fail to load during content extraction
    Then the successfully extracted suggestions are still displayed
    And a notice indicates that some sources could not be accessed

  # --- Re-research ---

  @fsid:FS-ReResearchAllowed
  Scenario: Analyst can trigger research multiple times
    Given the analyst has already performed a research
    When the analyst clicks the "Research" button again
    Then a new search is performed
    And new suggestions replace the previous ones
