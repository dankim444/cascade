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

## ✨ Latest Features: Visual Pipeline System

### 🎨 Node-Based Pipeline Editor
Cascade now features a **complete visual graph-based pipeline system**:

- **Visual Canvas** - Drag-and-drop interface for building data pipelines
- **Node Graph** - Each transformation is a visual node with connections
- **Real-time Flow** - See your data flow through transformations
- **Interactive Canvas** - Zoom, pan, minimap for large pipelines
- **Go Back in Time** - Click any node to view data at that stage

### 📊 Node Types

**Data Source Nodes (Blue)**
- Upload CSV files as data sources
- Shows row count and column information
- Reusable across multiple transformations

**Transformation Nodes (Color-Coded)**
- 🔵 **Select** - Choose specific columns to keep
- 🟣 **Filter** - Filter rows based on conditions
- 🟢 **Group By** - Aggregate with sum, mean, count, min, max
- 🟠 **Join** - Combine datasets (inner, left, right, outer)
- 🩷 **Sort** - Order data by column
- 🟦 **Rename** - Rename columns
- 🟡 **Calculate** - Create calculated columns with expressions

### 🔄 Advanced Pipeline Features

**Execute from Any Point**
- Click any node and "View Output" to see intermediate results
- Run entire pipeline or just up to a specific node
- **Debug and verify each transformation step**

**Visual State Management**
- See which nodes are running, completed, or have errors
- Status indicators on each node
- Historical results stored per execution

**Smart Graph Management**
- Automatic topological sorting of execution order
- Connect nodes by dragging edges
- Delete nodes and edges easily
- Configuration panel for selected nodes

**Pipeline Persistence**
- Save entire pipeline as JSON
- Export results to CSV
- Reload and continue work

## 📚 Documentation

- **PIPELINE_GUIDE.md** - Complete guide to the visual pipeline system
- **USER_GUIDE.md** - Step-by-step guide with examples (legacy simple mode)
- **TROUBLESHOOTING.md** - Common issues and solutions
- **TRANSFORM_IMPROVEMENTS.md** - Technical details