# Discovery Language — Technical Specification

- **x-tsid:** TS-DiscoveryLanguage
- **x-fsid-links:**
  - FS-DiscoveryDefaultsToEnglish
  - FS-DiscoveryLanguageIsRemembered
  - FS-DiscoveryLanguageRejectedWhenUnknown
  - FS-FactsExtractedInDiscoveryLanguage
  - FS-SourceExcerptStaysInSourceLanguage
  - FS-InsightsDerivedInDiscoveryLanguage
  - FS-RecommendationsFormulatedInDiscoveryLanguage
  - FS-OutputsFormulatedInDiscoveryLanguage
  - FS-EnglishDiscoveryAddsNoLanguageInstruction

## Overview

A discovery gains one field, `language`, and the four generation endpoints gain
one optional parameter of the same name. The language is appended to the system
prompt as an instruction; nothing else in the pipeline changes.

## Supported languages

| Code | Language |
| --- | --- |
| `en` | English (default) |
| `fr` | French |
| `es` | Spanish |
| `de` | German |
| `it` | Italian |
| `pt` | Portuguese |
| `nl` | Dutch |

A closed list rather than free text: the value reaches a prompt, so it is input
that must be validated, and an enumerated set is the only version of that check
which cannot be argued with. Extending the list is one entry in
`SUPPORTED_LANGUAGES`.

An unknown code is refused with `400` and a message naming the accepted codes.
Absent or empty means `en`.

## Data model

`DiscoveryData` gains an optional field:

```ts
language?: string   // one of SUPPORTED_LANGUAGES; absent means 'en'
```

Optional, not required: discoveries created before this feature have no
`language`, and they must keep working untouched. Absence is read as `en`,
which is what they were already generating in.

## Prompt construction

`prompts.ts` exports one helper:

```ts
export function withLanguage(systemPrompt: string, language?: string): string
```

It returns the prompt unchanged for `en` or for an absent language, and
otherwise appends a language directive. Leaving English untouched is deliberate:
the prompts are written in English, and telling a model to write English in an
English prompt adds a sentence that can only compete with the instructions
already there.

The appended directive states two things:

1. Write every generated `text` value in the target language.
2. Leave `source_excerpt` verbatim in the language of the source.

The second half matters more than it looks. An excerpt is the evidence a fact
rests on; a translated excerpt cannot be found in the document it came from, so
traceability silently breaks while still looking complete.

## Endpoints

`language` is an optional body parameter on:

- `POST /extract/facts`
- `POST /extract/insights`
- `POST /extract/recommendations`
- `POST /extract/outputs`

Validation is shared: `validateLanguage(body)` rejects anything that is present
but not in the list. It is checked before the language model is reached, so a
bad value costs nothing.

## Provider interface

The four generating methods take the language as a trailing optional argument:

```ts
extractFacts(text: string, goal: string, language?: string): Promise<ExtractedFact[]>
extractInsights(facts: string[], goal: string, language?: string): Promise<ExtractedInsight[]>
extractRecommendations(insights: string[], goal: string, language?: string): Promise<ExtractedRecommendation[]>
formulateOutputs(recommendations: string[], goal: string, outputType: string, context?: OutputTraceabilityContext, language?: string): Promise<string[]>
```

Trailing and optional so that every existing call site stays valid, which keeps
the change to the three providers mechanical and reviewable.

The other provider methods — duplicate detection, impact analysis, update
proposals, reformulation, research, chat — are untouched. They are listed as
non-goals in the functional spec rather than left ambiguous: several of them
produce text a user reads, so a later decision to extend the language to them is
a real one, not an oversight.

## Frontend

`DiscoveryModal` gains a language selector next to the date. The four call sites
that invoke generation (`InputList`, `FactList`, `InsightList`,
`RecommendationList`, `Toolbar`) pass `discoveryData.language` in the request
body.

## Non-goals

- Translating content that already exists when the language changes. The field
  governs what is generated next; it does not rewrite history.
- Localising the interface. Labels and buttons stay English.
- Detecting a source's language.
