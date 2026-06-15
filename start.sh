#!/usr/bin/env bash
set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV="$BACKEND_DIR/venv"
LOG_DIR="$PROJECT_DIR/.logs"

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

  sleep 1

  for name in "${!PROC_PIDS[@]}"; do
    local pid="${PROC_PIDS[$name]}"
    if kill -0 "$pid" 2>/dev/null; then
      warn "$name did not stop gracefully — force killing..."
      kill -KILL "$pid" 2>/dev/null || true
    fi
  done

  for name in "${!PROC_PIDS[@]}"; do
    wait "${PROC_PIDS[$name]}" 2>/dev/null || true
  done

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

# --- preflight ---
echo -e "\n${BOLD}Life Planner — Starting up${NC}\n"

[[ -f "$VENV/bin/uvicorn" ]]      || { echo -e "${RED}[✗]${NC} Not set up. Run: ./setup.sh" >&2; exit 1; }
[[ -d "$FRONTEND_DIR/node_modules" ]] || { echo -e "${RED}[✗]${NC} Not set up. Run: ./setup.sh" >&2; exit 1; }

# --- local IP ---
LOCAL_IP=$(ip addr show | awk '/inet / && !/127\.0\.0\.1/ {sub(/\/.*/, "", $2); print $2; exit}')

# ── Postgres ─────────────────────────────────────────────────────────────────
if ! pg_isready -h localhost -p 5432 -q 2>/dev/null; then
  info "Starting PostgreSQL..."
  sudo systemctl start postgresql || { echo -e "${RED}[✗]${NC} PostgreSQL failed to start." >&2; exit 1; }
  sleep 2
fi
log "PostgreSQL is ready."

# ── Migrations (picks up new ones after a git pull) ───────────────────────────
(cd "$BACKEND_DIR" && "$VENV/bin/alembic" upgrade head -q) || { echo -e "${RED}[✗]${NC} Migration failed." >&2; exit 1; }
log "Database schema up to date."

# ── Backend ───────────────────────────────────────────────────────────────────
BACKEND_LOG="$LOG_DIR/backend.log"
info "Starting backend → $BACKEND_LOG"
(cd "$BACKEND_DIR" && "$VENV/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 --reload) \
  >"$BACKEND_LOG" 2>&1 &
register_proc "backend" $! "$BACKEND_LOG"
wait_for_port "backend" 127.0.0.1 8000 20 || { tail -20 "$BACKEND_LOG" >&2; exit 1; }

# ── Frontend ──────────────────────────────────────────────────────────────────
FRONTEND_LOG="$LOG_DIR/frontend.log"
info "Starting frontend → $FRONTEND_LOG"
(cd "$FRONTEND_DIR" && npm run dev) >"$FRONTEND_LOG" 2>&1 &
register_proc "frontend" $! "$FRONTEND_LOG"
wait_for_port "frontend" 127.0.0.1 5173 20 || { tail -20 "$FRONTEND_LOG" >&2; exit 1; }

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
      err "$name crashed. Last log lines:"
      err ""
      tail -20 "${PROC_LOGS[$name]}" >&2
      exit 1
    fi
  done
  sleep 2
done
