#!/usr/bin/env bash
#
# Ship Factly to the VPS and bring it up behind the shared edge.
#
#   deploy/deploy.sh push-env   copy apps/backend/.env to the server (once)
#   deploy/deploy.sh up         ship, build and start        (the usual one)
#   deploy/deploy.sh logs       tail both containers
#   deploy/deploy.sh status     what is running
#   deploy/deploy.sh down       stop the stack
#
# The machine itself — ports 80/443, the firewall, the certificates — belongs to
# the vps-infra repository. Nothing here touches it.

set -euo pipefail

VPS_HOST="${VPS_HOST:-ubuntu@92.222.171.209}"
REMOTE_DIR="${REMOTE_DIR:-factly}"
HOSTNAME_PUBLIC="factly.betafactory.co"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)

G=$'\033[32m'; R=$'\033[31m'; D=$'\033[90m'; B=$'\033[1m'; O=$'\033[0m'
ok()   { printf '  %sok  %s %s\n' "$G" "$O" "$1"; }
bad()  { printf '  %sFAIL%s %s\n' "$R" "$O" "$1"; }
step() { printf '\n%s%s%s\n' "$B" "$1" "$O"; }

remote() { ssh "${SSH_OPTS[@]}" "$VPS_HOST" "$1"; }

require_access() {
  if ! remote 'id -un' >/dev/null 2>&1; then
    bad "cannot reach $VPS_HOST with a key"
    printf '\n  Authorise it once — it will ask for the password:\n\n    ssh-copy-id %s\n\n' "$VPS_HOST"
    exit 1
  fi
}

# Everything a fresh clone would hold, streamed straight to the server.
#
# `git ls-files` still reports files that are tracked but already deleted from
# the working tree, and tar aborts the whole transfer on the first missing one —
# so the list is filtered against the disk before it is used. Ignored paths are
# excluded by the same command, which is what keeps node_modules, build output
# and every .env off the wire.
ship() {
  # The list stays in a pipe from end to end: a command substitution would
  # strip the NUL separators, and every path would fuse into one.
  ( cd "$ROOT" \
      && git ls-files -co --exclude-standard -z \
      | while IFS= read -r -d '' f; do [ -e "$f" ] && printf '%s\0' "$f"; done \
      | tar --null -T - -czf - \
  ) | remote "mkdir -p ~/$REMOTE_DIR && tar -C ~/$REMOTE_DIR -xzf -"
}

# The backend reads its secrets from deploy/.env on the server. This copies the
# local file up without printing it; the two OAuth URLs are set in the compose
# file, so whatever those lines say locally does not matter.
push_env() {
  require_access
  local src="$ROOT/apps/backend/.env"
  [ -f "$src" ] || { bad "no $src to copy"; exit 1; }
  remote "mkdir -p ~/$REMOTE_DIR/deploy && umask 077 && cat > ~/$REMOTE_DIR/deploy/.env" < "$src"
  ok "apps/backend/.env → ~/$REMOTE_DIR/deploy/.env ${D}(mode 600)${O}"
  printf '\n%sRun deploy/deploy.sh up to apply it.%s\n\n' "$D" "$O"
}

up() {
  printf '%sFactly — deploy%s  %s%s%s\n' "$B" "$O" "$D" "$VPS_HOST" "$O"
  require_access

  step 'ship'
  ship
  ok "working tree copied to ~/$REMOTE_DIR"

  step 'secrets'
  if [ "$(remote "test -f ~/$REMOTE_DIR/deploy/.env && echo yes" || true)" != "yes" ]; then
    bad "~/$REMOTE_DIR/deploy/.env is missing"
    printf '\n  The backend has no API keys without it. Copy yours up:\n\n    deploy/deploy.sh push-env\n\n'
    exit 1
  fi
  ok 'deploy/.env present on the server'

  step 'build and start'
  ssh "${SSH_OPTS[@]}" -t "$VPS_HOST" "cd ~/$REMOTE_DIR && $COMPOSE up -d --build"

  step 'verify'
  remote "cd ~/$REMOTE_DIR && $COMPOSE ps --format 'table {{.Service}}\t{{.Status}}'"
  printf '\n  %shttps://%s%s\n\n' "$G" "$HOSTNAME_PUBLIC" "$O"
}

case "${1:-up}" in
  push-env) push_env ;;
  up)       up ;;
  logs)     require_access; ssh "${SSH_OPTS[@]}" -t "$VPS_HOST" "cd ~/$REMOTE_DIR && $COMPOSE logs -f --tail 80" ;;
  status)   require_access; remote "cd ~/$REMOTE_DIR && $COMPOSE ps" ;;
  down)     require_access; remote "cd ~/$REMOTE_DIR && $COMPOSE down" ;;
  *)        printf 'usage: deploy/deploy.sh <push-env|up|logs|status|down>\n' >&2; exit 2 ;;
esac
