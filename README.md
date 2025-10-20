# Cascade - Collaborative Data Platform MVP

Senior Design Group 34

## Quick Start

### Prerequisites
- Python 3.11
- Node.js 18+
- npm

### 🚀 Super Simple Setup (Recommended)

**One command to rule them all:**
```bash
# Clone and setup everything
git clone <your-repo>
cd cascade
npm run setup

# Start both frontend and backend
npm start
```

**Or use the startup script:**
```bash
# On macOS/Linux
./start.sh

# On Windows
start.bat
```

### Manual Setup (if needed)

1. **Install all dependencies**:
```bash
npm run install-all
```

2. **Start both servers**:
```bash
npm start
```

### Individual Server Commands

**Backend only:**
```bash
npm run backend
# API runs on http://localhost:8000
# Docs available at http://localhost:8000/docs
```

**Frontend only:**
```bash
npm run frontend
# UI runs on http://localhost:3000 (or 3001, 3002)
```

### Access Points
- **Frontend**: http://localhost:3000 (or 3001, 3002 if 3000 is busy)
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Technology Stack

- **Frontend**: React 18, TypeScript, ReactFlow, Tailwind CSS, Zustand, Lucide Icons
- **Backend**: Python 3.11, FastAPI, Pandas, SQLite
- **Dev Tools**: Vite, uvicorn

## ✨ New Features

### Beautiful Transform Nodes
- **Color-coded operations** - Each transform type has its own color
- **Smart column selection** - Dropdowns populated with actual columns from your data
- **Collapsible UI** - Click headers to expand/collapse configurations
- **Intuitive forms** - Clear, user-friendly configuration for every operation
- **Visual feedback** - Loading states, animations, and clear indicators

### Available Operations (All Fully Implemented!)
- 🔵 **Select** - Choose specific columns to keep
- 🟣 **Filter** - Filter rows based on conditions (equals, greater than, contains, etc.)
- 🟢 **Group By** - Group data and calculate aggregations (Sum, Mean, Count, Min, Max)
- 🟠 **Join** - Combine multiple datasets (Inner, Left, Right, Outer)
- 🩷 **Sort** - Sort data by column (Ascending/Descending)
- 🎨 **Rename** (Bonus) - Rename columns
- 🧮 **Calculate** (Bonus) - Add calculated columns with expressions

### Smart Pipeline Execution
- Automatic execution order (topological sort)
- Proper data flow between nodes
- **Beautiful Results Viewer** - See your transformed data in a table
- **CSV Export** - One-click download of results
- Clear error messages and success feedback
- Loading states during execution

## 📚 Documentation

- **USER_GUIDE.md** - Step-by-step guide with examples
- **TROUBLESHOOTING.md** - Common issues and solutions
- **TRANSFORM_IMPROVEMENTS.md** - Technical details
- **WHATS_NEW.md** - Overview of improvements
```