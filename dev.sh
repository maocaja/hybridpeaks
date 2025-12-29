#!/usr/bin/env bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting HybridPeaks local environment...${NC}"
echo ""

# Check if PostgreSQL is running (optional but helpful)
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Warning: PostgreSQL doesn't seem to be running on localhost:5432${NC}"
  echo -e "${YELLOW}   Make sure PostgreSQL is running before starting the backend.${NC}"
  echo ""
fi

# Array to store PIDs for cleanup
PIDS=()

# Function to cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Stopping services...${NC}"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  echo -e "${GREEN}✅ All services stopped.${NC}"
  exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# --- Backend ---
echo -e "${BLUE}▶ Starting backend (NestJS)...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install
fi
npm run start:dev > ../backend.log 2>&1 &
BACKEND_PID=$!
PIDS+=($BACKEND_PID)
cd ..
echo -e "${GREEN}  ✓ Backend started (PID: $BACKEND_PID)${NC}"

# --- Coach Web ---
echo -e "${BLUE}▶ Starting coach-web (Vite)...${NC}"
cd coach-web
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install
fi
npm run dev > ../coach-web.log 2>&1 &
COACH_PID=$!
PIDS+=($COACH_PID)
cd ..
echo -e "${GREEN}  ✓ Coach Web started (PID: $COACH_PID)${NC}"

# --- Athlete PWA ---
echo -e "${BLUE}▶ Starting athlete-pwa (Vite PWA)...${NC}"
cd athlete-pwa
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install
fi
npm run dev > ../athlete-pwa.log 2>&1 &
ATHLETE_PID=$!
PIDS+=($ATHLETE_PID)
cd ..
echo -e "${GREEN}  ✓ Athlete PWA started (PID: $ATHLETE_PID)${NC}"

# Wait a moment for services to start
sleep 2

echo ""
echo -e "${GREEN}✅ HybridPeaks is running!${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  ${GREEN}Backend API:${NC}    http://localhost:3000/api"
echo -e "  ${GREEN}Coach Web:${NC}      http://localhost:5173"
echo -e "  ${GREEN}Athlete PWA:${NC}    http://localhost:5174"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  Backend:    tail -f backend.log"
echo -e "  Coach Web:  tail -f coach-web.log"
echo -e "  Athlete:    tail -f athlete-pwa.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

# Wait for all background processes
wait

