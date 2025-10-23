#!/bin/bash

# Test Fresh Install Script
# This simulates a fresh clone by removing all dependencies and reinstalling

echo "🧪 Testing Fresh Install Process"
echo "=================================="
echo ""
echo "This will:"
echo "  1. Remove all node_modules folders"
echo "  2. Remove Python virtual environment"
echo "  3. Run 'npm install' at root"
echo "  4. Try 'npm start'"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "🗑️  Step 1: Removing dependencies..."

# Remove root node_modules
if [ -d "node_modules" ]; then
    echo "   Removing root node_modules..."
    rm -rf node_modules
fi

# Remove frontend node_modules
if [ -d "frontend/node_modules" ]; then
    echo "   Removing frontend/node_modules..."
    rm -rf frontend/node_modules
fi

# Remove backend venv
if [ -d "backend/venv" ]; then
    echo "   Removing backend/venv..."
    rm -rf backend/venv
fi

echo "✅ Cleanup complete!"
echo ""
echo "📦 Step 2: Running 'npm install' at root..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Root npm install failed!"
    exit 1
fi

echo ""
echo "📦 Step 3: Installing frontend dependencies..."
cd frontend && npm install && cd ..

if [ $? -ne 0 ]; then
    echo "❌ Frontend npm install failed!"
    exit 1
fi

echo ""
echo "🐍 Step 4: Setting up Python environment..."
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

if [ $? -ne 0 ]; then
    echo "❌ Python setup failed!"
    exit 1
fi

echo ""
echo "✅ All dependencies installed successfully!"
echo ""
echo "🚀 Step 5: Testing 'npm start'..."
echo ""
echo "Starting servers in 3 seconds... (Press Ctrl+C to stop)"
sleep 3

npm start

