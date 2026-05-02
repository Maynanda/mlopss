#!/bin/bash
# ╔══════════════════════════════════════════╗
# ║   MLOps Platform — Startup Script        ║
# ╚══════════════════════════════════════════╝

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/.venv"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}"
echo "  ███╗   ███╗██╗      ██████╗ ██████╗ ███████╗"
echo "  ████╗ ████║██║     ██╔═══██╗██╔══██╗██╔════╝"
echo "  ██╔████╔██║██║     ██║   ██║██████╔╝███████╗"
echo "  ██║╚██╔╝██║██║     ██║   ██║██╔═══╝ ╚════██║"
echo "  ██║ ╚═╝ ██║███████╗╚██████╔╝██║     ███████║"
echo "  ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚══════╝"
echo -e "  Platform v1.0.0${NC}"
echo ""

# ── Backend venv ──────────────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
  echo -e "${YELLOW}[1/4] Creating Python virtual environment...${NC}"
  python3 -m venv "$VENV_DIR"
fi

echo -e "${YELLOW}[2/4] Installing backend dependencies...${NC}"
"$VENV_DIR/bin/pip" install -q --upgrade pip
"$VENV_DIR/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"
echo -e "${GREEN}    ✓ Backend dependencies ready${NC}"

# ── Frontend deps ────────────────────────────────────────
echo -e "${YELLOW}[3/4] Installing frontend dependencies...${NC}"
cd "$FRONTEND_DIR" && npm install --silent
echo -e "${GREEN}    ✓ Frontend dependencies ready${NC}"

# ── Launch services ──────────────────────────────────────
echo -e "${YELLOW}[4/4] Starting services...${NC}"
echo ""

# MLflow server
echo -e "  ${CYAN}▶ MLflow Server${NC}  → http://localhost:5001"
"$VENV_DIR/bin/mlflow" server \
  --host 0.0.0.0 \
  --port 5001 \
  --backend-store-uri "sqlite:///$BACKEND_DIR/mlflow.db" \
  --default-artifact-root "$BACKEND_DIR/mlflow_tracking" \
  > "$BACKEND_DIR/mlflow.log" 2>&1 &
MLFLOW_PID=$!

sleep 2

# FastAPI backend
echo -e "  ${CYAN}▶ FastAPI Backend${NC} → http://localhost:8000"
echo -e "      Docs: http://localhost:8000/docs"
cd "$BACKEND_DIR"
"$VENV_DIR/bin/uvicorn" main:app --host 0.0.0.0 --port 8000 --reload \
  > "$BACKEND_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

sleep 2

# React frontend
echo -e "  ${CYAN}▶ React Frontend${NC}  → http://localhost:5173"
cd "$FRONTEND_DIR" && npm run dev > "$FRONTEND_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  All services started!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  🌐  Frontend   : ${CYAN}http://localhost:5173${NC}"
echo -e "  ⚡  Backend    : ${CYAN}http://localhost:8000${NC}"
echo -e "  📊  MLflow UI  : ${CYAN}http://localhost:5001${NC}"
echo -e "  📖  API Docs   : ${CYAN}http://localhost:8000/docs${NC}"
echo ""
echo -e "  Logs: backend/backend.log | backend/mlflow.log | frontend/frontend.log"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"

trap "echo ''; echo 'Stopping...'; kill $MLFLOW_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
