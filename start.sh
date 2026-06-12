#!/bin/bash

# Battery Monitoring System - Startup Script for macOS/Linux

echo ""
echo "================================"
echo "Battery Monitoring System v1.0"
echo "================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8+ from python.org"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js 14+ from nodejs.org"
    exit 1
fi

echo "[INFO] Starting Backend (Flask API)..."
echo ""

# Start backend in background
cd backend
python3 app.py &
BACKEND_PID=$!

echo "[INFO] Waiting for backend to start..."
sleep 3

echo ""
echo "[INFO] Starting Frontend (React UI)..."
echo ""

# Start frontend in background
cd ../frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "Startup Complete!"
echo "================================"
echo ""
echo "Backend API: http://localhost:5000"
echo "Frontend UI: http://localhost:3000"
echo ""
echo "Dashboard will open automatically in your browser"
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
