from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import sqlite3
import io
import json
from typing import List, Dict, Any
import uuid
from datetime import datetime
import os
from app.transformations.executor_fixed import TransformationExecutor

app = FastAPI(
    title="Cascade API",
    description="Backend API for Cascade - No-Code Data Platform",
    version="1.0.0"
)

# CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (in production, use a database)
datasets = {}
pipelines = {}
data_connections = {}  # Store SQL connections

# Create data directory if it doesn't exist
os.makedirs("data", exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Cascade API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload and process a dataset file with SQL storage"""
    try:
        # Read file content
        content = await file.read()
        
        # Parse CSV
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        
        # Generate dataset ID and data key
        dataset_id = str(uuid.uuid4())
        data_key = f"data_{dataset_id}"
        
        # Create SQLite database for this dataset
        db_path = f"data/{data_key}.db"
        conn = sqlite3.connect(db_path)
        
        # Store data in SQLite
        df.to_sql('data', conn, if_exists='replace', index=False)
        
        # Get schema information
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(data)")
        columns_info = cursor.fetchall()
        
        # Convert to our schema format
        columns = []
        for col_info in columns_info:
            col_name = col_info[1]
            col_type = col_info[2]
            nullable = not col_info[3]  # NOT NULL constraint
            
            # Map SQLite types to our types
            if col_type.upper() in ['INTEGER', 'REAL']:
                type_mapped = 'number'
            elif col_type.upper() == 'TEXT':
                type_mapped = 'string'
            else:
                type_mapped = 'string'
            
            columns.append({
                "name": col_name,
                "type": type_mapped,
                "nullable": nullable
            })
        
        # Get preview data using SQL
        cursor.execute("SELECT * FROM data LIMIT 10")
        preview_rows = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]
        
        # Convert to JSON-serializable format
        preview_data = []
        for row in preview_rows:
            row_dict = {}
            for i, value in enumerate(row):
                if value is None:
                    row_dict[column_names[i]] = None
                else:
                    row_dict[column_names[i]] = value
            preview_data.append(row_dict)
        
        # Get row count
        cursor.execute("SELECT COUNT(*) FROM data")
        row_count = cursor.fetchone()[0]
        
        conn.close()
        
        # Create dataset metadata
        dataset_info = {
            "id": dataset_id,
            "name": file.filename.replace('.csv', ''),
            "columns": columns,
            "rowCount": row_count,
            "preview": preview_data,
            "dataKey": data_key,
            "uploadedAt": datetime.now().isoformat()
        }
        
        # Store dataset info and SQL connection
        datasets[dataset_id] = dataset_info
        data_connections[data_key] = {
            "dataKey": data_key,
            "sqlConnection": db_path,
            "schema": {"columns": columns},
            "rowCount": row_count,
            "lastAccessed": datetime.now()
        }
        
        return dataset_info
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@app.get("/api/datasets")
async def get_datasets():
    """Get all uploaded datasets"""
    return {"datasets": list(datasets.values())}

@app.get("/api/datasets/{dataset_id}")
async def get_dataset(dataset_id: str):
    """Get specific dataset"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    return datasets[dataset_id]["info"]

@app.get("/api/datasets/{dataset_id}/preview")
async def get_dataset_preview(dataset_id: str, limit: int = 10):
    """Get dataset preview data using SQL"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    dataset = datasets[dataset_id]
    data_key = dataset["dataKey"]
    
    if data_key not in data_connections:
        raise HTTPException(status_code=404, detail="Data connection not found")
    
    # Connect to SQLite database
    db_path = data_connections[data_key]["sqlConnection"]
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get preview data using SQL
    cursor.execute(f"SELECT * FROM data LIMIT {limit}")
    preview_rows = cursor.fetchall()
    column_names = [desc[0] for desc in cursor.description]
    
    # Convert to JSON-serializable format
    preview_data = []
    for row in preview_rows:
        row_dict = {}
        for i, value in enumerate(row):
            if value is None:
                row_dict[column_names[i]] = None
            else:
                row_dict[column_names[i]] = value
        preview_data.append(row_dict)
    
    # Get total row count
    cursor.execute("SELECT COUNT(*) FROM data")
    total_rows = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "data": preview_data,
        "totalRows": total_rows
    }

@app.post("/api/transformations/run")
async def run_transformation(pipeline: Dict[str, Any]):
    """Execute a transformation pipeline"""
    try:
        # Extract nodes and data connections from pipeline
        nodes = pipeline.get('nodes', [])
        data_connections = pipeline.get('dataConnections', [])
        
        # Create transformation executor
        executor = TransformationExecutor(data_connections)
        
        # Execute pipeline
        result = executor.execute_pipeline(nodes, data_connections)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {str(e)}")

@app.post("/api/pipelines/save")
async def save_pipeline(pipeline: Dict[str, Any]):
    """Save a pipeline"""
    pipeline_id = str(uuid.uuid4())
    pipeline_data = {
        "id": pipeline_id,
        "name": pipeline.get("name", "Untitled Pipeline"),
        "definition": pipeline,
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }
    
    pipelines[pipeline_id] = pipeline_data
    return pipeline_data

@app.get("/api/pipelines")
async def get_pipelines():
    """Get all saved pipelines"""
    return {"pipelines": list(pipelines.values())}

@app.get("/api/pipelines/{pipeline_id}")
async def get_pipeline(pipeline_id: str):
    """Get specific pipeline"""
    if pipeline_id not in pipelines:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    return pipelines[pipeline_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
