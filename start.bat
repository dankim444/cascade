@echo off
echo 🚀 Starting Cascade - Simple Data Transformations
echo ==================================================
echo.

REM Check if frontend exists
if not exist "frontend\" (
    echo ❌ Error: Frontend directory not found. Please run from cascade root.
    exit /b 1
)

REM Check if backend exists
if not exist "backend\" (
    echo ❌ Error: Backend directory not found. Please run from cascade root.
    exit /b 1
)

REM Check if frontend node_modules exists
if not exist "frontend\node_modules\" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

REM Check if backend virtual environment exists
if not exist "backend\venv\" (
    echo 🐍 Setting up Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
)

REM Initialize database if needed
if not exist "backend\cascade.db" (
    echo 🗄️  Initializing database...
    cd backend
    call venv\Scripts\activate
    python init_db.py
    cd ..
)

echo ✅ All dependencies are ready!
echo.
echo 🌐 Starting servers...
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop all servers
echo.

REM Start backend in a new window
start "Cascade Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

REM Wait a bit for backend to start
timeout /t 2 /nobreak > nul

REM Start frontend in a new window
start "Cascade Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Both servers started in separate windows
echo Close the windows or press Ctrl+C in them to stop the servers
