Feature: Semantic Deduplication
  As an Analyst
  I want the system to detect semantically similar entities when adding or accepting items
  So that I can avoid accumulating duplicates in the pipeline

  Context:
  - Deduplication checks compare new text against existing same-type entities in the Discovery
  - When the backend is available, the LLM performs semantic comparison (understanding meaning, not just wording)
  - When the backend is unavailable, a local trigram-based similarity check is used as fallback
  - Detected duplicates are presented to the Analyst who decides the resolution
  - The backend can scan a same-type item set for semantic duplicate groups

  Non-goals:
  - Cross-type deduplication (e.g., comparing Facts against Insights)
  - Cross-Discovery deduplication
  - Automatic merging without Analyst decision
  - Editing the existing item directly inside the duplicate merge dialog
  - Deduplication of Inputs (source materials are inherently unique references)
  - Frontend column-header "Detect Duplicates" UI (not currently implemented)
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
    Given a Discovery with existing Facts including "Revenue grew by 15% in Q3"
    And the Suggestions panel shows a proposed Fact "Revenue grew by 15% in Q3"
    When the Analyst clicks "Accept" on the proposed Fact
    Then the system checks the proposed text against all existing Facts
    And a duplicate is detected
    And a duplicate review panel opens before the Fact is added

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
      | Merge           | Discard the new item and keep the existing item            |
      | Keep as variant  | Add the new item and link it as a variant of the existing |
      | Force add       | Add the new item regardless of similarity                  |

  @fsid:FS-MergeIntoExisting
  Scenario: Analyst chooses to merge into existing item
    Given the merge dialog is showing a duplicate of Fact F-1
    When the Analyst selects "Merge"
    Then the new Fact is not added to the pipeline
    And the existing Fact F-1 remains unchanged
    And the merge dialog closes

  @fsid:FS-KeepAsVariant
  Scenario: Analyst keeps both items
    Given the merge dialog is showing a duplicate of Fact F-1
    When the Analyst selects "Keep as variant"
    Then the new Fact is added to the pipeline
    And the merge dialog closes

  @fsid:FS-ForceAdd
  Scenario: Analyst forces the add despite similarity
    Given the merge dialog is showing a duplicate of an existing item
    When the Analyst selects "Force add"
    Then the new item is added to the pipeline
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
  Scenario: System scans a same-type item set for duplicates
    Given a set of 5 Facts from a Discovery column
    And the backend is available
    When an on-demand duplicate scan is requested for that Fact set
    Then the system sends all Fact texts to the backend for semantic grouping
    And the backend returns groups of semantically similar Facts

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
