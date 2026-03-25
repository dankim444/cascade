# Cascade - Collaborative Data Platform MVP

Senior Design Group 34

## Quick Start

### Prerequisites

- Python 3.11
- Node.js 18+
- npm

### Setup

**Run both frontend and backend at once**

```bash
# Clone and setup everything
git clone git@github.com:dankim444/cascade.git
cd cascade
npm run setup

# Start a virtual environment in backend/ and initialize the database
cd backend
source venv/bin/activate
python init_db.py # do this only once
cd ..

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

## 📚 Documentation

- **PIPELINE_GUIDE.md** - Complete guide to the visual pipeline system
- **USER_GUIDE.md** - Step-by-step guide with examples (legacy simple mode)
