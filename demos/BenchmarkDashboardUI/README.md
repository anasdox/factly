# M17: Benchmark Dashboard UI — Demo

## Date
2026-02-15

## Feature
M17: Benchmark Dashboard UI

## Demo Environment
```bash
bash demos/BenchmarkDashboardUI/demo.sh
```
Prerequisites: `npm install` done in `apps/backend/` and `apps/frontend/`. Node 20+ required (the script auto-detects nvm). The backend must be free on port 3002.

## Implemented Scope

### Backend REST API (`benchmark-routes.ts`)
- `GET /benchmark/results` — list all results (id, config summary, date, overall score)
- `GET /benchmark/results/:id` — full detail of one run
- `GET /benchmark/compare?ids=id1,id2,id3` — compare N runs with best-value highlighting
- `POST /benchmark/run` — launch a new benchmark (config in body), returns job ID
- `GET /benchmark/run/:jobId/status` — status of a running job (pending/running/completed/failed, suite progress, partial scores)
- `POST /benchmark/run/:jobId/cancel` — cancel a running benchmark job
- `GET /benchmark/configs` — list available config presets
- `POST /benchmark/configs` — save a custom config preset
- `GET /benchmark/suggestions` — improvement suggestions (low scores, sweet spots, regressions, neighborhood exploration)

### Frontend Dashboard (14 components)
- **BenchmarkDashboard** — Main page with sidebar + 3 tabs (Compare, History, Suggestions)
- **RunSelector** — List of runs with sort by date/score, filter by model, multi-select for comparison
- **ScoreRadarChart** — SVG radar chart of quality dimensions, superposed for multiple selected runs
- **MetricComparisonTable** — Detailed table with metrics grouped by suite, best value highlighted
- **BestConfigHighlight** — Per-dimension best config cards
- **DimensionDetail** — Drill-down: aggregated metrics, individual case results, LLM-judge reasoning
- **HistoryChart** — SVG line chart showing score evolution over time
- **ConfigBadge** — Compact config display (provider, model, temps, embedding, threshold)
- **NewBenchmarkPanel** — Form to configure and launch a new benchmark run
- **ConfigBuilder** — Sliders for temperatures, dropdowns for model/provider/embedding
- **MatrixBuilder** — Multi-select per parameter, combination count display
- **BenchmarkProgress** — Live progress bar with suite/case tracking and partial scores
- **SuggestionsPanel** — Improvement suggestions with one-click apply
- **Toolbar integration** — Benchmark icon in main toolbar opens `/benchmark` in new tab

### Routing
- `/benchmark` route in React app renders BenchmarkPage

## Not Implemented
- Real-time SSE streaming for benchmark progress (uses polling instead)
- PDF export of comparison results
- User authentication for benchmark launch
- Benchmark scheduling or cron-based automation

## Limitations
- Benchmark execution from UI requires LLM API keys configured on the backend
- Job tracking is in-memory; restarting the backend loses running job state
- Progress parsing from CLI output is best-effort (depends on stdout format)
- Suggestions engine uses simple heuristics (not ML-based)
- Frontend uses custom SVG charts (no external charting library)

## Validation Status
- [x] TypeScript compiles cleanly (backend + frontend, zero errors)
- [x] All REST API endpoints return correct responses
- [x] Mock results correctly listed, compared, and analyzed for suggestions
- [x] Config presets served via API
- [x] Job launch and status tracking functional
- [ ] Full UI walkthrough with live data (requires API keys)

## User Validation
- [ ] Demo presented to UoR
- [ ] UoR approved merge
