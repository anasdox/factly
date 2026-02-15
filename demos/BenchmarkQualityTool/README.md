# M16: AI Quality Benchmark Tool — Demo

## Date
2026-02-15

## Feature
M16: AI Quality Benchmark Tool

## Demo Environment
```bash
bash demos/BenchmarkQualityTool/demo.sh
```
Prerequisites: `npm install` done in `tools/benchmark/` and `apps/backend/`. Node 20+ required (the script auto-detects nvm).

## Implemented Scope
- CLI tool in `tools/benchmark/` with `run`, `compare`, `history`, `list` commands
- 7 quality dimensions: fact extraction, insight extraction, recommendations, outputs, dedup, impact check, update proposals
- Automated metrics: precision/recall/F1 (trigram matching), traceability accuracy (Jaccard), source anchoring, dedup TPR/FPR/F1, impact TPR/TNR/F1, value propagation, Markdown structural analysis
- LLM-as-judge evaluators: atomicity, non-fact rate, non-triviality, logical validity, actionability, relevance, completeness, explanation quality, semantic correctness, style preservation
- Gold datasets across 3 domains (climate, market, technical) with 28 dedup pairs, 12 impact scenarios, 10 update scenarios
- Configuration presets: default (all 7 suites), quick (fact-extraction only), full-matrix (multi-model/temp)
- Configuration matrix support for systematic multi-model/multi-temperature exploration
- Cost tracking (tokens + estimated USD)
- Results stored as timestamped JSON for historical comparison
- Terminal reporter with visual score bars and Markdown report generation
- Side-by-side comparison of 2+ results
- History tracking with regression detection
- Configurable temperatures via env vars (`LLM_TEMP_EXTRACTION`, `LLM_TEMP_DEDUP`, `LLM_TEMP_IMPACT`, `LLM_TEMP_PROPOSAL`)

## Not Implemented
- Embedding-based matching for precision/recall (currently trigram-based)
- Automatic backend restart per matrix config point
- CI integration (benchmark tool must be run manually)
- Audio or video input benchmarking

## Limitations
- Running the full benchmark requires a valid LLM API key (OPENAI_API_KEY or ANTHROPIC_API_KEY)
- Full matrix benchmarks can be expensive (many LLM calls)
- Gold datasets are manually curated and may not cover all edge cases
- LLM-judge evaluations require a separate API key for the evaluator model
- The demo script validates structure, compilation, and mock results — real LLM-powered runs require keys

## Validation Status
- [x] TypeScript compiles cleanly (zero errors)
- [x] CLI structure verified (configs, datasets, 11 gold files)
- [x] Mock result creation, listing, comparison, and history verified
- [x] Regression detection logic verified
- [ ] Full end-to-end run with live LLM (requires API keys)

## User Validation
- [ ] Demo presented to UoR
- [ ] UoR approved merge
