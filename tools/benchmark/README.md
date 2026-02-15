# Factly AI Quality Benchmark

Measures the quality of the Factly AI pipeline across 8 evaluation suites, using gold-standard datasets, automated metrics, and LLM-as-judge scoring.

## Prerequisites

- Node.js 20+
- Dependencies installed: `npm install` (from `tools/benchmark/`)
- Factly backend running on port 3002 (`make start-backend` from project root)
- LLM provider API key configured in the backend (OpenAI, Anthropic, or OVHcloud)

## Quick Start

```bash
# From project root
make install-benchmark

# Run a fast benchmark (fact-extraction only)
cd tools/benchmark
npx ts-node src/cli.ts run --config configs/quick.json

# Run default benchmark (all 7 standard suites)
npx ts-node src/cli.ts run --config configs/default.json
```

## Quality Dimensions

| Suite | What it measures | Automated metrics | LLM-judge metrics |
|---|---|---|---|
| `fact-extraction` | Extract atomic facts from text | precision, recall, f1, source_anchoring | fact_atomicity, non_fact_rate |
| `insight-extraction` | Derive insights from facts | precision, recall, f1, traceability_accuracy | insight_non_triviality, insight_validity |
| `recommendation-extraction` | Generate actionable recommendations | precision, recall, f1, traceability_accuracy | actionability, relevance |
| `output-formulation` | Format structured reports | precision, recall, f1, structural_score, has_headings, has_citations | output_completeness, output_traceability |
| `dedup` | Detect duplicate facts (check + scan) | dedup_tpr, dedup_fpr, dedup_precision, dedup_recall, dedup_f1, dedup_score_mae, dedup_scan_ari | dedup_explanation |
| `impact-check` | Identify cascading impacts of updates | impact_tpr, impact_tnr, impact_precision, impact_f1 | — |
| `update-proposal` | Propose corrected text after upstream changes | value_present_rate, value_absent_rate | semantic_correctness, style_preservation |
| `pipeline` | End-to-end full pipeline | pipeline_facts_precision/recall/f1, pipeline_insights_precision/recall/f1, pipeline_recs_precision/recall/f1 | — |

## Gold Datasets

11 curated JSON files across 3 domains:

```
datasets/
  fact-extraction/
    climate.json          # 5 cases, 8 gold facts each
    market.json
    technical.json
  insight-extraction/
    climate.json
  recommendation-extraction/
    climate.json
  output-formulation/
    climate.json
  dedup/
    known-duplicates.json   # 28 pairs (easy/medium/hard) with expected similarity ranges
    scan-groups.json
  impact/
    impact-scenarios.json   # 12 scenarios (substance/wording/mixed changes)
  update-proposal/
    update-scenarios.json
  pipeline/
    end-to-end-climate.json
```

Each dataset entry includes an `id`, input data, and gold-standard expected outputs. For example, a fact-extraction case contains `input_text`, `goal`, and `gold_facts` (each with `text` and `source_excerpt`).

## Configuration

### Presets

| File | Purpose | Suites | Runs per case |
|---|---|---|---|
| `configs/default.json` | Standard benchmark | 7 suites (all except pipeline) | 1 |
| `configs/quick.json` | CI / fast feedback | fact-extraction only | 1 |
| `configs/full-matrix.json` | Sweep across models and temperatures | 7 suites | 3 |

### Config Structure (`BenchmarkConfig`)

```jsonc
{
  "name": "my-benchmark",             // Required — identifies this run
  "description": "...",               // Optional
  "backendUrl": "http://localhost:3002",
  "suites": ["fact-extraction", "dedup"],  // Which suites to run
  "runsPerCase": 1,                   // Repeat each case N times
  "target": {                         // Model under test
    "provider": "openai",             // "openai" | "anthropic" | "ovhcloud"
    "model": "gpt-4o",
    "tempExtraction": 0.2,            // Temperature for extraction steps
    "tempDedup": 0.1,                 // Temperature for dedup steps
    "tempImpact": 0.1,                // Temperature for impact checks
    "tempProposal": 0.3,              // Temperature for update proposals
    "embeddingsModel": "text-embedding-3-small",  // Optional
    "dedupThreshold": 0.75            // Optional — cosine similarity threshold
  },
  "evaluator": {                      // Optional — LLM-as-judge config
    "provider": "openai",
    "model": "gpt-4o",
    "apiKey": "sk-...",               // Or set LLM_API_KEY env var
    "baseUrl": "https://api.openai.com/v1"
  },
  "matching": {                       // How to match extracted vs gold items
    "method": "string",               // "string" (trigram Jaccard) | "embedding"
    "threshold": 0.6                  // Minimum similarity to count as a match
  },
  "timeoutMs": 60000                  // Per-request timeout
}
```

### Environment Variables

| Variable | Purpose |
|---|---|
| `LLM_API_KEY` | Fallback API key for the LLM-as-judge evaluator |
| `PORT` | Backend port (default: 3002) |

## CLI Commands

### `run` — Execute a benchmark

```bash
npx ts-node src/cli.ts run --config <path> [--suite <name>]
```

- `--config <path>` (required) — Path to a JSON config file
- `--suite <name>` — Comma-separated list to override the config's suites

```bash
# Run only dedup and impact-check from the default config
npx ts-node src/cli.ts run --config configs/default.json --suite dedup,impact-check
```

### `list` — Show all saved results

```bash
npx ts-node src/cli.ts list
```

Outputs: timestamp, config name, overall score, and file path for each result.

### `compare` — Compare two or more results

```bash
npx ts-node src/cli.ts compare results/file1.json results/file2.json
```

Shows per-metric comparison and highlights the best config. When exactly 2 results are provided, also runs regression detection (alerts if any metric dropped significantly).

### `history` — View score trends over time

```bash
npx ts-node src/cli.ts history [--suite <name>]
```

Shows score evolution across all saved results. Use `--suite` to filter to a specific suite.

## LLM-as-Judge

When `evaluator` is configured, the benchmark uses a separate LLM to score qualitative dimensions (atomicity, actionability, style preservation, etc.).

- Scoring: 1-5 scale, normalized to 0.0-1.0
- Temperature: fixed at 0.0 for reproducibility
- Response format: `SCORE: <n>\nREASONING: <explanation>`
- Supported providers: OpenAI-compatible (default) and Anthropic
- The evaluator model is independent from the target model being benchmarked

If no evaluator is configured or no API key is available, LLM-judge metrics are skipped (automated metrics still run).

## Configuration Matrix

`configs/full-matrix.json` uses a `MatrixConfig` to sweep across parameter combinations:

```jsonc
{
  "matrix": {
    "model": ["gpt-4o", "gpt-4.1"],
    "tempExtraction": [0.0, 0.1, 0.2, 0.3],
    "tempDedup": [0.0, 0.1],
    "tempImpact": [0.0, 0.1],
    "tempProposal": [0.1, 0.3]
  },
  "baseTarget": { /* defaults for non-swept fields */ }
}
```

The loader expands the Cartesian product of all matrix fields — the example above produces 2 x 4 x 2 x 2 x 2 = 64 configurations. Each combination runs as a separate benchmark with a generated name (e.g. `full-matrix-openai-gpt-4o-t0.2`).

## Results

Results are saved as JSON in `tools/benchmark/results/`.

**File naming:** `<timestamp>_<provider>-<model>-t<tempExtraction>.json`

**Structure (`BenchmarkResult`):**

```jsonc
{
  "id": "m3abc12",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "config": { /* full BenchmarkConfig */ },
  "target": { /* TargetConfig */ },
  "suites": [
    {
      "suite": "fact-extraction",
      "cases": [
        {
          "caseId": "fe-climate-001",
          "metrics": [
            { "name": "precision", "value": 0.875, "type": "auto" },
            { "name": "fact_atomicity", "value": 0.8, "type": "llm-judge", "details": "..." }
          ]
        }
      ],
      "aggregated": {
        "precision": { "mean": 0.85, "stddev": 0.05, "min": 0.75, "max": 0.95, "count": 5 }
      }
    }
  ],
  "overallScore": 0.72,
  "totalLatencyMs": 45200,
  "cost": { "tokens": { "inputTokens": 12000, "outputTokens": 8000, "totalTokens": 20000 }, "estimatedUsd": 0.14 }
}
```

## Cost Tracking

The `CostTracker` estimates USD cost per model based on token counts:

| Model | Input ($/1K tokens) | Output ($/1K tokens) |
|---|---|---|
| gpt-4o | 0.0025 | 0.01 |
| gpt-4.1 | 0.002 | 0.008 |
| gpt-4o-mini | 0.00015 | 0.0006 |
| claude-sonnet-4-5-20250929 | 0.003 | 0.015 |
| claude-haiku-3-5 | 0.0008 | 0.004 |
| text-embedding-3-small | 0.00002 | 0 |
| text-embedding-3-large | 0.00013 | 0 |

Unknown models default to $0.003 input / $0.015 output per 1K tokens.

## Dashboard UI

The frontend provides a benchmark dashboard at the `/benchmark` route. The backend exposes a REST API under `/benchmark/`:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/benchmark/results` | List all benchmark results |
| GET | `/benchmark/results/:id` | Full detail of one run |
| GET | `/benchmark/compare?ids=id1,id2` | Compare N runs side-by-side |
| GET | `/benchmark/configs` | List available config presets |
| POST | `/benchmark/configs` | Save a custom config |
| GET | `/benchmark/suggestions` | Improvement suggestions based on recent results |
| POST | `/benchmark/run` | Launch a new benchmark run (async) |
| GET | `/benchmark/run/:jobId/status` | Check job progress |
| POST | `/benchmark/run/:jobId/cancel` | Cancel a running job |

## Makefile Integration

From the project root:

```bash
make install-benchmark     # npm install in tools/benchmark/
make typecheck-benchmark   # TypeScript type-check (tsc --noEmit)
make demo-m16              # Run the M16 benchmark quality tool demo
make demo-m17              # Run the M17 benchmark dashboard UI demo
```

## Troubleshooting

**Backend not running**
```
Error: connect ECONNREFUSED 127.0.0.1:3002
```
Start the backend with `make start-backend` from the project root. Check logs with `make logs-backend`.

**LLM-judge metrics are all 0**
Ensure `evaluator` is configured in your benchmark config and that `LLM_API_KEY` is set (or `evaluator.apiKey` is provided). Without a valid key, LLM-judge metrics are skipped.

**Port conflict**
If port 3002 is in use, stop the existing process (`make stop-backend`) or set a different port in the backend `.env` and update `backendUrl` in your benchmark config.

**Timeout errors**
Increase `timeoutMs` in the config. The default is 60000ms (60s). For complex pipeline cases or slow models, 120000ms may be needed.

**No results found**
Results are stored in `tools/benchmark/results/`. If the directory is empty, run a benchmark first. The `list` command reads from this directory.
