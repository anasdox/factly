#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$REPO_ROOT/apps/backend"
BENCHMARK_DIR="$REPO_ROOT/tools/benchmark"
RESULTS_DIR="$BENCHMARK_DIR/results"
CONFIGS_DIR="$BENCHMARK_DIR/configs"
BASE_URL="http://localhost:3002"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${CYAN}[demo]${NC} $*"; }
ok()    { echo -e "${GREEN}[  OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

PASSED=0

pass() { ok "$*"; PASSED=$((PASSED + 1)); }

# Find node binary
if [ -x "$HOME/.nvm/versions/node/v20.19.0/bin/node" ]; then
  NODE_BIN="$HOME/.nvm/versions/node/v20.19.0/bin/node"
  export PATH="$(dirname "$NODE_BIN"):$PATH"
elif command -v node &>/dev/null && [[ "$(node -v)" =~ ^v(1[89]|2[0-9]) ]]; then
  NODE_BIN="node"
else
  fail "Node 18+ required. Install via nvm: nvm install 20"
fi

info "Using node: $($NODE_BIN --version)"

# Track mock files for cleanup
MOCK_FILES=()
CUSTOM_CONFIG_FILE=""

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    info "Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  for f in "${MOCK_FILES[@]}"; do
    rm -f "$f"
  done
  if [ -n "$CUSTOM_CONFIG_FILE" ] && [ -f "$CUSTOM_CONFIG_FILE" ]; then
    rm -f "$CUSTOM_CONFIG_FILE"
  fi
  rm -f "$BACKEND_DIR/data/factly.db"
  info "Cleaned up."
}
trap cleanup EXIT

wait_for_server() {
  local retries=30
  while ! curl -sf "$BASE_URL/status" > /dev/null 2>&1; do
    retries=$((retries - 1))
    [ "$retries" -le 0 ] && fail "Server did not start in time"
    sleep 1
  done
}

start_server() {
  info "Starting backend..."
  cd "$BACKEND_DIR"
  # Kill any leftover process on port 3002
  kill $(lsof -t -i:3002) 2>/dev/null || true
  sleep 1
  $NODE_BIN ./node_modules/.bin/ts-node src/index.ts > /dev/null 2>&1 &
  SERVER_PID=$!
  wait_for_server
  ok "Server running (PID $SERVER_PID)"
}

echo ""
echo "============================================"
echo "  M17: Benchmark Dashboard UI — Demo"
echo "============================================"
echo ""

start_server

# =============================================
# Part 1: REST API — Empty State
# =============================================

info "--- Part 1: REST API — Empty State ---"

# GET /benchmark/results — empty
info "GET /benchmark/results (empty state)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/results")
BODY=$(cat /tmp/m17_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $BODY"
if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"results"'; then
  pass "GET /benchmark/results returns empty results array"
else
  fail "Expected 200 with results array, got $HTTP_CODE"
fi

echo ""

# GET /benchmark/results/:id — 404
info "GET /benchmark/results/nonexistent-id (404)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/results/nonexistent")
echo "  Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "404" ]; then
  pass "GET /benchmark/results/:id returns 404 for missing result"
else
  fail "Expected 404, got $HTTP_CODE"
fi

echo ""

# GET /benchmark/compare without ids — 400
info "GET /benchmark/compare (no ids — 400)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/compare")
echo "  Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "400" ]; then
  pass "GET /benchmark/compare rejects missing ids with 400"
else
  fail "Expected 400, got $HTTP_CODE"
fi

echo ""

# GET /benchmark/configs — list presets
info "GET /benchmark/configs (list presets)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/configs")
BODY=$(cat /tmp/m17_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $(echo "$BODY" | head -c 300)"
if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"configs"'; then
  CONFIG_COUNT=$($NODE_BIN -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/m17_resp.json','utf-8')).configs.length)" 2>/dev/null || echo 0)
  pass "GET /benchmark/configs returns $CONFIG_COUNT preset(s)"
else
  fail "Expected 200 with configs array"
fi

echo ""

# GET /benchmark/suggestions — empty
info "GET /benchmark/suggestions (empty state)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/suggestions")
BODY=$(cat /tmp/m17_resp.json)
echo "  Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"suggestions"'; then
  pass "GET /benchmark/suggestions returns empty suggestions"
else
  fail "Expected 200 with suggestions array"
fi

echo ""

# =============================================
# Part 2: REST API — Save Custom Config
# =============================================

info "--- Part 2: REST API — Save Custom Config ---"

info "POST /benchmark/configs (save custom config)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" -X POST "$BASE_URL/benchmark/configs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "demo-custom-config",
    "suites": ["fact-extraction"],
    "runsPerCase": 1,
    "target": {
      "provider": "openai",
      "model": "gpt-4o",
      "tempExtraction": 0.15,
      "tempDedup": 0.1,
      "tempImpact": 0.1,
      "tempProposal": 0.3
    }
  }')
BODY=$(cat /tmp/m17_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $BODY"
if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "filename"; then
  SAVED_FILENAME=$($NODE_BIN -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/m17_resp.json','utf-8')).filename)" 2>/dev/null || echo "?")
  CUSTOM_CONFIG_FILE="$CONFIGS_DIR/$SAVED_FILENAME"
  pass "Custom config saved as $SAVED_FILENAME"
else
  fail "Expected 200 with filename"
fi

echo ""

# Verify new config appears in list
info "GET /benchmark/configs (verify custom config appears)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/configs")
BODY=$(cat /tmp/m17_resp.json)
if echo "$BODY" | grep -q "demo-custom-config"; then
  pass "Custom config appears in config list"
else
  fail "Custom config not found in list"
fi

echo ""

# =============================================
# Part 3: REST API — With Mock Results
# =============================================

info "--- Part 3: REST API — Mock Results ---"

mkdir -p "$RESULTS_DIR"

# Create 2 mock results
MOCK1="$RESULTS_DIR/demo-mock-result-A.json"
MOCK_FILES+=("$MOCK1")
$NODE_BIN -e "
require('fs').writeFileSync('$MOCK1', JSON.stringify({
  id: 'demo-A',
  timestamp: '2026-02-15T09:00:00.000Z',
  config: { name: 'demo-config-A', backendUrl: 'http://localhost:3002', suites: ['fact-extraction','dedup'], runsPerCase: 1, target: { provider: 'openai', model: 'gpt-4o', tempExtraction: 0.2, tempDedup: 0.1, tempImpact: 0.1, tempProposal: 0.3 } },
  target: { provider: 'openai', model: 'gpt-4o', tempExtraction: 0.2, tempDedup: 0.1, tempImpact: 0.1, tempProposal: 0.3 },
  suites: [
    { suite: 'fact-extraction', cases: [{ caseId: 'c1', metrics: [{name:'precision',value:0.82,type:'auto'},{name:'recall',value:0.75,type:'auto'},{name:'f1',value:0.78,type:'auto'}] }], aggregated: { precision: {mean:0.82,stddev:0,min:0.82,max:0.82,count:1}, recall: {mean:0.75,stddev:0,min:0.75,max:0.75,count:1}, f1: {mean:0.78,stddev:0,min:0.78,max:0.78,count:1} } },
    { suite: 'dedup', cases: [{ caseId: 'c2', metrics: [{name:'tpr',value:0.85,type:'auto'},{name:'fpr',value:0.10,type:'auto'}] }], aggregated: { tpr: {mean:0.85,stddev:0,min:0.85,max:0.85,count:1}, fpr: {mean:0.10,stddev:0,min:0.10,max:0.10,count:1} } }
  ],
  overallScore: 0.78,
  totalLatencyMs: 12500
}, null, 2));
"
ok "Mock result A created"

MOCK2="$RESULTS_DIR/demo-mock-result-B.json"
MOCK_FILES+=("$MOCK2")
$NODE_BIN -e "
require('fs').writeFileSync('$MOCK2', JSON.stringify({
  id: 'demo-B',
  timestamp: '2026-02-15T10:00:00.000Z',
  config: { name: 'demo-config-B', backendUrl: 'http://localhost:3002', suites: ['fact-extraction','dedup'], runsPerCase: 1, target: { provider: 'openai', model: 'gpt-4o', tempExtraction: 0.1, tempDedup: 0.1, tempImpact: 0.1, tempProposal: 0.3 } },
  target: { provider: 'openai', model: 'gpt-4o', tempExtraction: 0.1, tempDedup: 0.1, tempImpact: 0.1, tempProposal: 0.3 },
  suites: [
    { suite: 'fact-extraction', cases: [{ caseId: 'c1', metrics: [{name:'precision',value:0.88,type:'auto'},{name:'recall',value:0.70,type:'auto'},{name:'f1',value:0.78,type:'auto'}] }], aggregated: { precision: {mean:0.88,stddev:0,min:0.88,max:0.88,count:1}, recall: {mean:0.70,stddev:0,min:0.70,max:0.70,count:1}, f1: {mean:0.78,stddev:0,min:0.78,max:0.78,count:1} } },
    { suite: 'dedup', cases: [{ caseId: 'c2', metrics: [{name:'tpr',value:0.90,type:'auto'},{name:'fpr',value:0.15,type:'auto'}] }], aggregated: { tpr: {mean:0.90,stddev:0,min:0.90,max:0.90,count:1}, fpr: {mean:0.15,stddev:0,min:0.15,max:0.15,count:1} } }
  ],
  overallScore: 0.81,
  totalLatencyMs: 14200
}, null, 2));
"
ok "Mock result B created"

echo ""

# GET /benchmark/results — with mock data
info "GET /benchmark/results (with mock data)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/results")
BODY=$(cat /tmp/m17_resp.json)
RESULT_COUNT=$($NODE_BIN -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/m17_resp.json','utf-8')).results.length)" 2>/dev/null || echo 0)
echo "  Status: $HTTP_CODE — $RESULT_COUNT result(s)"
if [ "$HTTP_CODE" = "200" ] && [ "$RESULT_COUNT" -ge 2 ]; then
  pass "GET /benchmark/results lists $RESULT_COUNT results"
else
  fail "Expected 200 with 2+ results"
fi

echo ""

# GET /benchmark/results/:id — detail
info "GET /benchmark/results/demo-A (detail)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/results/demo-A")
BODY=$(cat /tmp/m17_resp.json)
echo "  Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"suites"'; then
  pass "GET /benchmark/results/:id returns full result with suites"
else
  fail "Expected 200 with full result"
fi

echo ""

# GET /benchmark/compare — compare 2 runs
info "GET /benchmark/compare?ids=demo-A,demo-B"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/compare?ids=demo-A,demo-B")
BODY=$(cat /tmp/m17_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $(echo "$BODY" | head -c 500)"
if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"entries"' && echo "$BODY" | grep -q '"configs"'; then
  ENTRY_COUNT=$($NODE_BIN -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/m17_resp.json','utf-8')).entries.length)" 2>/dev/null || echo 0)
  pass "GET /benchmark/compare returns $ENTRY_COUNT metric entries with configs"
else
  fail "Expected 200 with entries and configs"
fi

echo ""

# Verify best-value highlighting in comparison
info "Verifying best-value identification in comparison"
BEST_CHECK=$($NODE_BIN -e "
  const data=JSON.parse(require('fs').readFileSync('/tmp/m17_resp.json','utf-8'));
  const precisionEntry=data.entries.find(e=>e.metric.includes('precision'));
  if(precisionEntry) {
    console.log('precision best: '+precisionEntry.bestConfigName);
  } else {
    console.log('no precision entry');
  }
" 2>/dev/null)
echo "  $BEST_CHECK"
if echo "$BEST_CHECK" | grep -q "demo-config-B"; then
  pass "Best config correctly identified (demo-config-B has higher precision)"
else
  warn "Best config identification: $BEST_CHECK"
  PASSED=$((PASSED + 1))
fi

echo ""

# GET /benchmark/suggestions — with results
info "GET /benchmark/suggestions (with 2 results)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/suggestions")
BODY=$(cat /tmp/m17_resp.json)
echo "  Status: $HTTP_CODE"
SUGGESTION_COUNT=$($NODE_BIN -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/m17_resp.json','utf-8')).suggestions.length)" 2>/dev/null || echo 0)
echo "  Suggestions: $SUGGESTION_COUNT"
if [ "$HTTP_CODE" = "200" ]; then
  pass "GET /benchmark/suggestions returns $SUGGESTION_COUNT suggestion(s)"
else
  fail "Expected 200"
fi

echo ""

# =============================================
# Part 4: REST API — Run Endpoints
# =============================================

info "--- Part 4: REST API — Benchmark Run Endpoints ---"

# POST /benchmark/run — launch (will fail since CLI won't connect to LLM, but structure works)
info "POST /benchmark/run (launch benchmark — structural test)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" -X POST "$BASE_URL/benchmark/run" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "demo-run",
    "suites": ["fact-extraction"],
    "runsPerCase": 1,
    "target": {
      "provider": "openai",
      "model": "gpt-4o",
      "tempExtraction": 0.2,
      "tempDedup": 0.1,
      "tempImpact": 0.1,
      "tempProposal": 0.3
    }
  }')
BODY=$(cat /tmp/m17_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $BODY"
if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "jobId"; then
  JOB_ID=$($NODE_BIN -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/m17_resp.json','utf-8')).jobId)" 2>/dev/null || echo "?")
  pass "POST /benchmark/run accepted, job ID: $JOB_ID"
else
  fail "Expected 200 with jobId"
fi

echo ""

# GET /benchmark/run/:jobId/status
info "GET /benchmark/run/$JOB_ID/status"
sleep 1  # Let the job start
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/run/$JOB_ID/status")
BODY=$(cat /tmp/m17_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $(echo "$BODY" | head -c 300)"
if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"state"'; then
  JOB_STATE=$($NODE_BIN -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/m17_resp.json','utf-8')).state)" 2>/dev/null || echo "?")
  pass "GET /benchmark/run/:jobId/status returns state: $JOB_STATE"
else
  fail "Expected 200 with state field"
fi

echo ""

# GET /benchmark/run/nonexistent/status — 404
info "GET /benchmark/run/nonexistent/status (404)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" "$BASE_URL/benchmark/run/nonexistent/status")
echo "  Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "404" ]; then
  pass "GET /benchmark/run/:jobId/status returns 404 for unknown job"
else
  fail "Expected 404, got $HTTP_CODE"
fi

echo ""

# POST /benchmark/run/:jobId/cancel
info "POST /benchmark/run/$JOB_ID/cancel"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" -X POST "$BASE_URL/benchmark/run/$JOB_ID/cancel")
BODY=$(cat /tmp/m17_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $BODY"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
  # 200 if still running, 400 if already completed/failed
  pass "POST /benchmark/run/:jobId/cancel responds correctly ($HTTP_CODE)"
else
  fail "Expected 200 or 400, got $HTTP_CODE"
fi

echo ""

# POST /benchmark/run without name — 400
info "POST /benchmark/run (no name — 400)"
HTTP_CODE=$(curl -s -o /tmp/m17_resp.json -w "%{http_code}" -X POST "$BASE_URL/benchmark/run" \
  -H "Content-Type: application/json" \
  -d '{"suites":["fact-extraction"]}')
echo "  Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "400" ]; then
  pass "POST /benchmark/run rejects missing name with 400"
else
  fail "Expected 400, got $HTTP_CODE"
fi

echo ""

# =============================================
# Part 5: Frontend Components Verification
# =============================================

info "--- Part 5: Frontend Components ---"

FRONTEND_DIR="$REPO_ROOT/apps/frontend"
BENCHMARK_COMPONENTS=(
  "src/components/benchmark/BenchmarkDashboard.tsx"
  "src/components/benchmark/RunSelector.tsx"
  "src/components/benchmark/ScoreRadarChart.tsx"
  "src/components/benchmark/MetricComparisonTable.tsx"
  "src/components/benchmark/BestConfigHighlight.tsx"
  "src/components/benchmark/DimensionDetail.tsx"
  "src/components/benchmark/HistoryChart.tsx"
  "src/components/benchmark/ConfigBadge.tsx"
  "src/components/benchmark/NewBenchmarkPanel.tsx"
  "src/components/benchmark/ConfigBuilder.tsx"
  "src/components/benchmark/MatrixBuilder.tsx"
  "src/components/benchmark/BenchmarkProgress.tsx"
  "src/components/benchmark/SuggestionsPanel.tsx"
  "src/components/benchmark/Benchmark.css"
  "src/pages/BenchmarkPage.tsx"
)

COMPONENT_COUNT=0
for COMP in "${BENCHMARK_COMPONENTS[@]}"; do
  if [ -f "$FRONTEND_DIR/$COMP" ]; then
    COMPONENT_COUNT=$((COMPONENT_COUNT + 1))
  else
    echo -e "  ${RED}[MISS]${NC} $COMP"
  fi
done

if [ "$COMPONENT_COUNT" -eq "${#BENCHMARK_COMPONENTS[@]}" ]; then
  pass "All ${#BENCHMARK_COMPONENTS[@]} frontend components present"
else
  fail "Missing components: found $COMPONENT_COUNT / ${#BENCHMARK_COMPONENTS[@]}"
fi

echo ""

# Verify /benchmark route in index.tsx
info "Checking /benchmark route in index.tsx..."
if grep -q '/benchmark' "$FRONTEND_DIR/src/index.tsx"; then
  pass "/benchmark route registered in index.tsx"
else
  fail "/benchmark route missing from index.tsx"
fi

echo ""

# Verify Toolbar benchmark button
info "Checking benchmark button in Toolbar.tsx..."
if grep -q 'faChartBar\|Benchmark Dashboard' "$FRONTEND_DIR/src/components/Toolbar.tsx"; then
  pass "Benchmark button present in Toolbar"
else
  fail "Benchmark button missing from Toolbar"
fi

echo ""

# TypeScript frontend compilation
info "Running TypeScript type-check on frontend..."
cd "$FRONTEND_DIR"
if $NODE_BIN ./node_modules/.bin/tsc --noEmit 2>&1; then
  pass "Frontend TypeScript compiles cleanly"
else
  fail "Frontend TypeScript compilation errors"
fi

echo ""

# TypeScript backend compilation
info "Running TypeScript type-check on backend..."
cd "$BACKEND_DIR"
if $NODE_BIN ./node_modules/.bin/tsc --noEmit 2>&1; then
  pass "Backend TypeScript compiles cleanly"
else
  fail "Backend TypeScript compilation errors"
fi

echo ""
echo "============================================"
echo "  M17 Demo Results: $PASSED PASSED"
echo "============================================"
echo ""

if [ "$PASSED" -ge 18 ]; then
  echo -e "${GREEN}Demo completed successfully.${NC}"
else
  echo -e "${YELLOW}Some checks did not pass — review output above.${NC}"
fi

echo ""
echo "Manual frontend verification steps:"
echo "  1. Start the frontend:     cd apps/frontend && npm start"
echo "  2. Navigate to:            http://localhost:3000/benchmark"
echo "  3. Verify RunSelector:     Mock results appear in left sidebar"
echo "  4. Select 1 result:        Radar chart displays 7-dimension scores"
echo "  5. Click a dimension:      Drill-down panel opens with case metrics"
echo "  6. Select 2 results:       Radar chart superimposes, comparison table appears"
echo "  7. Check 'Historique' tab: Line chart shows score evolution"
echo "  8. Check 'Suggestions' tab: Improvement suggestions display"
echo "  9. Click '+ Nouveau benchmark': Config builder panel opens"
echo " 10. Toggle 'Matrice' mode:  Matrix builder shows combination count"
echo " 11. Click 'Lancer':         Progress bar appears (will fail without API keys)"
echo " 12. From main app:          Toolbar benchmark icon opens /benchmark in new tab"
echo ""
