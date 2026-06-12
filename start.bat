@echo off
REM Battery Monitoring System - Startup Script for Windows

echo.
echo ================================
echo Battery Monitoring System v1.0
echo ================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from python.org
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 14+ from nodejs.org
    pause
    exit /b 1
)

echo [INFO] Starting Backend (Flask API)...
echo.

REM Start backend in a new window
cd backend
start "Battery Monitor - Backend" cmd /k python app.py

echo [INFO] Waiting for backend to start...
timeout /t 3 /nobreak

echo.
echo [INFO] Starting Frontend (React UI)...
echo.

REM Start frontend in a new window
cd ..\frontend
start "Battery Monitor - Frontend" cmd /k npm start

echo.
echo ================================
echo Startup Complete!
echo ================================
echo.
echo Backend API: http://localhost:5100
echo Frontend UI: http://localhost:3100
echo.
echo Dashboard will open automatically in your browser
echo Press Ctrl+C in each window to stop the servers
echo.
pause
