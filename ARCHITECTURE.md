# Cascade Pipeline Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                      (React + TypeScript)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              PipelineLayout Component                   │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │  Header: Upload | Add Node | Save | Execute     │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │                                                          │    │
│  │  ┌──────────────────────┬─────────────────────────┐   │    │
│  │  │                      │                         │   │    │
│  │  │  PipelineCanvas      │  NodeConfigPanel       │   │    │
│  │  │  (React Flow)        │  (Configuration)       │   │    │
│  │  │                      │                         │   │    │
│  │  │  ┌────────────┐     │  • Select columns      │   │    │
│  │  │  │ Data Node  │─┐   │  • Filter config       │   │    │
│  │  │  │  (Blue)    │ │   │  • Join settings       │   │    │
│  │  │  └────────────┘ │   │  • Aggregations        │   │    │
│  │  │       │         │   │  • Sort order          │   │    │
│  │  │       ▼         │   │  • Calculations        │   │    │
│  │  │  ┌────────────┐ │   │                         │   │    │
│  │  │  │Transform   │ │   │                         │   │    │
│  │  │  │Node        │ │   │                         │   │    │
│  │  │  │(Colored)   │ │   │                         │   │    │
│  │  │  └────────────┘ │   │                         │   │    │
│  │  │       │         │   │                         │   │    │
│  │  │  ┌────────────┐ │   │                         │   │    │
│  │  │  │Transform   │ │   │                         │   │    │
│  │  │  │Node        │ │   │                         │   │    │
│  │  │  └────────────┘ │   │                         │   │    │
│  │  │                      │                         │   │    │
│  │  └──────────────────────┴─────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/JSON
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND API                              │
│                      (FastAPI + Python)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              API Endpoints                              │    │
│  │  • POST /api/upload        - Upload CSV                │    │
│  │  • GET  /api/datasets      - List datasets             │    │
│  │  • POST /api/transformations/run - Execute pipeline    │    │
│  │  • POST /api/pipelines/save - Save pipeline            │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         TransformationExecutor                          │    │
│  │  • Build execution graph (topological sort)            │    │
│  │  • Execute nodes in dependency order                   │    │
│  │  • Track intermediate results                          │    │
│  │  • Handle node-to-node data flow                       │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Transform Operations                            │    │
│  │  • _execute_select()     - Column selection            │    │
│  │  • _execute_filter()     - Row filtering               │    │
│  │  • _execute_groupby()    - Aggregation                 │    │
│  │  • _execute_join()       - Table joins                 │    │
│  │  • _execute_sort()       - Sorting                     │    │
│  │  • _execute_rename()     - Column renaming             │    │
│  │  • _execute_calculate()  - Computed columns            │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA STORAGE LAYER                          │
│                         (SQLite)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  backend/data/                                                   │
│    ├── data_<uuid1>.db       ← Original uploaded data          │
│    ├── select_<timestamp>.db ← Output of select operation       │
│    ├── filter_<timestamp>.db ← Output of filter operation       │
│    ├── groupby_<timestamp>.db ← Output of groupby operation     │
│    └── ...                                                       │
│                                                                  │
│  Each database contains:                                         │
│    • Single 'data' table with transformation results            │
│    • Full dataset (not just preview)                            │
│    • Indexed for fast queries                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### 1. Upload Flow
```
User → Upload CSV → FastAPI
                     ↓
           Parse with Pandas
                     ↓
         Create SQLite DB (data_<uuid>.db)
                     ↓
           Extract schema & preview
                     ↓
       Store in datasets & data_connections
                     ↓
         Return metadata to frontend
                     ↓
      Add to Zustand store (datasets)
```

### 2. Pipeline Building Flow
```
User Action                  Frontend State
─────────────────────────────────────────────
Add Data Node        →   Create FlowNode (type: dataNode)
                     →   Add to flowNodes array
                     →   Render blue node on canvas

Add Transform Node   →   Create FlowNode (type: transformNode)
                     →   Add to flowNodes array
                     →   Render colored node on canvas

Connect Nodes        →   Create FlowEdge
                     →   Add to flowEdges array
                     →   Render animated connection

Configure Node       →   Open NodeConfigPanel
                     →   Update node.data.config
                     →   Update node.data.label
```

### 3. Pipeline Execution Flow
```
User clicks "Run"
     ↓
Frontend (useWorkflowStore.executeToNode)
     ↓
Build execution path (traverse graph backward from target)
     ↓
Convert to backend format:
  {
    nodes: [
      { id, transform: { operation, params }, data, parent, child }
    ],
    dataConnections: [
      { dataKey, sqlConnection, schema, rowCount }
    ]
  }
     ↓
POST to /api/transformations/run
     ↓
Backend (TransformationExecutor.execute_pipeline)
     ↓
Build execution order (topological sort)
     ↓
For each node:
  1. Get input data (from parent output or source)
  2. Execute operation (SQL/Pandas)
  3. Write results to new SQLite DB
  4. Return preview + metadata
     ↓
Collect all results
     ↓
Return to frontend:
  {
    status: "success",
    data: [preview rows],
    outputRows: count,
    outputSchema: [...],
    executionResults: [per-node results]
  }
     ↓
Frontend stores result in nodeResults Map
     ↓
Update node status (success/error)
     ↓
Show ResultsViewer modal
```

## State Management Architecture

### Zustand Store Structure
```typescript
{
  // Graph state
  flowNodes: FlowNode[]        // Visual nodes on canvas
  flowEdges: FlowEdge[]        // Connections between nodes
  selectedNodeId: string | null // Currently selected node
  
  // Execution history
  nodeResults: Map<string, NodeExecutionResult>
  
  // Data
  datasets: Dataset[]          // Uploaded datasets
  dataConnections: DataConnection[]  // SQL connections
  
  // Actions
  setFlowNodes(nodes)
  addFlowNode(node)
  updateFlowNode(id, updates)
  deleteFlowNode(id)
  executeToNode(nodeId)
  setNodeResult(nodeId, result)
  ...
}
```

### Node Data Structure
```typescript
// Data Node
{
  id: "data-<uuid>-<timestamp>",
  type: "dataNode",
  position: { x, y },
  data: {
    label: "Sales Data",
    dataKey: "data_abc123",
    rowCount: 10000,
    columnCount: 5
  }
}

// Transform Node
{
  id: "transform-filter-<timestamp>",
  type: "transformNode",
  position: { x, y },
  data: {
    label: "Filter: Region = 'West'",
    operation: "filter",
    config: {
      column: "Region",
      operator: "equals",
      value: "West"
    },
    status: "success",
    outputRows: 2500,
    dataKey: "data_abc123"  // Input data reference
  }
}
```

### Edge Structure
```typescript
{
  id: "edge-<sourceId>-<targetId>",
  source: "data-abc",       // Source node ID
  target: "transform-xyz",   // Target node ID
  type: "smoothstep",
  animated: true
}
```

## Component Architecture

### Component Tree
```
App
└── PipelineLayout
    ├── Header
    │   ├── Title & Info
    │   └── Action Buttons
    │       ├── Upload Data
    │       ├── Add Node (with dropdown)
    │       └── Save Pipeline
    │
    ├── Main Content Area
    │   ├── PipelineCanvas (React Flow)
    │   │   ├── Background
    │   │   ├── Controls
    │   │   ├── MiniMap
    │   │   ├── DataNode (custom)
    │   │   ├── TransformNode (custom)
    │   │   └── Action Panel
    │   │       ├── Run Pipeline
    │   │       ├── View Output
    │   │       └── Delete Node
    │   │
    │   └── NodeConfigPanel (conditional)
    │       ├── Node Label Input
    │       └── Operation-specific forms
    │           ├── SelectConfigForm
    │           ├── FilterConfigForm
    │           ├── GroupByConfigForm
    │           ├── JoinConfigForm
    │           ├── SortConfigForm
    │           ├── RenameConfigForm
    │           └── CalculateConfigForm
    │
    ├── DataUpload Modal (conditional)
    │   └── Dropzone + Preview
    │
    └── ResultsViewer Modal (conditional)
        ├── Results Table
        ├── Stats Bar
        └── Download CSV Button
```

### Component Responsibilities

**PipelineLayout**
- Overall application state
- Modal management
- Event coordination

**PipelineCanvas**
- Render graph visualization
- Handle node/edge interactions
- Manage React Flow instance

**NodeConfigPanel**
- Show configuration for selected node
- Validate configuration
- Save updates to store

**Custom Nodes (Data/Transform)**
- Render node appearance
- Show status indicators
- Handle node-specific styling

**ResultsViewer**
- Display execution results
- Format table data
- CSV export functionality

## Backend Architecture

### FastAPI Application Structure
```
main.py
├── CORS middleware
├── Routes
│   ├── POST /api/upload
│   ├── GET  /api/datasets
│   ├── POST /api/transformations/run
│   └── POST /api/pipelines/save
│
└── In-memory storage
    ├── datasets: Dict[id, Dataset]
    ├── data_connections: Dict[key, Connection]
    └── pipelines: Dict[id, Pipeline]
```

### Transformation Executor
```python
class TransformationExecutor:
    def execute_pipeline(nodes, data_connections):
        # Build execution graph
        execution_order = _build_execution_order(nodes)
        
        # Execute each node
        for node in execution_order:
            input_data = get_input_from_parent()
            result = _execute_node(node, input_data)
            store_output(result)
        
        return final_result
    
    def _execute_node(node, input_data):
        operation = node['transform']['operation']
        
        # Route to specific operation
        if operation == 'filter':
            return _execute_filter(input_data, params)
        elif operation == 'select':
            return _execute_select(input_data, params)
        ...
    
    def _execute_filter(input_conn, params):
        # Connect to input SQLite DB
        # Execute SQL query with WHERE clause
        # Create new SQLite DB with results
        # Return preview + metadata
```

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Flow** - Graph visualization
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Lucide Icons** - Icon library
- **Vite** - Build tool

### Backend
- **FastAPI** - Web framework
- **Python 3.11** - Language
- **Pandas** - Data manipulation
- **SQLite** - Data storage
- **Uvicorn** - ASGI server

### Development
- **npm/node** - Package management
- **ESLint** - Linting
- **TypeScript Compiler** - Type checking

## Deployment Considerations

### Production Checklist
- [ ] Replace in-memory storage with PostgreSQL
- [ ] Add user authentication
- [ ] Implement file size limits
- [ ] Add rate limiting
- [ ] Set up proper CORS origins
- [ ] Configure SSL/HTTPS
- [ ] Add logging and monitoring
- [ ] Implement data cleanup jobs
- [ ] Add pipeline version control
- [ ] Set up backup strategy

### Scalability Considerations
- Use Redis for node result caching
- Move SQLite files to object storage (S3)
- Add message queue for long-running pipelines
- Implement pipeline scheduling
- Add worker pool for parallel execution

---

**This architecture enables powerful, visual data transformation pipelines while maintaining simplicity and performance.**

