# Cascade - Collaborative Data Platform MVP

Senior Design Group 34

## Quick Start

### Prerequisites
- Python 3.11
- npm or yarn

### Development Setup

1. **Clone the repository**:
```bash
git clone <your-repo>
cd cascade
```

2. **Setup Backend**:
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

3. **Setup Frontend**:
```bash
cd frontend
npm install
```

### Running the Application

**Terminal 1 - Backend (FastAPI)**:
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
# API runs on http://localhost:8000
# Docs available at http://localhost:8000/docs
```

**Terminal 2 - Frontend (React)**:
```bash
cd frontend
npm run dev
# UI runs on http://localhost:3000
```

## Technology Stack

- **Frontend**: React 18, TypeScript, ReactFlow, Tailwind CSS, Zustand
- **Backend**: Python 3.10, FastAPI, Pandas
- **Dev Tools**: Vite, uvicorn
```