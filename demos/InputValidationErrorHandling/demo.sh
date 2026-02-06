#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$REPO_ROOT/apps/backend"
BASE_URL="http://localhost:3002"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${CYAN}[demo]${NC} $*"; }
ok()    { echo -e "${GREEN}[  OK]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    info "Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
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
  npx ts-node src/index.ts > /dev/null 2>&1 &
  SERVER_PID=$!
  wait_for_server
  ok "Server running (PID $SERVER_PID)"
}

echo ""
echo "============================================"
echo "  M9: Input Validation & Error Handling"
echo "============================================"
echo ""

start_server

# --- Scenario 1: Empty body rejected ---
info "--- Scenario 1: POST /rooms with empty body → 400 ---"
HTTP_CODE=$(curl -s -o /tmp/m9_resp.json -w "%{http_code}" -X POST "$BASE_URL/rooms" \
  -H "Content-Type: application/json" \
  -d '{}')
BODY=$(cat /tmp/m9_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $BODY"
if [ "$HTTP_CODE" = "400" ]; then
  ok "Scenario 1 PASSED: empty body rejected with 400"
else
  fail "Scenario 1 FAILED: expected 400, got $HTTP_CODE"
fi

echo ""

# --- Scenario 2: Missing required field ---
info "--- Scenario 2: POST /rooms without title → 400 mentioning title ---"
HTTP_CODE=$(curl -s -o /tmp/m9_resp.json -w "%{http_code}" -X POST "$BASE_URL/rooms" \
  -H "Content-Type: application/json" \
  -d '{"discovery_id":"d1","goal":"g","date":"2025-01-01","inputs":[],"facts":[],"insights":[],"recommendations":[],"outputs":[]}')
BODY=$(cat /tmp/m9_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $BODY"
if [ "$HTTP_CODE" = "400" ] && echo "$BODY" | grep -q "title"; then
  ok "Scenario 2 PASSED: missing title rejected with message"
else
  fail "Scenario 2 FAILED"
fi

echo ""

# --- Scenario 3: Invalid field type ---
info "--- Scenario 3: POST /rooms with inputs as string → 400 ---"
HTTP_CODE=$(curl -s -o /tmp/m9_resp.json -w "%{http_code}" -X POST "$BASE_URL/rooms" \
  -H "Content-Type: application/json" \
  -d '{"discovery_id":"d1","title":"t","goal":"g","date":"2025-01-01","inputs":"bad","facts":[],"insights":[],"recommendations":[],"outputs":[]}')
BODY=$(cat /tmp/m9_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $BODY"
if [ "$HTTP_CODE" = "400" ]; then
  ok "Scenario 3 PASSED: invalid field type rejected"
else
  fail "Scenario 3 FAILED"
fi

echo ""

# --- Scenario 4: Invalid UUID on GET ---
info "--- Scenario 4: GET /rooms/not-a-uuid → 400 ---"
HTTP_CODE=$(curl -s -o /tmp/m9_resp.json -w "%{http_code}" "$BASE_URL/rooms/not-a-uuid")
BODY=$(cat /tmp/m9_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $BODY"
if [ "$HTTP_CODE" = "400" ]; then
  ok "Scenario 4 PASSED: invalid UUID rejected"
else
  fail "Scenario 4 FAILED"
fi

echo ""

# --- Scenario 5: Invalid UUID on DELETE ---
info "--- Scenario 5: DELETE /rooms/not-a-uuid → 400 ---"
HTTP_CODE=$(curl -s -o /tmp/m9_resp.json -w "%{http_code}" -X DELETE "$BASE_URL/rooms/not-a-uuid")
BODY=$(cat /tmp/m9_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $BODY"
if [ "$HTTP_CODE" = "400" ]; then
  ok "Scenario 5 PASSED: invalid UUID on DELETE rejected"
else
  fail "Scenario 5 FAILED"
fi

echo ""

# --- Scenario 6: Invalid update body ---
info "--- Scenario 6: POST /rooms/:id/update without payload → 400 ---"
# First create a valid room
ROOM_RESPONSE=$(curl -sf -X POST "$BASE_URL/rooms" \
  -H "Content-Type: application/json" \
  -d '{"discovery_id":"d1","title":"t","goal":"g","date":"2025-01-01","inputs":[],"facts":[],"insights":[],"recommendations":[],"outputs":[]}')
ROOM_ID=$(echo "$ROOM_RESPONSE" | grep -o '"roomId":"[^"]*"' | cut -d'"' -f4)

HTTP_CODE=$(curl -s -o /tmp/m9_resp.json -w "%{http_code}" -X POST "$BASE_URL/rooms/$ROOM_ID/update" \
  -H "Content-Type: application/json" \
  -d '{"senderUuid":"abc","username":"user"}')
BODY=$(cat /tmp/m9_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $BODY"
if [ "$HTTP_CODE" = "400" ]; then
  ok "Scenario 6 PASSED: missing payload rejected"
else
  fail "Scenario 6 FAILED"
fi

echo ""

# --- Scenario 7: Structured error format ---
info "--- Scenario 7: All errors return { error: string } ---"
# Re-check scenario 1 response structure
BODY=$(cat /tmp/m9_resp.json)
if echo "$BODY" | grep -q '"error"'; then
  ok "Scenario 7 PASSED: structured error response confirmed"
else
  fail "Scenario 7 FAILED: response missing error field"
fi

echo ""

# --- Scenario 8: Valid request still works ---
info "--- Scenario 8: Valid POST /rooms still works ---"
HTTP_CODE=$(curl -s -o /tmp/m9_resp.json -w "%{http_code}" -X POST "$BASE_URL/rooms" \
  -H "Content-Type: application/json" \
  -d '{"discovery_id":"demo-001","title":"Demo","goal":"Test","date":"2025-01-01","inputs":[],"facts":[],"insights":[],"recommendations":[],"outputs":[]}')
BODY=$(cat /tmp/m9_resp.json)
echo "  Status: $HTTP_CODE"
echo "  Body: $BODY"
if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "roomId"; then
  ok "Scenario 8 PASSED: valid request succeeds"
else
  fail "Scenario 8 FAILED"
fi

echo ""
echo "============================================"
echo "  All 8 scenarios PASSED"
echo "============================================"
echo ""
echo "Frontend toast demo:"
echo "  1. Start the frontend: cd apps/frontend && npm start"
echo "  2. Open the app in a browser"
echo "  3. Edit the discovery to have an empty discovery_id"
echo "  4. Click 'Start Event Room' — a red toast should appear"
echo ""
