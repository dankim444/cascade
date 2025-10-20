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

- **Frontend**: React 18, TypeScript, ReactFlow, Tailwind CSS, Zustand
- **Backend**: Python 3.10, FastAPI, Pandas
- **Dev Tools**: Vite, uvicorn
```