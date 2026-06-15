#!/usr/bin/env bash
set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV="$BACKEND_DIR/venv"

# --- colors ---
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
info() { echo -e "${CYAN}[→]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
die()  { err "$*"; exit 1; }

echo -e "\n${BOLD}Life Planner — Setup${NC}\n"

# ── System packages ───────────────────────────────────────────────────────────
info "Installing system packages..."
sudo apt-get install -y python3.12-venv postgresql postgresql-client nodejs npm 2>&1 \
  | grep -E "^(Setting up|already)" || true
log "System packages ready."

# ── Python venv ───────────────────────────────────────────────────────────────
if [[ ! -d "$VENV" ]]; then
  info "Creating Python virtual environment..."
  python3 -m venv "$VENV" || die "Failed to create venv. Is python3.12-venv installed?"
  log "Venv created."
else
  log "Venv already exists — skipping creation."
fi

info "Installing Python dependencies..."
"$VENV/bin/pip" install --upgrade pip -q
"$VENV/bin/pip" install -r "$BACKEND_DIR/requirements.txt" -q || die "pip install failed."
log "Python dependencies installed."

# ── Frontend dependencies ─────────────────────────────────────────────────────
info "Installing frontend dependencies..."
npm install --prefix "$FRONTEND_DIR" --silent || die "npm install failed."
log "Frontend dependencies installed."

# ── PostgreSQL ────────────────────────────────────────────────────────────────
info "Ensuring PostgreSQL is running..."
if ! pg_isready -h localhost -p 5432 -q 2>/dev/null; then
  sudo systemctl start postgresql || die "Could not start PostgreSQL."
  sleep 2
fi
sudo systemctl enable postgresql 2>/dev/null || true
log "PostgreSQL is running."

info "Creating database user and database..."
sudo -u postgres psql -c "CREATE USER lifeplanner WITH PASSWORD 'lifeplanner123';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE life_planner OWNER lifeplanner;" 2>/dev/null || true
log "Database ready."

# ── Migrations ────────────────────────────────────────────────────────────────
info "Running database migrations..."
(cd "$BACKEND_DIR" && "$VENV/bin/alembic" upgrade head) || die "Alembic migration failed."
log "Database schema up to date."

# ── Done ─────────────────────────────────────────────────────────────────────
echo
echo -e "${BOLD}${GREEN}  Setup complete!${NC} Run the app with:"
echo -e "  ${CYAN}./start.sh${NC}"
echo
