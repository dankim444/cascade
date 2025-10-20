#!/bin/bash

# Cascade Startup Script
echo "🚀 Starting Cascade - No-Code Data Platform"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the cascade root directory"
    exit 1
fi

# Check if node_modules exists
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

echo "✅ All dependencies are ready!"
echo ""
echo "🌐 Starting servers..."
echo "   Frontend: http://localhost:3000 (or 3001, 3002 if 3000 is busy)"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Start both servers
npm run start
