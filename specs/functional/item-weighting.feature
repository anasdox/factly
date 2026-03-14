Feature: Item Weighting
  As an Analyst
  I want each Fact, Insight, and Recommendation to carry a weight from 0 to 10
  So that I can express relative importance and the AI can suggest initial weights during extraction

  Context:
  - Weight is a numeric value from 0 (lowest) to 10 (highest)
  - The LLM proposes an initial weight during extraction; the Analyst may adjust it
  - Weight is displayed as a badge on the item, with a colored left border whose opacity reflects the weight
  - Weight changes (without text change) trigger downstream propagation identical to a text edit
  - Inputs and Outputs do not carry a weight

  Non-goals:
  - Automatic sorting or filtering by weight
  - Weight-based prioritization of AI proposals
  - Weight inheritance (children do not inherit parent weight)
  - Weight history or versioning (only current value is stored)

  # ── Display ──

  @fsid:FS-WeightBadgeDisplay
  Scenario: Weight badge is displayed on weighted items
    Given a Fact with weight 7
    Then a weight badge showing "7" is displayed on the Fact item
    And the badge uses the weight color (indigo) distinct from status chip colors

  @fsid:FS-WeightBadgeHiddenWhenNull
  Scenario: Weight badge is not displayed when weight is not set
    Given a Fact with no weight assigned
    Then no weight badge is displayed on the Fact item

  @fsid:FS-WeightBorderOpacity
  Scenario: Left border opacity reflects the weight value
    Given a Fact with weight 8
    Then the item has a colored left border
    And the border opacity is proportional to the weight (8/10 = 0.8)

  @fsid:FS-WeightBorderHiddenAtZero
  Scenario: No weight border when weight is 0
    Given a Fact with weight 0
    Then no colored left border is displayed on the item

  # ── LLM extraction ──

  @fsid:FS-LlmProposesWeightDuringExtraction
  Scenario: LLM proposes a weight during extraction
    When the Analyst triggers fact extraction from an Input
    Then each extracted fact suggestion includes a weight between 0 and 10
    And the weight reflects the LLM's assessment of the fact's importance relative to the Discovery goal

  @fsid:FS-LlmProposesWeightForInsights
  Scenario: LLM proposes a weight during insight extraction
    When the Analyst triggers insight extraction from selected facts
    Then each extracted insight suggestion includes a weight between 0 and 10

  @fsid:FS-LlmProposesWeightForRecommendations
  Scenario: LLM proposes a weight during recommendation extraction
    When the Analyst triggers recommendation extraction from selected insights
    Then each extracted recommendation suggestion includes a weight between 0 and 10

  # ── Editing ──

  @fsid:FS-WeightEditableInModal
  Scenario: Analyst can edit weight via a range slider in the edit modal
    Given the Analyst opens the edit modal for a Fact
    Then a range slider labeled "Weight" is displayed with values 0 to 10
    And the slider is initialized to the current weight value
    When the Analyst moves the slider to 5 and saves
    Then the Fact weight is updated to 5

  # ── Propagation ──

  @fsid:FS-WeightChangePropagatesDownstream
  Scenario: Weight change without text change triggers downstream propagation
    Given a Fact F-1 linked to Insight N-1
    And Fact F-1 has weight 5
    When the Analyst changes the weight of Fact F-1 to 8 without modifying the text
    Then Insight N-1 status becomes "needs_review"
    And a toast notification displays "Weight changed. 1 downstream item(s) marked for review."

  @fsid:FS-WeightChangeDoesNotCreateVersion
  Scenario: Weight change alone does not create a new version
    Given a Fact at version 2 with weight 5
    When the Analyst changes the weight to 8 without modifying the text
    Then the Fact version remains 2
    And the weight is updated to 8

  # ── Scope ──

  @fsid:FS-InputsAndOutputsHaveNoWeight
  Scenario: Inputs and Outputs do not have a weight field
    Given an Input item and an Output item
    Then no weight badge is displayed on either item
    And the edit modal for Input and Output does not include a weight slider
