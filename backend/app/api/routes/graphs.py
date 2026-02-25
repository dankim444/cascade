"""
Graph generation API routes for data visualization
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Literal, List, Dict, Any
from sqlalchemy.orm import Session
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import plotly.utils
import json
import base64
import tempfile
import os
from pathlib import Path
import sqlite3

from app.core.database import get_db
from app.core.project_access import check_project_access
from app.models.dataset import Dataset
from app.models.user import User
from app.core.security import get_current_user
from app.services.s3_service import s3_service

router = APIRouter()

class GraphConfig(BaseModel):
    graph_type: Literal["bar", "line", "scatter", "histogram", "box", "pie", "heatmap", "area"]
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    color_column: Optional[str] = None
    size_column: Optional[str] = None
    aggregation: Optional[str] = None
    title: Optional[str] = None
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    width: int = 800
    height: int = 600
    theme: Literal["plotly", "plotly_white", "plotly_dark", "ggplot2", "seaborn", "simple_white"] = "plotly_white"

class GraphRequest(BaseModel):
    data_key: str
    config: GraphConfig

class Column(BaseModel):
    name: str
    type: str
    non_null_count: int
    null_count: int
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    std: Optional[float] = None
    unique_count: Optional[int] = None
    most_frequent: Optional[str] = None

class DataSummary(BaseModel):
    total_rows: int
    total_columns: int
    columns: List[Column]
    numeric_columns: List[str]
    categorical_columns: List[str]

class GraphResponse(BaseModel):
    graph_json: str
    graph_image: Optional[str] = None
    config: GraphConfig
    data_summary: DataSummary

def load_dataset(data_key: str, user_id: str = None, db: Session = None) -> pd.DataFrame:
    """Load dataset from S3 storage or fallback to local files"""
    print(f"Loading dataset with data_key: {data_key}")
    
    # Try S3 approach first if user_id and db are provided
    if user_id and db:
        try:
            # Prefer user's own dataset first
            dataset = db.query(Dataset).filter(
                Dataset.data_key == data_key,
                Dataset.user_id == user_id
            ).first()

            # If not owned by user, allow shared-project access
            if not dataset:
                candidate = db.query(Dataset).filter(Dataset.data_key == data_key).first()
                if candidate:
                    if candidate.project_id:
                        project, _, _ = check_project_access(candidate.project_id, user_id, db)
                        if project:
                            dataset = candidate
                        else:
                            raise HTTPException(
                                status_code=403,
                                detail="You don't have access to the dataset for this visualization."
                            )
                    else:
                        raise HTTPException(
                            status_code=403,
                            detail="You don't have access to this dataset."
                        )
            
            if dataset:
                print(f"Found dataset in DB: {dataset.name} (ID: {dataset.id})")
                print(f"S3 DB path: {dataset.s3_db_path}")
                
                # Download database from S3
                db_content = s3_service.download_file(dataset.s3_db_path)
                if db_content:
                    # Create temporary database file
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
                    temp_file.write(db_content)
                    temp_file.close()
                    temp_path = temp_file.name
                    
                    try:
                        # Connect to SQLite database
                        print(f"Loading data from S3 via temporary file: {temp_path}")
                        conn = sqlite3.connect(temp_path)
                        df = pd.read_sql_query("SELECT * FROM data", conn)
                        conn.close()
                        print(f"Successfully loaded {len(df)} rows and {len(df.columns)} columns from S3")
                        return df
                    finally:
                        # Clean up temporary file
                        try:
                            if os.path.exists(temp_path):
                                os.unlink(temp_path)
                                print(f"Cleaned up temporary file: {temp_path}")
                        except Exception as e:
                            print(f"Error cleaning up temp file {temp_path}: {e}")
                else:
                    print(f"Failed to download from S3, falling back to local files")
            else:
                raise HTTPException(status_code=404, detail=f"Dataset {data_key} not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"S3 approach failed: {str(e)}, falling back to local files")
    
    # Fallback to local file approach
    print("Using local file fallback approach")
    db_path = Path(f"data/{data_key}.db")
    print(f"Looking for dataset at: {db_path}")
    
    if not db_path.exists():
        # List available files in data directory
        data_dir = Path("data")
        if data_dir.exists():
            available_files = list(data_dir.glob("*.db"))
            print(f"Available .db files in data/: {available_files}")
            
            # Try to find a matching file by checking if any available file contains the data_key
            for file_path in available_files:
                file_stem = file_path.stem  # filename without .db extension
                if data_key in file_stem or file_stem in data_key:
                    print(f"Found potential match: {file_path}")
                    db_path = file_path
                    break
            else:
                # If no match found, try the first data_ file as a fallback
                data_files = [f for f in available_files if f.name.startswith('data_')]
                if data_files:
                    print(f"Using first available data file as fallback: {data_files[0]}")
                    db_path = data_files[0]
                else:
                    raise HTTPException(status_code=404, detail=f"Dataset {data_key} not found. Available files: {[f.name for f in available_files]}")
        else:
            raise HTTPException(status_code=404, detail=f"Data directory not found and S3 unavailable")
    
    try:
        # Connect to SQLite database
        print(f"Loading data from local file: {db_path}")
        conn = sqlite3.connect(str(db_path))
        df = pd.read_sql_query("SELECT * FROM data", conn)
        conn.close()
        print(f"Successfully loaded {len(df)} rows and {len(df.columns)} columns from local file")
        return df
    except Exception as e:
        print(f"Error loading dataset from {db_path}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error loading dataset: {str(e)}")

def get_data_summary(df: pd.DataFrame) -> DataSummary:
    """Get comprehensive data summary"""
    try:
        columns = []
        numeric_columns = []
        categorical_columns = []
        
        for col in df.columns:
            col_data = df[col]
            non_null_count = col_data.count()
            null_count = len(col_data) - non_null_count
            
            # Determine if column is numeric or categorical
            if pd.api.types.is_numeric_dtype(col_data):
                numeric_columns.append(col)
                columns.append(Column(
                    name=col,
                    type=str(col_data.dtype),
                    non_null_count=non_null_count,
                    null_count=null_count,
                    min=float(col_data.min()) if non_null_count > 0 else None,
                    max=float(col_data.max()) if non_null_count > 0 else None,
                    mean=float(col_data.mean()) if non_null_count > 0 else None,
                    std=float(col_data.std()) if non_null_count > 0 else None
                ))
            else:
                categorical_columns.append(col)
                value_counts = col_data.value_counts()
                columns.append(Column(
                    name=col,
                    type=str(col_data.dtype),
                    non_null_count=non_null_count,
                    null_count=null_count,
                    unique_count=len(value_counts),
                    most_frequent=str(value_counts.index[0]) if len(value_counts) > 0 else None
                ))
        
        return DataSummary(
            total_rows=len(df),
            total_columns=len(df.columns),
            columns=columns,
            numeric_columns=numeric_columns,
            categorical_columns=categorical_columns
        )
    except Exception as e:
        print(f"Error getting data summary: {str(e)}")
        # Return basic summary on error
        return DataSummary(
            total_rows=len(df),
            total_columns=len(df.columns),
            columns=[],
            numeric_columns=[],
            categorical_columns=[]
        )

def create_plotly_graph(df: pd.DataFrame, config: GraphConfig) -> go.Figure:
    """Create plotly graph based on configuration"""
    template = config.theme
    
    if config.graph_type == "bar":
        if config.y_column and config.aggregation != "count":
            # Aggregate data for bar chart using specified method
            agg_method = config.aggregation or "sum"
            if agg_method == "mean":
                bar_data = df.groupby(config.x_column)[config.y_column].mean().reset_index()
            elif agg_method == "median":
                bar_data = df.groupby(config.x_column)[config.y_column].median().reset_index()
            elif agg_method == "min":
                bar_data = df.groupby(config.x_column)[config.y_column].min().reset_index()
            elif agg_method == "max":
                bar_data = df.groupby(config.x_column)[config.y_column].max().reset_index()
            else:  # sum
                bar_data = df.groupby(config.x_column)[config.y_column].sum().reset_index()
            fig = px.bar(bar_data, x=config.x_column, y=config.y_column, 
                        title=config.title, template=template)
        else:
            # Count occurrences if no y_column specified or count aggregation selected
            bar_data = df[config.x_column].value_counts().reset_index()
            bar_data.columns = ['category', 'count']
            fig = px.bar(bar_data, x='category', y='count',
                        title=config.title, template=template)
    
    elif config.graph_type == "line":
        if config.color_column:
            # If color grouping, use data as-is (multiple lines)
            fig = px.line(df, x=config.x_column, y=config.y_column, 
                         color=config.color_column, title=config.title, template=template)
        else:
            # Aggregate data to avoid multiple points at same x-value
            agg_method = config.aggregation or "mean"
            if agg_method == "sum":
                line_data = df.groupby(config.x_column)[config.y_column].sum().reset_index()
            elif agg_method == "median":
                line_data = df.groupby(config.x_column)[config.y_column].median().reset_index()
            elif agg_method == "min":
                line_data = df.groupby(config.x_column)[config.y_column].min().reset_index()
            elif agg_method == "max":
                line_data = df.groupby(config.x_column)[config.y_column].max().reset_index()
            else:  # mean
                line_data = df.groupby(config.x_column)[config.y_column].mean().reset_index()
            fig = px.line(line_data, x=config.x_column, y=config.y_column, 
                         title=config.title, template=template)
    
    elif config.graph_type == "scatter":
        fig = px.scatter(df, x=config.x_column, y=config.y_column, 
                        color=config.color_column, size=config.size_column,
                        title=config.title, template=template)
    
    elif config.graph_type == "histogram":
        fig = px.histogram(df, x=config.x_column, title=config.title, template=template)
    
    elif config.graph_type == "box":
        fig = px.box(df, x=config.x_column, y=config.y_column, 
                    title=config.title, template=template)
    
    elif config.graph_type == "pie":
        if not config.x_column:
            raise ValueError("Pie chart requires x_column for categories")
        
        # Aggregate data for pie chart
        if config.y_column and config.aggregation != "count":
            agg_method = config.aggregation or "sum"
            if agg_method == "mean":
                pie_data = df.groupby(config.x_column)[config.y_column].mean().reset_index()
            elif agg_method == "median":
                pie_data = df.groupby(config.x_column)[config.y_column].median().reset_index()
            elif agg_method == "min":
                pie_data = df.groupby(config.x_column)[config.y_column].min().reset_index()
            elif agg_method == "max":
                pie_data = df.groupby(config.x_column)[config.y_column].max().reset_index()
            else:  # sum
                pie_data = df.groupby(config.x_column)[config.y_column].sum().reset_index()
            fig = px.pie(pie_data, names=config.x_column, values=config.y_column,
                       title=config.title, template=template)
        else:
            # Count occurrences
            pie_data = df[config.x_column].value_counts().reset_index()
            pie_data.columns = ['category', 'count']
            fig = px.pie(pie_data, names='category', values='count',
                       title=config.title, template=template)
    
    elif config.graph_type == "heatmap":
        # Create correlation heatmap for numeric columns
        numeric_df = df.select_dtypes(include=['number'])
        if numeric_df.empty:
            raise ValueError("No numeric columns found for heatmap")
        corr_matrix = numeric_df.corr()
        fig = px.imshow(corr_matrix, text_auto=True, aspect="auto",
                       title=config.title or "Correlation Heatmap", template=template)
    
    elif config.graph_type == "area":
        # Aggregate data to avoid multiple areas at same x-value
        agg_method = config.aggregation or "sum"
        if agg_method == "mean":
            area_data = df.groupby(config.x_column)[config.y_column].mean().reset_index()
        elif agg_method == "median":
            area_data = df.groupby(config.x_column)[config.y_column].median().reset_index()
        elif agg_method == "min":
            area_data = df.groupby(config.x_column)[config.y_column].min().reset_index()
        elif agg_method == "max":
            area_data = df.groupby(config.x_column)[config.y_column].max().reset_index()
        else:  # sum
            area_data = df.groupby(config.x_column)[config.y_column].sum().reset_index()
        fig = px.area(area_data, x=config.x_column, y=config.y_column, 
                     title=config.title, template=template)
    
    else:
        raise ValueError(f"Unsupported graph type: {config.graph_type}")
    
    # Update layout with axis titles and better formatting
    fig.update_layout(
        width=config.width,
        height=config.height,
        xaxis_title=config.x_label or config.x_column,
        yaxis_title=config.y_label or config.y_column,
        title={
            'text': config.title,
            'x': 0.5,
            'xanchor': 'center'
        } if config.title else None
    )
    
    return fig

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify API is working"""
    return {"message": "Graph API is working!", "status": "ok"}

@router.get("/columns/{data_key}")
async def get_columns(
    data_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get column information for a dataset"""
    try:
        print(f"Getting columns for data_key: {data_key}")
        user_id = current_user.id if current_user else None
        df = load_dataset(data_key, user_id, db)
        print(f"Successfully loaded dataset with {len(df)} rows and {len(df.columns)} columns")
        data_summary = get_data_summary(df)
        
        return {
            "columns": [{"name": col.name, "type": col.type} for col in data_summary.columns],
            "numeric_columns": data_summary.numeric_columns,
            "categorical_columns": data_summary.categorical_columns
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting columns for {data_key}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error getting columns: {str(e)}")

@router.post("/generate", response_model=GraphResponse)
async def generate_graph(
    request: GraphRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a graph from dataset"""
    
    try:
        print(f"Generate graph request: {request}")
        
        # Load the dataset
        user_id = current_user.id if current_user else None
        df = load_dataset(request.data_key, user_id, db)
        print(f"Dataset loaded with {len(df)} rows and {len(df.columns)} columns.")

        # Validate columns exist
        all_columns = df.columns.tolist()
        if request.config.x_column and request.config.x_column not in all_columns:
            raise HTTPException(status_code=400, detail=f"Column '{request.config.x_column}' not found")
        if request.config.y_column and request.config.y_column not in all_columns:
            raise HTTPException(status_code=400, detail=f"Column '{request.config.y_column}' not found")
        if request.config.color_column and request.config.color_column not in all_columns:
            raise HTTPException(status_code=400, detail=f"Column '{request.config.color_column}' not found")
        if request.config.size_column and request.config.size_column not in all_columns:
            raise HTTPException(status_code=400, detail=f"Column '{request.config.size_column}' not found")

        # Create the graph
        fig = create_plotly_graph(df, request.config)
        
        # Convert to JSON in the format expected by frontend (with data and layout)
        graph_dict = {
            "data": fig.data,
            "layout": fig.layout
        }
        graph_json = json.dumps(graph_dict, cls=plotly.utils.PlotlyJSONEncoder)
        
        # Generate PNG image (optional)
        graph_image = None
        try:
            img_bytes = fig.to_image(format="png", width=request.config.width, height=request.config.height)
            graph_image = base64.b64encode(img_bytes).decode('utf-8')
        except Exception as e:
            print(f"Warning: Could not generate PNG image: {e}")
        
        # Get data summary
        data_summary = get_data_summary(df)

        return GraphResponse(
            graph_json=graph_json,
            graph_image=graph_image,
            config=request.config,
            data_summary=data_summary
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating graph: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating graph: {str(e)}")

@router.get("/types")
async def get_graph_types():
    """Get available graph types with customized field labels"""
    return {
        "graph_types": [
            {
                "type": "bar",
                "name": "Bar Chart",
                "description": "Compare categories with rectangular bars",
                "fields": {
                    "x_column": {"label": "Category Column", "help": "Column containing categories to group by", "required": True},
                    "y_column": {"label": "Value Column", "help": "Column with numeric values to aggregate. Leave empty to count occurrences.", "required": False},
                    "aggregation": {"label": "Aggregation Method", "help": "How to combine values for each category. 'Count' ignores Value Column and counts occurrences.", "required": False, "options": ["count", "sum", "mean", "median", "min", "max"], "default": "sum"}
                }
            },
            {
                "type": "line",
                "name": "Line Chart", 
                "description": "Show trends over time or continuous data",
                "fields": {
                    "x_column": {"label": "X-Axis (Time/Sequence)", "help": "Column for horizontal axis (usually time or sequence)", "required": True},
                    "y_column": {"label": "Y-Axis (Values)", "help": "Column containing numeric values to plot", "required": True},
                    "color_column": {"label": "Group By", "help": "Optional: Column to create separate lines", "required": False},
                    "aggregation": {"label": "Aggregation Method", "help": "How to combine values at the same x-position (ignored when using Group By)", "required": False, "options": ["mean", "sum", "median", "min", "max"], "default": "mean"}
                }
            },
            {
                "type": "scatter",
                "name": "Scatter Plot",
                "description": "Show relationship between two variables",
                "fields": {
                    "x_column": {"label": "X-Axis Variable", "help": "First variable for comparison", "required": True},
                    "y_column": {"label": "Y-Axis Variable", "help": "Second variable for comparison", "required": True},
                    "color_column": {"label": "Color By", "help": "Optional: Column to color points by", "required": False},
                    "size_column": {"label": "Size By", "help": "Optional: Column to size points by", "required": False}
                }
            },
            {
                "type": "histogram",
                "name": "Histogram",
                "description": "Show distribution of a single variable",
                "fields": {
                    "x_column": {"label": "Variable to Analyze", "help": "Numeric column to show distribution for", "required": True}
                }
            },
            {
                "type": "box",
                "name": "Box Plot",
                "description": "Show distribution and outliers",
                "fields": {
                    "y_column": {"label": "Values to Analyze", "help": "Numeric column to analyze distribution", "required": True},
                    "x_column": {"label": "Group By", "help": "Optional: Categorical column to create separate boxes", "required": False}
                }
            },
            {
                "type": "pie",
                "name": "Pie Chart",
                "description": "Show proportions of categories",
                "fields": {
                    "x_column": {"label": "Category Column", "help": "Column containing categories for pie slices", "required": True},
                    "y_column": {"label": "Value Column", "help": "Optional: Column with values to aggregate. If not provided, counts occurrences", "required": False},
                    "aggregation": {"label": "Aggregation Method", "help": "How to combine values for each category. 'Count' ignores Value Column and counts occurrences.", "required": False, "options": ["count", "sum", "mean", "median", "min", "max"], "default": "sum"}
                }
            },
            {
                "type": "heatmap",
                "name": "Heatmap",
                "description": "Show correlation between numeric variables",
                "fields": {}
            },
            {
                "type": "area",
                "name": "Area Chart",
                "description": "Show cumulative totals over time",
                "fields": {
                    "x_column": {"label": "X-Axis (Time/Sequence)", "help": "Column for horizontal axis (usually time or sequence)", "required": True},
                    "y_column": {"label": "Y-Axis (Values)", "help": "Numeric column containing values to plot", "required": True},
                    "aggregation": {"label": "Aggregation Method", "help": "How to combine values at the same x-position", "required": False, "options": ["sum", "mean", "median", "min", "max"], "default": "sum"}
                }
            }
        ]
    }

@router.get("/download/{data_key}")
async def download_image(data_key: str, format: str = "png"):
    """Download graph as image"""
    # This would be implemented to return the generated image
    return {"message": f"Download {format} for {data_key}"}
