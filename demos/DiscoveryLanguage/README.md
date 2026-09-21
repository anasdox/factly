# Demo — Discovery Language

## Implemented scope

A discovery is written in one language. The facts, insights, recommendations and
outputs Factly generates follow it, whatever language the sources are in.

- Seven languages: English (default), French, Spanish, German, Italian,
  Portuguese, Dutch.
- A **Language** selector sits under the goal in the discovery dialog.
- The four generating endpoints (`/extract/facts`, `/extract/insights`,
  `/extract/recommendations`, `/extract/outputs`) accept an optional
  `language`, validated against the list before the model is reached.
- The supporting excerpt on a fact is never translated: it is quoted verbatim
  in the source's own language, so it stays findable in the document it came
  from.
- An English discovery produces a prompt byte-identical to one with no language
  at all — the default path is untouched.

## How to see it

1. Open https://factly.betafactory.co, create a discovery, set **Language** to
   Français.
2. Add an input in English and extract facts.
3. The facts come back in French; each `source_excerpt` stays in English.

Observable without a browser:

```bash
# An unsupported language is refused before any model call
curl -s -X POST https://factly.betafactory.co/extract/facts \
  -H 'Content-Type: application/json' \
  -d '{"input_id":"i1","input_text":"x","goal":"g","language":"klingon"}'
# {"error":"Unsupported language. Supported languages: en, fr, es, de, it, pt, nl"}
```

## Not implemented

- Translating content that already exists when the language is changed. The
  field governs what is generated next; it does not rewrite history.
- Localising the interface. Labels and buttons stay English.
- Applying the language to chat replies, reformulation suggestions, research
  suggestions, duplicate detection or impact analysis. These produce text a
  user reads, so extending the language to them is a real decision — recorded
  as a non-goal rather than left ambiguous.
- Detecting a source's language automatically.
- A language per item rather than per discovery.

## Limitations

- Whether the model actually honours the instruction is the model's business.
  The acceptance tests pin that the directive is issued correctly; they cannot
  pin the quality of a third party's translation.
- Discoveries created before this feature have no `language` and are read as
  English, which is what they were already generating in.
- The frontend list in `config.ts` and the backend list in `prompts.ts` are
  separate constants and must be extended together.
