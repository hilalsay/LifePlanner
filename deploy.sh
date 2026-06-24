#!/usr/bin/env bash
#
# Production redeploy for the VPS. Run this ON the server (it pulls main,
# updates deps, rebuilds the frontend, and restarts the backend via systemd).
#
#   ssh hilal@<vps> 'cd ~/LifePlanner && ./deploy.sh'
#
# Architecture (see deploy/systemd/ for the unit files):
#   - lifeplanner-backend.service  : uvicorn :8000 (runs migrations on start)
#   - lifeplanner-frontend.service : oneshot `npm run build` -> frontend/dist/
#   - nginx                        : serves frontend/dist/, proxies /api -> :8000
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
info() { echo -e "${CYAN}[→]${NC} $*"; }

cd "$PROJECT_DIR"

# 1. Pull latest main (fast-forward only; aborts on local divergence)
info "Pulling latest main..."
git pull --ff-only origin main
log "Source updated to $(git rev-parse --short HEAD)."

# 2. Backend dependencies (no-op if unchanged)
info "Syncing backend dependencies..."
"$BACKEND_DIR/venv/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"

# 3. Frontend dependencies (no-op if unchanged)
info "Syncing frontend dependencies..."
npm --prefix "$FRONTEND_DIR" install --no-audit --no-fund

# 4. Rebuild the frontend bundle (oneshot service cleans caches + builds dist/)
# Use restart, not start: a RemainAfterExit oneshot stays "active" after its
# first run, so `start` would be a no-op and skip the rebuild.
info "Rebuilding frontend..."
sudo systemctl restart lifeplanner-frontend.service
log "Frontend rebuilt -> $FRONTEND_DIR/dist"

# 5. Restart the backend (runs alembic migrations on start)
info "Restarting backend..."
sudo systemctl restart lifeplanner-backend.service

# 6. Report
sleep 2
info "Backend status:"
systemctl --no-pager --lines=0 status lifeplanner-backend.service | head -4
SERVED_JS="$(curl -s https://lifeplanner.hilalsay.com.tr/ | grep -oE 'assets/index-[^\"]*\.js' | head -1 || true)"
log "Deploy complete. Served bundle: ${SERVED_JS:-unknown}"
