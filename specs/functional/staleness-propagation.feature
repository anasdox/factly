Feature: Staleness Propagation on Edit
  As an Analyst
  I want downstream entities to be flagged when I modify an upstream entity
  So that I know which items may be outdated and need re-evaluation

  Context:
  - The Discovery Pipeline follows the chain Input → Fact → Insight → Recommendation → Output
  - Each entity maintains a version number and a status
  - Any text edit automatically creates a new version (immutable history); the old text is preserved
  - Text edits trigger lazy status propagation to direct children only (depth-1, level-by-level)
  - Deeper levels are only flagged when the Analyst resolves the stale item at the current level (edit or accept proposal)
  - Non-text changes (relations, metadata) update the entity in place without versioning or propagation
  - A waiting toast informs the Analyst while versioning and impact analysis are in progress
  - Output edits are local terminal updates (no impact analysis request)

  Non-goals:
  - Automatic re-generation of downstream entities (see AI-Assisted Updates feature)
  - Propagation across Discovery sessions
  - Undo/revert to a previous version
  - Conflict resolution for concurrent edits in collaborative sessions
  - Versioning of the Discovery container itself (title, goal, date)

  # ── Versioning ──

  @fsid:FS-TextEditCreatesVersion
  Scenario: Text edit creates a new version
    Given a Fact at version 1 with text "Original fact text"
    When the Analyst edits the text to "Updated fact text"
    Then the Fact version becomes 2
    And the previous text "Original fact text" is preserved in the version history
    And the Fact status is set to "validated"

  @fsid:FS-NonTextEditNoVersion
  Scenario: Non-text edit does not create a new version
    Given a Fact at version 1 with related inputs [I-1]
    When the Analyst changes the related inputs to [I-1, I-2] without modifying the text
    Then the Fact version remains 1
    And no downstream entities have their status changed

  @fsid:FS-VersionBadgeDisplay
  Scenario: Version badge is displayed when version is greater than 1
    Given a Fact at version 3
    Then a version badge "v3" is displayed on the Fact item
    And the badge is positioned at the top-right of the item

  @fsid:FS-VersionBadgeHiddenForV1
  Scenario: Version badge is not displayed for version 1
    Given a Fact at version 1
    Then no version badge is displayed on the Fact item

  # ── Waiting feedback during edit ──

  @fsid:FS-WaitingToastDuringImpactAnalysis
  Scenario: Waiting toast is displayed while impact analysis is in progress
    Given the Analyst edits the text of an Input
    Then a waiting toast is immediately displayed with a message describing the process in progress
    And the message indicates the entity type being analyzed:
      | Entity edited  | Waiting message                                                          |
      | Input          | Creating new version and analyzing impact on related facts...            |
      | Fact           | Creating new version and analyzing impact on related insights...         |
      | Insight        | Creating new version and analyzing impact on related recommendations...  |
      | Recommendation | Creating new version and analyzing impact on related outputs...          |
    And the waiting toast is replaced by the result toast once the analysis completes

  # ── Status propagation: Input edited ──

  @fsid:FS-InputEditPropagatesDownstream
  Scenario: Edit of an Input marks only direct children (lazy, depth-1)
    Given a Discovery with:
      | Entity         | ID    | Depends on |
      | Input          | I-1   | —          |
      | Fact           | F-1   | I-1        |
      | Fact           | F-2   | I-1        |
      | Insight        | N-1   | F-1        |
      | Recommendation | R-1   | N-1        |
      | Output         | O-1   | R-1        |
    When the Analyst edits the text of Input I-1
    And the LLM determines that only Fact F-1 is semantically impacted by the change
    Then Fact F-1 status becomes "needs_review"
    And Fact F-2 status remains unchanged
    And Insight N-1 status remains unchanged
    And Recommendation R-1 status remains unchanged
    And Output O-1 status remains unchanged
    And a toast notification displays "Updated to v2. 1 downstream item(s) marked for review."

  # ── Smart propagation: LLM-filtered impact check ──

  @fsid:FS-SmartPropagationLLMFiltering
  Scenario: LLM determines which direct children are impacted by an upstream change
    Given a Discovery with:
      | Entity | ID  | Depends on |
      | Input  | I-1 | —          |
      | Fact   | F-1 | I-1        |
      | Fact   | F-2 | I-1        |
      | Fact   | F-3 | I-1        |
    When the Analyst edits the text of Input I-1
    And the LLM identifies F-1 and F-3 as semantically impacted
    Then Fact F-1 status becomes "needs_review"
    And Fact F-3 status becomes "needs_review"
    And Fact F-2 status remains unchanged

  @fsid:FS-SmartPropagationFallbackMarkAll
  Scenario: When backend is unavailable, fallback marks all direct children
    Given a Discovery with:
      | Entity | ID  | Depends on |
      | Input  | I-1 | —          |
      | Fact   | F-1 | I-1        |
      | Fact   | F-2 | I-1        |
    And the backend is unavailable
    When the Analyst edits the text of Input I-1
    Then Fact F-1 status becomes "needs_review"
    And Fact F-2 status becomes "needs_review"

  @fsid:FS-ArchiveCascadeRemainsTransitive
  Scenario: Archive mode cascades to all transitive downstream without LLM filtering
    Given a Discovery with:
      | Entity         | ID  | Depends on |
      | Input          | I-1 | —          |
      | Fact           | F-1 | I-1        |
      | Fact           | F-2 | I-1        |
      | Insight        | N-1 | F-1        |
      | Recommendation | R-1 | N-1        |
      | Output         | O-1 | R-1        |
    When the Analyst archives Input I-1
    Then Fact F-1 status becomes "unsupported"
    And Fact F-2 status becomes "unsupported"
    And Insight N-1 status becomes "weak"
    And Recommendation R-1 status becomes "risky"
    And Output O-1 status becomes "needs_refresh"

  @fsid:FS-LazyLevelByLevelResolution
  Scenario: Lazy level-by-level resolution propagates through the full chain
    Given a Discovery with:
      | Entity         | ID  | Depends on |
      | Input          | I-1 | —          |
      | Fact           | F-1 | I-1        |
      | Insight        | N-1 | F-1        |
      | Recommendation | R-1 | N-1        |
      | Output         | O-1 | R-1        |
    When the Analyst edits the text of Input I-1
    Then only Fact F-1 status becomes "needs_review"
    And Insight N-1, Recommendation R-1, and Output O-1 statuses remain unchanged
    When the Analyst then edits the text of Fact F-1 to resolve its stale status
    Then only Insight N-1 status becomes "needs_review"
    And Recommendation R-1 and Output O-1 statuses remain unchanged
    When the Analyst then edits the text of Insight N-1 to resolve its stale status
    Then only Recommendation R-1 status becomes "needs_review"
    And Output O-1 status remains unchanged
    When the Analyst then edits the text of Recommendation R-1 to resolve its stale status
    Then only Output O-1 status becomes "needs_refresh"

  @fsid:FS-ConfirmValidNoDownstreamPropagation
  Scenario: Confirm valid does not propagate to downstream entities
    Given a Discovery with:
      | Entity  | ID  | Depends on | Status       |
      | Fact    | F-1 | I-1        | needs_review |
      | Insight | N-1 | F-1        | draft        |
    When the Analyst clicks the "Confirm valid" action on Fact F-1
    Then Fact F-1 status becomes "validated"
    And Insight N-1 status remains "draft"

  @fsid:FS-PropagationOnlyAffectsRelated
  Scenario: Propagation only affects entities in the dependency chain
    Given a Discovery with:
      | Entity | ID  | Depends on |
      | Input  | I-1 | —          |
      | Input  | I-2 | —          |
      | Fact   | F-1 | I-1        |
      | Fact   | F-2 | I-2        |
    When the Analyst edits the text of Input I-1
    Then Fact F-1 status becomes "needs_review"
    And Fact F-2 status remains unchanged

  # ── Status propagation: Input archived ──

  @fsid:FS-InputArchiveCascade
  Scenario: Archiving an Input triggers unsupported cascade
    Given a Discovery with:
      | Entity         | ID  | Depends on |
      | Input          | I-1 | —          |
      | Fact           | F-1 | I-1        |
      | Insight        | N-1 | F-1        |
      | Recommendation | R-1 | N-1        |
      | Output         | O-1 | R-1        |
    When the Analyst deletes Input I-1
    Then Input I-1 status becomes "outdated" and is not removed from the pipeline
    And Fact F-1 status becomes "unsupported"
    And Insight N-1 status becomes "weak"
    And Recommendation R-1 status becomes "risky"
    And Output O-1 status becomes "needs_refresh"
    And a toast notification displays "Input archived. 4 downstream item(s) affected."

  # ── Status propagation: Fact edited ──

  @fsid:FS-FactEditPropagatesDownstream
  Scenario: Edit of a Fact marks only direct children (lazy, depth-1)
    Given a Fact F-1 linked to Insight N-1, which is linked to Recommendation R-1, which is linked to Output O-1
    When the Analyst edits the text of Fact F-1
    Then Insight N-1 status becomes "needs_review"
    And Recommendation R-1 status remains unchanged
    And Output O-1 status remains unchanged

  # ── Status propagation: Insight edited ──

  @fsid:FS-InsightEditPropagatesDownstream
  Scenario: Edit of an Insight marks only direct children (lazy, depth-1)
    Given an Insight N-1 linked to Recommendation R-1, which is linked to Output O-1
    When the Analyst edits the text of Insight N-1
    Then Recommendation R-1 status becomes "needs_review"
    And Output O-1 status remains unchanged

  # ── Status propagation: Recommendation edited ──

  @fsid:FS-RecommendationEditPropagatesDownstream
  Scenario: Edit of a Recommendation marks downstream Outputs
    Given a Recommendation R-1 linked to Output O-1
    When the Analyst edits the text of Recommendation R-1
    Then Output O-1 status becomes "needs_refresh"

  # ── Status propagation: Output edited ──

  @fsid:FS-OutputEditNoPropagate
  Scenario: Edit of an Output has no downstream propagation
    Given an Output O-1 with no downstream entities
    When the Analyst edits the text of Output O-1
    Then Output O-1 version is incremented
    And no other entity statuses are changed

  # ── Item toolbar interaction ──

  @fsid:FS-ToolbarClickDoesNotSelectItem
  Scenario: Clicking the item toolbar does not toggle item selection
    Given the Analyst is viewing a list of selectable items (Inputs, Facts, Insights, or Recommendations)
    When the Analyst clicks any button in the item toolbar (edit, traceability, confirm valid, propose update)
    Then the item selection state is not changed
    And only the toolbar action is triggered

  # ── Visual indicators ──

  @fsid:FS-StatusChipDisplay
  Scenario: Status chip is displayed for actionable statuses
    Given a Fact with status "needs_review"
    Then a status chip with text "needs review" is displayed on the Fact item
    And the chip uses an amber color

  @fsid:FS-StatusChipNotShownForDraft
  Scenario: Status chip is not displayed for draft or validated statuses
    Given a Fact with status "draft"
    Then no status chip is displayed on the Fact item

  @fsid:FS-StaleBorderIndicator
  Scenario: Stale border is displayed on items with actionable status
    Given an Insight with status "weak"
    Then a colored left border is displayed on the Insight item
    And the border color corresponds to the "weak" status

  @fsid:FS-StatusColorMapping
  Scenario: Each actionable status has a distinct color
    Then the following status-color mapping is used:
      | Status        | Color category |
      | needs_review  | amber          |
      | needs_refresh | orange         |
      | unsupported   | red            |
      | weak          | yellow         |
      | risky         | red            |

  # ── Clear status / Confirm valid ──

  @fsid:FS-ConfirmValidClearsStatus
  Scenario: Analyst confirms a stale item as still valid
    Given a Fact with status "needs_review"
    When the Analyst clicks the "Confirm valid" action on that Fact
    Then the Fact status becomes "validated"
    And the status chip is removed
    And the stale border is removed

  @fsid:FS-ConfirmValidNotShownForNonActionable
  Scenario: Confirm valid action is not shown for draft or validated items
    Given a Fact with status "validated"
    Then the "Confirm valid" action is not displayed on the Fact item

  # ── Toast notifications ──

  @fsid:FS-PropagationToastNotification
  Scenario: Toast notification after edit with propagation
    Given the Analyst edits the text of an Input
    And 3 downstream entities are affected
    Then a toast notification displays "Updated to v2. 3 downstream item(s) marked for review."
    And the toast disappears after a timeout

  @fsid:FS-ArchiveToastNotification
  Scenario: Toast notification after archiving an Input
    Given the Analyst archives an Input
    And 5 downstream entities are affected
    Then a toast notification displays "Input archived. 5 downstream item(s) affected."

  # ── Default status for new entities ──

  @fsid:FS-NewEntityDefaultStatus
  Scenario: Newly created entities have default status and version
    When the Analyst manually adds a new Fact
    Then the Fact has version 1
    And the Fact has status "draft"
    And no version badge is displayed
    And no status chip is displayed

  # ── Backward compatibility ──

  @fsid:FS-BackwardCompatibleLoad
  Scenario: Existing Discovery data without versioning fields loads correctly
    Given a Discovery JSON file that was exported before the versioning feature
    When the Analyst imports the JSON file
    Then all entities default to version 1 and status "draft"
    And the Discovery displays and functions normally
