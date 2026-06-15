#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
VENV="$BACKEND_DIR/venv"
LOG_DIR="$SCRIPT_DIR/.logs"

mkdir -p "$LOG_DIR"

# --- colors ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
info() { echo -e "${CYAN}[→]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
die()  { err "$*"; exit 1; }

# --- process registry ---
declare -A PROC_PIDS   # name → pid
declare -A PROC_LOGS   # name → log file

register_proc() {
  local name=$1 pid=$2 logfile=$3
  PROC_PIDS["$name"]=$pid
  PROC_LOGS["$name"]=$logfile
}

# --- cleanup ---
CLEANED_UP=false

cleanup() {
  [[ "$CLEANED_UP" == true ]] && return
  CLEANED_UP=true

  echo
  info "Shutting down all services..."

  for name in "${!PROC_PIDS[@]}"; do
    local pid="${PROC_PIDS[$name]}"
    if kill -0 "$pid" 2>/dev/null; then
      info "Stopping $name (PID $pid)..."
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done

  # Give processes a moment to exit gracefully
  sleep 1

  # Force kill anything still running
  for name in "${!PROC_PIDS[@]}"; do
    local pid="${PROC_PIDS[$name]}"
    if kill -0 "$pid" 2>/dev/null; then
      warn "$name did not stop gracefully — force killing..."
      kill -KILL "$pid" 2>/dev/null || true
    fi
  done

  # Wait for all background jobs
  for name in "${!PROC_PIDS[@]}"; do
    wait "${PROC_PIDS[$name]}" 2>/dev/null || true
  done

  info "Stopping postgres..."
  docker compose -f "$SCRIPT_DIR/docker-compose.yml" stop postgres 2>/dev/null || true

  log "All services stopped. Logs are in $LOG_DIR/"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# --- helpers ---
wait_for_port() {
  local name=$1 host=$2 port=$3 retries=${4:-30}
  info "Waiting for $name on $host:$port..."
  for i in $(seq 1 "$retries"); do
    if bash -c ">/dev/tcp/$host/$port" 2>/dev/null; then
      log "$name is ready."
      return 0
    fi
    sleep 1
  done
  err "$name did not become available on $host:$port after ${retries}s."
  return 1
}

check_command() {
  command -v "$1" &>/dev/null || die "'$1' not found. $2"
}

# --- preflight checks ---
echo -e "\n${BOLD}Life Planner — Starting up${NC}\n"

check_command docker   "Install Docker: https://docs.docker.com/get-docker/"
check_command node     "Install Node.js: https://nodejs.org/"
check_command npm      "Install Node.js (includes npm): https://nodejs.org/"
check_command python3  "Install Python 3.12+"

if ! python3 -c "import venv" 2>/dev/null; then
  die "python3-venv is not installed. Run: sudo apt install python3.12-venv"
fi

# --- local IP for display ---
LOCAL_IP=$(ip addr show | awk '/inet / && !/127\.0\.0\.1/ {sub(/\/.*/, "", $2); print $2; exit}')

# ── Step 1: Python venv ──────────────────────────────────────────────────────
if [[ ! -d "$VENV" ]]; then
  info "Creating Python virtual environment..."
  python3 -m venv "$VENV" || die "Failed to create venv."
fi

if [[ ! -f "$VENV/bin/uvicorn" ]] || [[ "$BACKEND_DIR/requirements.txt" -nt "$VENV/.installed" ]]; then
  info "Installing Python dependencies..."
  "$VENV/bin/pip" install --upgrade pip -q
  "$VENV/bin/pip" install -r "$BACKEND_DIR/requirements.txt" -q \
    && touch "$VENV/.installed" \
    || die "pip install failed. Check $LOG_DIR/pip.log"
  log "Python dependencies ready."
fi

# ── Step 2: Frontend dependencies ───────────────────────────────────────────
if [[ ! -d "$FRONTEND_DIR/node_modules" ]] || [[ "$FRONTEND_DIR/package.json" -nt "$FRONTEND_DIR/node_modules/.package-lock.json" ]]; then
  info "Installing frontend dependencies (npm install)..."
  npm install --prefix "$FRONTEND_DIR" --silent \
    || die "npm install failed."
  log "Frontend dependencies ready."
fi

# ── Step 3: Postgres ─────────────────────────────────────────────────────────
info "Starting postgres..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d postgres \
  || die "Failed to start postgres."

for i in $(seq 1 30); do
  if docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres \
      pg_isready -U lifeplanner -d life_planner &>/dev/null; then
    log "Postgres is ready."
    break
  fi
  [[ $i -eq 30 ]] && die "Postgres did not become ready in time."
  sleep 1
done

# ── Step 4: Alembic migrations ───────────────────────────────────────────────
info "Running database migrations..."
(cd "$BACKEND_DIR" && "$VENV/bin/alembic" upgrade head) \
  || die "Alembic migration failed."
log "Database schema up to date."

# ── Step 5: Backend ──────────────────────────────────────────────────────────
BACKEND_LOG="$LOG_DIR/backend.log"
info "Starting backend → $BACKEND_LOG"

(cd "$BACKEND_DIR" && \
  "$VENV/bin/uvicorn" app.main:app \
    --host 0.0.0.0 --port 8000 \
    --reload \
) >"$BACKEND_LOG" 2>&1 &

register_proc "backend" $! "$BACKEND_LOG"
wait_for_port "backend" 127.0.0.1 8000 20 || {
  err "Backend failed to start. Last log lines:"
  tail -20 "$BACKEND_LOG" >&2
  exit 1
}

# ── Step 6: Frontend ─────────────────────────────────────────────────────────
FRONTEND_LOG="$LOG_DIR/frontend.log"
info "Starting frontend → $FRONTEND_LOG"

(cd "$FRONTEND_DIR" && npm run dev -- --host 2>/dev/null || npm run dev) \
  >"$FRONTEND_LOG" 2>&1 &

register_proc "frontend" $! "$FRONTEND_LOG"
wait_for_port "frontend" 127.0.0.1 5173 20 || {
  err "Frontend failed to start. Last log lines:"
  tail -20 "$FRONTEND_LOG" >&2
  exit 1
}

# ── Ready ─────────────────────────────────────────────────────────────────────
echo
echo -e "${BOLD}${GREEN}  Life Planner is running!${NC}"
echo -e "  ${CYAN}Local  :${NC}  http://localhost:5173"
echo -e "  ${CYAN}Network:${NC}  http://${LOCAL_IP}:5173"
echo -e "  ${CYAN}API    :${NC}  http://localhost:8000/docs"
echo -e "  ${CYAN}Logs   :${NC}  $LOG_DIR/"
echo -e "\n  Press ${BOLD}Ctrl+C${NC} to stop all services.\n"

# ── Monitor: exit if either service crashes ───────────────────────────────────
while true; do
  for name in "${!PROC_PIDS[@]}"; do
    pid="${PROC_PIDS[$name]}"
    if ! kill -0 "$pid" 2>/dev/null; then
      err "$name (PID $pid) has exited unexpectedly."
      err "Last lines from $name log:"
      tail -20 "${PROC_LOGS[$name]}" >&2
      exit 1
    fi
  done
  sleep 2
done
