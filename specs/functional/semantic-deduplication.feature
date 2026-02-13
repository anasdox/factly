Feature: Semantic Deduplication
  As an Analyst
  I want the system to detect semantically similar entities when adding or accepting items
  So that I can avoid accumulating duplicates in the pipeline

  Context:
  - Deduplication checks compare new text against existing same-type entities in the Discovery
  - When the backend is available, the LLM performs semantic comparison (understanding meaning, not just wording)
  - When the backend is unavailable, a local trigram-based similarity check is used as fallback
  - Detected duplicates are presented to the Analyst who decides the resolution
  - On-demand duplicate detection scans all items in a column for semantic groups

  Non-goals:
  - Cross-type deduplication (e.g., comparing Facts against Insights)
  - Cross-Discovery deduplication
  - Automatic merging without Analyst decision
  - Deduplication of Inputs (source materials are inherently unique references)
  - Real-time duplicate checking while typing

  # ── Deduplication at add/accept time ──

  @fsid:FS-DedupCheckOnManualAdd
  Scenario: Duplicate check when Analyst manually adds an entity
    Given a Discovery with existing Facts including "Revenue grew by 15% in Q3"
    When the Analyst manually adds a new Fact with text "Q3 revenue increased by 15 percent"
    Then the system checks the new text against all existing Facts
    And a duplicate is detected with similarity above the threshold
    And the merge dialog opens showing the existing similar Fact

  @fsid:FS-DedupCheckOnSuggestionAccept
  Scenario: Duplicate check when Analyst accepts an AI suggestion
    Given a Discovery with existing Insights including "Customer satisfaction is declining"
    And the Suggestions panel shows a proposed Insight "Customer satisfaction levels are dropping"
    When the Analyst clicks "Accept" on the proposed Insight
    Then the system checks the proposed text against all existing Insights
    And a duplicate is detected
    And the merge dialog opens before the Insight is added

  @fsid:FS-NoDuplicateDetected
  Scenario: No duplicate found allows normal add
    Given a Discovery with existing Facts
    When the Analyst manually adds a new Fact with text that is not similar to any existing Fact
    Then no merge dialog is shown
    And the Fact is added to the pipeline normally

  # ── Merge dialog ──

  @fsid:FS-MergeDialogOptions
  Scenario: Merge dialog presents three resolution options
    Given the merge dialog is showing a detected duplicate
    Then the dialog displays:
      - the new text being added
      - the existing similar item text
      - the similarity score or explanation
    And the dialog offers three options:
      | Option          | Description                                                |
      | Merge           | Discard the new item; optionally update the existing item  |
      | Keep as variant  | Add the new item and link it as a variant of the existing |
      | Force add       | Add the new item regardless of similarity                  |

  @fsid:FS-MergeIntoExisting
  Scenario: Analyst chooses to merge into existing item
    Given the merge dialog is showing a duplicate of Fact F-1
    When the Analyst selects "Merge"
    Then the new Fact is not added to the pipeline
    And the existing Fact F-1 remains unchanged
    And the merge dialog closes

  @fsid:FS-MergeWithUpdate
  Scenario: Analyst merges and updates the existing item
    Given the merge dialog is showing a duplicate of Fact F-1
    When the Analyst selects "Merge" and edits the existing Fact text
    Then the existing Fact F-1 is updated with the new text
    And the update follows the versioning rules (substance edit creates new version)
    And the new Fact is not added to the pipeline
    And the merge dialog closes

  @fsid:FS-KeepAsVariant
  Scenario: Analyst keeps both items
    Given the merge dialog is showing a duplicate of Fact F-1
    When the Analyst selects "Keep as variant"
    Then the new Fact is added to the pipeline
    And the merge dialog closes

  @fsid:FS-ForceAdd
  Scenario: Analyst forces the add despite similarity
    Given the merge dialog is showing a duplicate of an Insight
    When the Analyst selects "Force add"
    Then the new Insight is added to the pipeline
    And the merge dialog closes

  # ── Backend LLM deduplication ──

  @fsid:FS-LlmSemanticComparison
  Scenario: Backend performs semantic deduplication using LLM
    Given the backend is available
    When a duplicate check is triggered for a new Fact
    Then the system sends the new text and all existing Fact texts to the backend
    And the backend uses the LLM to compare semantic meaning
    And the backend returns duplicates with similarity scores and explanations

  # ── Offline fallback ──

  @fsid:FS-TrigramFallbackWhenOffline
  Scenario: Trigram similarity is used when backend is unavailable
    Given the backend is unavailable
    When a duplicate check is triggered for a new Insight
    Then the system uses local trigram-based similarity comparison
    And duplicates above the similarity threshold are detected
    And the merge dialog opens if duplicates are found

  # ── On-demand column deduplication ──

  @fsid:FS-OnDemandDedupPerColumn
  Scenario: Analyst triggers duplicate detection for an entire column
    Given a Discovery with 5 Facts in the Facts column
    And the backend is available
    When the Analyst clicks the "Detect Duplicates" action on the Facts column header
    Then the system sends all Fact texts to the backend for semantic grouping
    And a loading indicator is displayed on the column header
    And the results show groups of semantically similar Facts

  @fsid:FS-OnDemandDedupResultsDisplay
  Scenario: Display on-demand deduplication results
    Given the deduplication scan returns 2 groups of similar Facts
    Then a results panel shows each group with:
      - the similar Fact texts side by side
      - a similarity explanation from the LLM
      - "Merge" and "Keep both" actions per group

  @fsid:FS-OnDemandDedupNoResults
  Scenario: No duplicates found in column scan
    Given the Analyst triggers "Detect Duplicates" on the Insights column
    When the backend returns no duplicate groups
    Then a toast notification displays "No duplicates detected in Insights."

  # ── Embedding-based deduplication ──

  @fsid:FS-EmbeddingBasedSemanticComparison
  Scenario: Backend uses embeddings for semantic deduplication when configured
    Given the backend is available
    And an embedding model is configured
    When a duplicate check is triggered for a new Fact
    Then the system generates embedding vectors for the new text and existing Fact texts
    And compares them using cosine similarity
    And returns duplicates above the similarity threshold with LLM-generated explanations

  @fsid:FS-EmbeddingFallbackToLlmChat
  Scenario: Backend falls back to LLM chat when embeddings are not available
    Given the backend is available
    And no embedding model is configured
    When a duplicate check is triggered
    Then the system uses LLM chat-based semantic comparison as before

  # ── Error handling ──

  @fsid:FS-DedupErrorFallsBackToLocal
  Scenario: Backend error falls back to local trigram check
    Given the backend is available
    When a duplicate check is sent to the backend and the backend returns an error
    Then the system falls back to local trigram similarity
    And the Analyst is not blocked from adding the item

  @fsid:FS-DedupDisabledForInputs
  Scenario: Deduplication is not performed for Inputs
    When the Analyst adds a new Input
    Then no deduplication check is triggered
    And the Input is added directly to the pipeline

  @fsid:FS-OnDemandDedupDisabledWhenBackendUnavailable
  Scenario: On-demand deduplication is disabled when backend is unavailable
    Given the backend is unavailable
    Then the "Detect Duplicates" action on column headers is disabled
    And a tooltip indicates "Backend unavailable"
