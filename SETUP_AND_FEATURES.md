# Cascade - Setup & Features

## ✨ New Features Added

### Authentication & User Management
- User registration and login with JWT tokens
- Session persistence across browser sessions
- User isolation (users only see their own data)

### Dataset Persistence
- Upload CSV files stored in AWS S3
- View and manage all uploaded datasets
- Delete datasets (automatically removes associated pipelines)
- Dataset preview and metadata

### Pipeline Persistence
- Save pipelines manually
- Auto-load most recent pipeline on login
- Automatic cleanup: pipelines deleted when referenced datasets are deleted

### Cloud Storage
- All datasets stored in AWS S3
- User-scoped file organization
- Automatic file management

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment

Create `backend/.env`:

```env
DATABASE_URL=sqlite:///./cascade.db
SECRET_KEY=your-secret-key-here  # Generate: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

### 3. Initialize Database

```bash
cd backend
source venv/bin/activate
python init_db.py
cd ..
```

### 4. Run Application

```bash
npm start
```

Access at:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173

---

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.13+
- AWS Account with S3 bucket
- AWS IAM user with S3 permissions (PutObject, GetObject, DeleteObject, ListBucket)

---

*Last Updated: November 23, 2025*
