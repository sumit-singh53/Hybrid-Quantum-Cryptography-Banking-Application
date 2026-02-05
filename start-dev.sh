#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Banking Application Development Servers...${NC}"
echo ""

# Kill any existing processes on ports 3000 and 5000
echo "Checking for existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null
sleep 1

# Start backend in a new terminal/background with proper job control
echo -e "${BLUE}[Backend]${NC} Starting Flask server on port 5000..."
(cd backend && . venv/bin/activate && python run.py) > backend.log 2>&1 &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# Start frontend in background with proper job control
echo -e "${BLUE}[Frontend]${NC} Starting React development server on port 3000..."
(cd frontend && npm start) > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for servers to initialize
sleep 3

echo ""
echo -e "${GREEN}✓ Servers started successfully!${NC}"
echo -e "  Backend:  http://localhost:5000 (PID: $BACKEND_PID)"
echo -e "  Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  Backend:  tail -f backend.log"
echo -e "  Frontend: tail -f frontend.log"
echo ""
echo "Both servers have hot-reload enabled:"
echo "  - Flask will auto-reload when Python files change"
echo "  - React will hot-reload when JS/JSX files change"
echo ""
echo "To stop servers: kill $BACKEND_PID $FRONTEND_PID"
echo "Or run: lsof -ti:5000 | xargs kill -9 && lsof -ti:3000 | xargs kill -9"
echo ""
