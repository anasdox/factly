Feature: Discovery Language
  As an analyst
  I want to choose the language a discovery is written in
  So that the facts, insights, recommendations and outputs Factly produces read
  in the language of the audience, whatever language the sources are in

  Background:
    Given a discovery carries a language
    And the language applies to what Factly writes, not to what it reads

  # --- Choosing the language ---

  @fsid:FS-DiscoveryDefaultsToEnglish
  Scenario: A discovery created without a language is English
    When an analyst creates a discovery without choosing a language
    Then the discovery's language is English
    And generation behaves exactly as it did before a language could be chosen

  @fsid:FS-DiscoveryLanguageIsRemembered
  Scenario: The chosen language is kept with the discovery
    Given an analyst creates a discovery whose language is French
    When the discovery is reopened
    Then its language is still French

  @fsid:FS-DiscoveryLanguageRejectedWhenUnknown
  Scenario: A language Factly does not support is refused
    When an analyst asks for generation in a language Factly does not offer
    Then the request is refused with a message naming the languages it offers
    And nothing is generated

  # --- What gets written in that language ---

  @fsid:FS-FactsExtractedInDiscoveryLanguage
  Scenario: Facts are extracted in the discovery's language
    Given a discovery whose language is French
    And a source written in English
    When facts are extracted from that source
    Then the extraction is asked to write its facts in French

  @fsid:FS-SourceExcerptStaysInSourceLanguage
  Scenario: The supporting excerpt is never translated
    Given a discovery whose language is French
    And a source written in English
    When facts are extracted from that source
    Then the extraction is told to quote the excerpt verbatim in the source's own language
    # An excerpt is evidence: translating it would make it unverifiable against
    # the source it was taken from.

  @fsid:FS-InsightsDerivedInDiscoveryLanguage
  Scenario: Insights are derived in the discovery's language
    Given a discovery whose language is French
    When insights are derived from its facts
    Then the derivation is asked to write its insights in French

  @fsid:FS-RecommendationsFormulatedInDiscoveryLanguage
  Scenario: Recommendations are formulated in the discovery's language
    Given a discovery whose language is French
    When recommendations are formulated from its insights
    Then the formulation is asked to write its recommendations in French

  @fsid:FS-OutputsFormulatedInDiscoveryLanguage
  Scenario: Outputs are written in the discovery's language
    Given a discovery whose language is French
    When an output is formulated from its recommendations
    Then the formulation is asked to write the document in French

  @fsid:FS-EnglishDiscoveryAddsNoLanguageInstruction
  Scenario: An English discovery generates as it always did
    Given a discovery whose language is English
    When facts are extracted from a source
    Then no language instruction is added to the generation
    # English is the prompts' own language, so the default path is left untouched
    # rather than carrying an instruction that could only dilute it.

  # --- Non-goals ---
  # - Translating content that already exists when the language is changed
  # - Localising the interface itself (labels and buttons remain English)
  # - Choosing a language per item rather than per discovery
  # - Applying the language to chat replies, reformulation suggestions, research
  #   suggestions, duplicate detection or impact analysis
  # - Detecting the language of a source automatically
