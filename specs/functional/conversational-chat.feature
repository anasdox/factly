Feature: Conversational Chat on Discovery
  As an Analyst
  I want to chat with Factly about the current Discovery
  So that I can ask questions, get explanations, and request modifications to any pipeline item through natural language

  Context:
  - The chat is a floating widget (bottom-right corner) accessible from an open Discovery session
  - The chat sees the full Discovery state (inputs, facts, insights, recommendations, outputs and their relationships)
  - Factly uses LLM tool calling to distinguish between answering questions and performing actions
  - Responses are streamed via SSE (token by token) for a fluid experience
  - For large discoveries exceeding a configurable item threshold, a summary is sent instead of full details

  Non-goals:
  - Chat across multiple Discovery sessions simultaneously
  - Voice input or audio responses
  - Chat without an open Discovery (the widget is only visible when a Discovery is loaded)
  - Autonomous modifications without Analyst confirmation
  - Real-time collaborative chat (multiple analysts chatting in the same session)
  - File or image attachments in the chat
  - Undo/redo of chat-driven modifications (standard pipeline undo applies)

  # ── Chat Widget Lifecycle ──

  @fsid:FS-ChatWidgetToggle
  Scenario: Open and close the chat widget
    Given a Discovery is loaded
    Then a chat button is visible in the bottom-right corner of the screen
    When the Analyst clicks the chat button
    Then the chat widget opens as a floating panel above the button
    And the chat input field is focused
    When the Analyst clicks the chat button again
    Then the chat widget closes

  @fsid:FS-ChatWidgetHiddenWithoutDiscovery
  Scenario: Chat widget is not available when no Discovery is loaded
    Given no Discovery is loaded
    Then the chat button is not visible

  @fsid:FS-ChatWidgetDraggable
  Scenario: Chat widget can be repositioned
    Given the chat widget is open
    When the Analyst drags the widget header
    Then the widget moves to the new position on screen
    And the widget remains fully visible within the viewport

  # ── Sending Messages and Streaming ──

  @fsid:FS-SendMessage
  Scenario: Analyst sends a message
    Given the chat widget is open
    When the Analyst types a message and presses Enter or clicks the send button
    Then the message appears in the chat history as an Analyst message
    And a loading indicator is displayed while waiting for the response
    And the chat input field is cleared

  @fsid:FS-StreamingResponse
  Scenario: Factly response streams token by token
    Given the Analyst has sent a message
    When Factly begins responding
    Then the response text appears progressively in the chat as tokens arrive
    And the loading indicator is replaced by the streaming text
    And the chat auto-scrolls to show the latest content

  @fsid:FS-SendMessageDisabledDuringResponse
  Scenario: Cannot send a new message while Factly is responding
    Given Factly is currently streaming a response
    Then the send button is disabled
    And the chat input field is disabled
    And a visual indicator shows that Factly is still responding

  # ── Item Referencing (@mention) ──

  @fsid:FS-ChatAtMentionAutocomplete
  Scenario: Analyst references an item using @ autocomplete
    Given the chat widget is open and a Discovery is loaded
    When the Analyst types "@" in the chat input field
    Then an autocomplete dropdown appears listing all pipeline items grouped by column (Inputs, Facts, Insights, Recommendations, Outputs)
    And each entry shows the item ID and a truncated content preview
    When the Analyst continues typing to filter (e.g., "@F-")
    Then the dropdown filters to matching items only

  @fsid:FS-ChatAtMentionSelect
  Scenario: Analyst selects an item from the autocomplete dropdown
    Given the autocomplete dropdown is showing filtered items
    When the Analyst clicks on an item or presses Enter on a highlighted item
    Then the item reference is inserted in the chat input as a styled tag showing the item ID
    And the autocomplete dropdown closes
    And the cursor is positioned after the tag for continued typing

  @fsid:FS-ChatAtMentionContext
  Scenario: Mentioned items are sent as focused context to the LLM
    Given the Analyst sends a message containing a reference to Fact F-1
    Then Fact F-1 full details (content, relationships, status, version) are included as focused context in the LLM request
    And Factly's response can reference the specific item accurately

  @fsid:FS-ChatClickItemToReference
  Scenario: Analyst clicks a pipeline item to reference it in the chat
    Given the chat widget is open
    When the Analyst clicks on an item in the pipeline while holding a modifier key (e.g., Ctrl/Cmd)
    Then the item reference is appended to the chat input as a styled tag
    And the chat input field is focused

  @fsid:FS-ChatAtMentionInResponse
  Scenario: Factly references items in its responses
    Given Factly responds with references to pipeline items
    Then each referenced item is displayed as a clickable tag in the response
    When the Analyst clicks on a referenced item tag
    Then the corresponding item is highlighted in the pipeline view

  # ── Ask Questions ──

  @fsid:FS-AskQuestionAboutDiscovery
  Scenario: Analyst asks a question about the Discovery
    Given a Discovery with inputs, facts, insights, recommendations, and outputs
    When the Analyst asks "What facts support Insight N-1?"
    Then Factly responds with a contextual answer referencing the specific items from the Discovery
    And referenced items are displayed as clickable links in the response

  @fsid:FS-AskForGapAnalysis
  Scenario: Analyst asks for gap analysis
    Given a Discovery with several facts and few insights
    When the Analyst asks "Are there gaps in my analysis?"
    Then Factly analyzes the Discovery state and identifies potential gaps
    And the response highlights facts without downstream insights or unsupported areas

  @fsid:FS-AskForSummary
  Scenario: Analyst asks for a summary of the Discovery
    Given a Discovery with populated pipeline columns
    When the Analyst asks "Summarize my findings"
    Then Factly provides a structured summary of the Discovery covering inputs, facts, insights, recommendations, and outputs

  # ── Add Items via Chat ──

  @fsid:FS-ChatAddItem
  Scenario: Analyst asks Factly to add an item
    Given a Discovery with existing inputs
    When the Analyst says "Add a fact: Climate change increases flood risk in coastal areas, based on input I-1"
    Then Factly proposes an item addition with pre-filled fields:
      | Field          | Value                                                    |
      | Type           | Fact                                                     |
      | Content        | Climate change increases flood risk in coastal areas     |
      | Related inputs | I-1                                                      |
    And the proposal is displayed as a confirmation card in the chat
    And the card provides "Confirm", "Edit", and "Cancel" actions

  @fsid:FS-ChatAddItemConfirm
  Scenario: Analyst confirms adding an item proposed by chat
    Given Factly has proposed adding a Fact via a confirmation card
    When the Analyst clicks "Confirm"
    Then the Fact is added to the pipeline with the proposed fields
    And a success message is displayed in the chat
    And the confirmation card is marked as applied

  @fsid:FS-ChatAddItemEdit
  Scenario: Analyst edits a proposed item before confirming
    Given Factly has proposed adding a Fact via a confirmation card
    When the Analyst clicks "Edit"
    Then the confirmation card becomes editable with the proposed fields in input fields
    When the Analyst modifies the content and clicks "Confirm"
    Then the Fact is added to the pipeline with the modified fields

  @fsid:FS-ChatAddItemCancel
  Scenario: Analyst cancels a proposed item addition
    Given Factly has proposed adding a Fact via a confirmation card
    When the Analyst clicks "Cancel"
    Then no item is added to the pipeline
    And the confirmation card is marked as cancelled

  # ── Delete Items via Chat ──

  @fsid:FS-ChatDeleteItem
  Scenario: Analyst asks Factly to delete an item
    Given a Discovery with Fact F-1 linked to Insight N-1
    When the Analyst says "Remove fact F-1"
    Then Factly shows a deletion confirmation card with:
      | Field               | Value                                              |
      | Item to delete      | Fact F-1 with its content text                     |
      | Downstream impact   | 1 downstream item affected (Insight N-1)           |
    And the card provides "Confirm deletion" and "Cancel" actions

  @fsid:FS-ChatDeleteItemConfirm
  Scenario: Analyst confirms deleting an item via chat
    Given Factly has proposed deleting Fact F-1 via a deletion confirmation card
    When the Analyst clicks "Confirm deletion"
    Then Fact F-1 is removed from the pipeline
    And downstream staleness propagation is triggered as per the standard pipeline rules
    And a success message is displayed in the chat

  @fsid:FS-ChatDeleteItemCancel
  Scenario: Analyst cancels a proposed deletion
    Given Factly has proposed deleting Fact F-1 via a deletion confirmation card
    When the Analyst clicks "Cancel"
    Then no item is deleted from the pipeline
    And the confirmation card is marked as cancelled

  # ── Edit Items via Chat ──

  @fsid:FS-ChatEditItem
  Scenario: Analyst asks Factly to edit an item
    Given a Discovery with Fact F-1 containing text "Original fact"
    When the Analyst says "Update fact F-1 to mention the 2024 data"
    Then Factly proposes an edit with a before/after diff:
      | Field  | Value                                         |
      | Before | Original fact                                 |
      | After  | Original fact, confirmed by 2024 data         |
    And the proposal is displayed as an edit confirmation card in the chat
    And the card provides "Apply", "Edit", and "Cancel" actions

  @fsid:FS-ChatEditItemApply
  Scenario: Analyst applies an edit proposed by chat
    Given Factly has proposed editing Fact F-1 via an edit confirmation card
    When the Analyst clicks "Apply"
    Then Fact F-1 text is updated with the proposed content
    And standard versioning and staleness propagation are triggered
    And a success message is displayed in the chat
    And the confirmation card is marked as applied

  @fsid:FS-ChatEditItemModify
  Scenario: Analyst modifies a proposed edit before applying
    Given Factly has proposed editing Fact F-1 via an edit confirmation card
    When the Analyst clicks "Edit"
    Then the "After" field becomes editable
    When the Analyst modifies the text and clicks "Apply"
    Then Fact F-1 text is updated with the Analyst-modified content

  @fsid:FS-ChatEditItemCancel
  Scenario: Analyst cancels a proposed edit
    Given Factly has proposed editing Fact F-1 via an edit confirmation card
    When the Analyst clicks "Cancel"
    Then Fact F-1 text remains unchanged
    And the confirmation card is marked as cancelled

  # ── Proactive Suggestions ──

  @fsid:FS-ChatProactiveSuggestions
  Scenario: Factly proactively suggests improvements
    Given a Discovery with facts that have no downstream insights
    When the Analyst asks "What should I do next?"
    Then Factly analyzes the Discovery state and suggests actionable next steps
    And each suggestion that involves a pipeline modification includes a confirmation card
    And the Analyst must confirm each suggestion individually before it is applied

  @fsid:FS-ChatSuggestMissingConnections
  Scenario: Factly identifies missing connections
    Given a Discovery with Insight N-1 that is not linked to any Recommendation
    When the Analyst asks "Are there any missing connections?"
    Then Factly identifies the unlinked Insight and explains the gap
    And optionally proposes a Recommendation to address it via a confirmation card

  # ── Chat History ──

  @fsid:FS-ChatHistoryPersisted
  Scenario: Chat history is persisted per Discovery session
    Given the Analyst has exchanged messages with Factly on a Discovery
    When the Analyst closes and reopens the chat widget
    Then the previous messages are still visible in the chat

  @fsid:FS-ChatHistorySavedWithDiscovery
  Scenario: Chat history is included when exporting a Discovery
    Given a Discovery with chat history
    When the Analyst exports the Discovery to JSON
    Then the exported file includes the chat history
    When the Analyst imports the JSON file
    Then the chat history is restored

  @fsid:FS-ChatHistoryClearedOnNewDiscovery
  Scenario: Chat history is cleared when creating a new Discovery
    Given a Discovery with chat history
    When the Analyst creates a new Discovery
    Then the chat history is empty

  # ── Context Management ──

  @fsid:FS-ChatFullContextBelowThreshold
  Scenario: Full Discovery context sent when below item threshold
    Given a Discovery with fewer items than the configured threshold
    When the Analyst sends a message
    Then the full Discovery state (all items with content and relationships) is included in the LLM context

  @fsid:FS-ChatSummarizedContextAboveThreshold
  Scenario: Summarized Discovery context sent when above item threshold
    Given a Discovery with more items than the configured threshold
    When the Analyst sends a message
    Then a summarized version of the Discovery is included in the LLM context
    And the summary includes item counts per column, key themes, and relationship overview

  # ── Error Handling ──

  @fsid:FS-ChatErrorDisplay
  Scenario: Display error when chat service fails
    Given the Analyst sends a message in the chat
    When the chat service returns an error
    Then an error message is displayed in the chat
    And the Analyst can retry by sending a new message

  @fsid:FS-ChatActionErrorRollback
  Scenario: Confirmed action fails to apply
    Given the Analyst confirms an item addition via chat
    When the action fails to apply (e.g., validation error)
    Then an error message is displayed in the chat explaining the failure
    And no item is added to the pipeline
    And the confirmation card returns to its pre-confirmation state

  @fsid:FS-ChatStreamingInterruption
  Scenario: Streaming response is interrupted
    Given Factly is streaming a response
    When the connection is lost or the stream is interrupted
    Then the partial response is displayed with an indication that it was interrupted
    And the Analyst can send a new message to retry
