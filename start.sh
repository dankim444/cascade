#!/bin/bash

# Cascade Startup Script
echo "🚀 Starting Cascade - Simple Data Transformations"
echo "=================================================="

# Check if frontend exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: Frontend directory not found. Please run from cascade root."
    exit 1
fi

# Check if backend exists
if [ ! -d "backend" ]; then
    echo "❌ Error: Backend directory not found. Please run from cascade root."
    exit 1
fi

# Check if root node_modules exists (for concurrently)
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

# Check if frontend node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Check if backend virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "🐍 Setting up Python virtual environment..."
    cd backend && python3.11 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && cd ..
fi

# Initialize database if needed
if [ ! -f "backend/cascade.db" ] || [ ! -s "backend/cascade.db" ]; then
    echo "🗄️  Initializing database..."
    cd backend && source venv/bin/activate && python init_db.py && cd ..
fi

echo "✅ All dependencies are ready!"
echo ""
echo "🌐 Starting servers..."
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Start both servers using npm script
npm start
