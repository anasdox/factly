Feature: Bulk Review Workflow
  As an Analyst
  I want to review multiple stale items at once with AI-proposed updates
  So that I can efficiently process a batch of items flagged for review after upstream changes

  Context:
  - The pipeline may flag many items after an upstream change (needs_review, needs_refresh, etc.)
  - Flagged items may be scrolled out of view in long lists
  - The Analyst needs a way to locate, select, and batch-review flagged items
  - The bulk review modal fetches AI proposals in parallel for all selected reviewable items
  - Each proposal can be individually accepted, edited, or dismissed
  - Accepting a proposal creates a new version and triggers downstream propagation
  - The review workflow is available on Facts, Insights, Recommendations, and Outputs

  Non-goals:
  - Bulk review for Inputs (Inputs have no upstream to compare against)
  - Automatic acceptance of all proposals without Analyst review
  - Partial text merging between current and proposed text
  - Ordering or prioritizing proposals by weight or status severity

  # ── Review indicator ──

  @fsid:FS-ReviewCountButton
  Scenario: Review count button is displayed when items need review
    Given a column with 3 items that have an actionable status (needs_review, needs_refresh, weak, risky, unsupported)
    Then a button "3 to review" is displayed in the column header
    And the button uses the same shape as "Select All" but with the needs-review color

  @fsid:FS-ReviewCountButtonHiddenWhenNone
  Scenario: Review count button is not displayed when no items need review
    Given a column where all items have status "draft" or "validated"
    Then no review count button is displayed in the column header

  # ── Select reviewable items ──

  @fsid:FS-SelectReviewableItems
  Scenario: Clicking the review count button selects all reviewable items
    Given a column with 5 facts, 2 of which have status "needs_review"
    When the Analyst clicks the "2 to review" button
    Then the 2 reviewable facts are selected
    And the view scrolls to the first reviewable fact

  @fsid:FS-ScrollToFirstReviewable
  Scenario: Scroll to first reviewable item when items are out of view
    Given a column with many items where the reviewable items are scrolled below the visible area
    When the Analyst clicks the review count button
    Then the column scrolls to bring the first reviewable item into view

  # ── Toolbar review button ──

  @fsid:FS-ToolbarReviewButton
  Scenario: Review button appears in the selection toolbar for reviewable items
    Given the Analyst has selected items that include at least one with an actionable status
    And the backend is available
    Then a "Review" button is displayed in the selection toolbar
    And the button uses the needs-review color to indicate its purpose

  @fsid:FS-ToolbarReviewButtonHiddenWhenNoReviewable
  Scenario: Review button is not shown when no selected items are reviewable
    Given the Analyst has selected items that all have status "draft" or "validated"
    Then no "Review" button is displayed in the selection toolbar

  # ── Bulk review modal ──

  @fsid:FS-BulkReviewModalOpens
  Scenario: Opening the bulk review modal triggers parallel AI proposals
    Given the Analyst has selected 3 reviewable facts
    When the Analyst clicks the "Review" button in the toolbar
    Then a modal opens showing 3 proposal cards
    And each card displays a loading indicator while the AI generates the proposal
    And all 3 AI proposals are fetched in parallel

  @fsid:FS-BulkReviewProposalCard
  Scenario: Each proposal card shows current text and AI-proposed text
    Given the bulk review modal is open with a completed proposal
    Then the proposal card displays:
      - the entity type label
      - the current text with Markdown rendering
      - the AI-proposed text with Markdown rendering
      - "Accept", "Edit", and "Dismiss" action buttons

  @fsid:FS-BulkReviewAcceptProposal
  Scenario: Accept a single proposal in the bulk review modal
    Given the bulk review modal shows a completed proposal for Fact F-1
    When the Analyst clicks "Accept" on that proposal
    Then Fact F-1 text is updated to the proposed text
    And a new version is created for Fact F-1
    And the Fact status is cleared
    And downstream propagation is triggered
    And the proposal card is removed from the modal

  @fsid:FS-BulkReviewEditProposal
  Scenario: Edit a proposal before accepting
    Given the bulk review modal shows a completed proposal
    When the Analyst clicks "Edit"
    Then the proposed text becomes an editable textarea
    When the Analyst modifies the text and clicks "Accept"
    Then the entity is updated with the modified text

  @fsid:FS-BulkReviewDismissProposal
  Scenario: Dismiss a single proposal
    Given the bulk review modal shows a completed proposal for Fact F-1
    When the Analyst clicks "Dismiss" on that proposal
    Then the proposal card is removed from the modal
    And Fact F-1 text and status remain unchanged

  # ── Bulk actions ──

  @fsid:FS-BulkReviewAcceptAll
  Scenario: Accept all ready proposals at once
    Given the bulk review modal shows 3 completed proposals
    When the Analyst clicks "Accept All"
    Then all 3 entities are updated sequentially with their proposed text
    And new versions are created for each entity
    And downstream propagation is triggered for each entity
    And the accepted proposal cards are removed from the modal
    And the button is disabled during processing to prevent double-click

  @fsid:FS-BulkReviewDismissAll
  Scenario: Dismiss all proposals at once
    Given the bulk review modal shows proposals
    When the Analyst clicks "Dismiss All"
    Then all proposal cards are removed
    And no entities are modified

  # ── Auto-close ──

  @fsid:FS-BulkReviewAutoClose
  Scenario: Modal closes automatically when all proposals are handled
    Given the bulk review modal shows 2 proposals
    When the Analyst accepts the first and dismisses the second
    Then the modal closes automatically

  # ── Error handling ──

  @fsid:FS-BulkReviewProposalError
  Scenario: Display error when an individual AI proposal fails
    Given the bulk review modal is fetching proposals
    When the AI fails to generate a proposal for one item
    Then that proposal card shows an error message
    And other proposal cards continue loading or displaying normally

  @fsid:FS-BulkReviewTruncationError
  Scenario: Display error when an output proposal is truncated
    Given the bulk review modal is fetching a proposal for an Output
    When the AI response is truncated due to token limits
    Then the proposal card shows an error "Response truncated — output too long"
    And no partial text is displayed

  # ── Output-specific behavior ──

  @fsid:FS-BulkReviewOutputMarkdownPreview
  Scenario: Output proposals are rendered as Markdown preview
    Given the bulk review modal shows a proposal for an Output of type "report"
    Then both the current text and proposed text are rendered as Markdown
    And headings, lists, tables, and blockquotes are visually formatted

  @fsid:FS-BulkReviewOutputUsesRawMarkdownPrompt
  Scenario: Output proposals use a dedicated prompt to avoid JSON truncation
    Given the Analyst triggers a bulk review for an Output
    Then the backend uses a raw Markdown prompt instead of JSON wrapping
    And the AI returns the proposed document directly in Markdown
    And the response is parsed by splitting on the explanation separator
