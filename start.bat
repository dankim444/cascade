@echo off
echo 🚀 Starting Cascade - No-Code Data Platform
echo ==============================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the cascade root directory
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing root dependencies...
    npm install
)

REM Check if frontend node_modules exists
if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
)

REM Check if backend virtual environment exists
if not exist "backend\venv" (
    echo 🐍 Setting up Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
)

echo ✅ All dependencies are ready!
echo.
echo 🌐 Starting servers...
echo    Frontend: http://localhost:3000 (or 3001, 3002 if 3000 is busy)
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop all servers
echo.

REM Start both servers
npm run start
