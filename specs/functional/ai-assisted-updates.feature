Feature: AI-Assisted Update Proposals
  As an Analyst
  I want the AI to propose updated text for stale downstream entities
  So that I can quickly bring affected items up to date after an upstream change

  Context:
  - When an upstream entity is edited (substance change), downstream entities are marked with an actionable status (needs_review, needs_refresh, weak, risky, unsupported)
  - The Analyst can trigger AI-assisted update proposals for any stale entity
  - The AI receives the original entity text, the updated upstream entity, and the Discovery goal, then proposes new text
  - The Analyst always validates, edits, or rejects AI proposals before they enter the pipeline
  - Accepted proposals create a new version of the target entity and clear its status

  Non-goals:
  - Fully automatic updates without Analyst validation
  - Batch AI updates of all stale items at once (Analyst triggers per item)
  - AI proposing structural changes (adding/removing relationships)
  - AI updating entities across Discovery sessions

  # ── Trigger AI update ──

  @fsid:FS-TriggerAiUpdateOnStaleItem
  Scenario: Trigger AI update proposal for a stale entity
    Given a Fact with status "needs_review"
    And the backend is available
    When the Analyst clicks the "Propose update" action on that Fact
    Then the system sends a request to the backend with:
      - the current Fact text
      - the updated upstream entity (Input) text
      - the Discovery goal
      - the entity type and relationships context
    And a loading indicator is displayed on the Fact item

  @fsid:FS-DisplayAiUpdateProposal
  Scenario: Display the AI-proposed update
    Given the AI returns a proposed update for a stale Fact
    Then a proposal panel opens showing:
      - the current Fact text (for comparison)
      - the AI-proposed updated text
      - "Accept", "Edit", and "Reject" actions

  @fsid:FS-AcceptAiUpdateProposal
  Scenario: Accept an AI-proposed update
    Given the proposal panel is showing an AI-proposed update for a Fact
    When the Analyst clicks "Accept"
    Then the Fact text is updated to the proposed text
    And a new version is created (version number incremented)
    And the previous text is preserved in version history
    And the Fact status becomes "validated"
    And the proposal panel closes
    And downstream propagation is triggered if the update changes meaning

  @fsid:FS-EditAiUpdateProposal
  Scenario: Edit an AI-proposed update before accepting
    Given the proposal panel is showing an AI-proposed update for a Fact
    When the Analyst clicks "Edit"
    Then the proposed text becomes editable
    When the Analyst modifies the text and confirms
    Then the Fact text is updated to the modified text
    And a new version is created
    And the Fact status becomes "validated"
    And the proposal panel closes

  @fsid:FS-RejectAiUpdateProposal
  Scenario: Reject an AI-proposed update
    Given the proposal panel is showing an AI-proposed update for a Fact
    When the Analyst clicks "Reject"
    Then the proposal panel closes
    And the Fact text and status remain unchanged

  # ── Context sent to AI ──

  @fsid:FS-AiUpdateReceivesFullContext
  Scenario: AI receives full traceability context for the update proposal
    Given Insight N-1 has status "needs_review" because Fact F-1 was edited
    When the Analyst triggers "Propose update" on Insight N-1
    Then the request includes:
      - the current Insight text
      - the updated Fact F-1 text (the upstream change that caused staleness)
      - the Discovery goal
      - the original Fact text before the change (from version history)
    And the AI uses this context to propose a relevant update

  # ── Availability conditions ──

  @fsid:FS-ProposeUpdateDisabledWhenBackendUnavailable
  Scenario: Propose update action is disabled when backend is unavailable
    Given a Fact with status "needs_review"
    And the backend is unavailable
    Then the "Propose update" action is displayed but disabled
    And a tooltip indicates "Backend unavailable"

  @fsid:FS-ProposeUpdateNotShownForValidItems
  Scenario: Propose update action is not shown for valid items
    Given a Fact with status "validated"
    Then the "Propose update" action is not displayed

  @fsid:FS-ProposeUpdateShownForAllActionableStatuses
  Scenario: Propose update action is shown for all actionable statuses
    Then the "Propose update" action is available for entities with these statuses:
      | Status        |
      | needs_review  |
      | needs_refresh |
      | unsupported   |
      | weak          |
      | risky         |

  # ── Error handling ──

  @fsid:FS-AiUpdateErrorDisplay
  Scenario: Display error when AI update proposal fails
    Given the Analyst triggers "Propose update" on a stale Fact
    When the backend returns an error
    Then a toast notification displays the error message
    And the loading indicator is removed
    And the Fact status and text remain unchanged

  @fsid:FS-AiUpdateForOutputProposesMarkdown
  Scenario: AI update proposal for an Output returns Markdown
    Given an Output with status "needs_refresh"
    When the Analyst triggers "Propose update" on that Output
    Then the AI-proposed text is in Markdown format
    And the proposal panel renders the Markdown for preview
