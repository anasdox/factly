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
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    info "Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  # Remove demo DB so it doesn't pollute dev
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

stop_server() {
  info "Stopping server (PID $SERVER_PID)..."
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  SERVER_PID=""
  sleep 1
}

echo ""
echo "============================================"
echo "  M8: Server-Side Persistence — Demo"
echo "============================================"
echo ""

# --- Scenario 1: Room data survives restart ---
info "--- Scenario 1: Room data survives restart ---"

start_server

info "Creating a room with seed data..."
ROOM_RESPONSE=$(curl -sf -X POST "$BASE_URL/rooms" \
  -H "Content-Type: application/json" \
  -d '{"discovery_id":"demo-001","title":"Demo Discovery","goal":"Prove persistence","date":"2025-01-01","inputs":[],"facts":[],"insights":[],"recommendations":[],"outputs":[]}')

ROOM_ID=$(echo "$ROOM_RESPONSE" | grep -o '"roomId":"[^"]*"' | cut -d'"' -f4)
[ -z "$ROOM_ID" ] && fail "Could not create room"
ok "Room created: $ROOM_ID"

info "Verifying room data before restart..."
BEFORE=$(curl -sf "$BASE_URL/rooms/$ROOM_ID")
echo "  $BEFORE"

stop_server
info "Server stopped. Restarting..."
start_server

info "Retrieving room after restart..."
AFTER=$(curl -sf "$BASE_URL/rooms/$ROOM_ID")
echo "  $AFTER"

if [ "$BEFORE" = "$AFTER" ]; then
  ok "Scenario 1 PASSED: data survived restart"
else
  fail "Scenario 1 FAILED: data mismatch"
fi

echo ""

# --- Scenario 2: Deleted room stays deleted ---
info "--- Scenario 2: Deleted room stays deleted after restart ---"

info "Deleting the room..."
curl -sf -X DELETE "$BASE_URL/rooms/$ROOM_ID" > /dev/null
ok "Room deleted"

stop_server
info "Server stopped. Restarting..."
start_server

info "Attempting to retrieve deleted room..."
DELETED=$(curl -sf "$BASE_URL/rooms/$ROOM_ID" || true)

if [ -z "$DELETED" ]; then
  ok "Scenario 2 PASSED: deleted room is still gone"
else
  fail "Scenario 2 FAILED: deleted room came back — $DELETED"
fi

echo ""

# --- Scenario 3: Rooms from different lifecycles coexist ---
info "--- Scenario 3: Rooms from different lifecycles coexist ---"

info "Creating room A in current lifecycle..."
ROOM_A=$(curl -sf -X POST "$BASE_URL/rooms" \
  -H "Content-Type: application/json" \
  -d '{"title":"Lifecycle 1"}' | grep -o '"roomId":"[^"]*"' | cut -d'"' -f4)
ok "Room A: $ROOM_A"

stop_server
info "Server stopped. Restarting..."
start_server

info "Creating room B in new lifecycle..."
ROOM_B=$(curl -sf -X POST "$BASE_URL/rooms" \
  -H "Content-Type: application/json" \
  -d '{"title":"Lifecycle 2"}' | grep -o '"roomId":"[^"]*"' | cut -d'"' -f4)
ok "Room B: $ROOM_B"

DATA_A=$(curl -sf "$BASE_URL/rooms/$ROOM_A")
DATA_B=$(curl -sf "$BASE_URL/rooms/$ROOM_B")
info "Room A: $DATA_A"
info "Room B: $DATA_B"

if [ -n "$DATA_A" ] && [ -n "$DATA_B" ]; then
  ok "Scenario 3 PASSED: both rooms coexist"
else
  fail "Scenario 3 FAILED: one or both rooms missing"
fi

echo ""
echo "============================================"
echo "  All 3 scenarios PASSED"
echo "============================================"
echo ""
