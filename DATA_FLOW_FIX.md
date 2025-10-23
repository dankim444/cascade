# Data Flow Fix - Proper Node-to-Node Data Chaining

## Issue
Each transformation node was pulling data from the original data source instead of from its parent node in the graph. The edges weren't being followed properly for data flow.

## Root Cause
The pipeline execution wasn't tracking which node's output should be used as input for the next node. When building the pipeline request, all transform nodes were referencing the original data source instead of their parent node's output.

## Solution Implemented

### 1. Frontend: Enhanced Graph Traversal (`useWorkflowStore.ts`)

**Key Changes:**
- Modified `executeToNode` to properly track parent-child relationships through edges
- Each node now checks its incoming edge to determine its input data source
- If parent is a `dataNode`, use its `dataKey`
- If parent is a `transformNode`, use the parent node's ID (backend will map to output)

```typescript
// Find the parent edge
const parentEdge = state.flowEdges.find(e => e.target === node.id);

// Determine input data key
let inputDataKey: string;
if (parentEdge) {
  const parentNode = state.flowNodes.find(n => n.id === parentEdge.source);
  if (parentNode?.type === 'dataNode') {
    // Parent is a data source
    inputDataKey = parentNode.data.dataKey;
  } else {
    // Parent is a transform - use its output
    inputDataKey = parentEdge.source; // Backend will resolve this
  }
}
```

**Added Logging:**
- Console logs show execution path
- Display which nodes are being executed in order
- Show the complete pipeline request being sent to backend

### 2. Backend: Dynamic Data Connection Tracking (`executor_fixed.py`)

**Key Changes:**
- Track `node_outputs` map: `node_id → output_data_key`
- When executing each node, check if parent exists in `node_outputs`
- If yes, use parent's output database as input
- If no, use the data source key from the node
- After each node executes, add its output as a new data connection

```python
for node in execution_order:
    node_id = node.get('id', 'unknown')
    
    # Determine input data key
    parent_id = node.get('parent')
    if parent_id and parent_id in node_outputs:
        # Use output from parent transform node
        input_data_key = node_outputs[parent_id]
    else:
        # Use the data key from the node (data source)
        input_data_key = node.get('data')
    
    # Execute the transformation
    result = self._execute_node(node, input_data_key, data_connections)
    
    # Store output for child nodes
    output_key = result['output_data_key']
    node_outputs[node_id] = output_key
    
    # Add the output as a new data connection
    new_connection = {
        'dataKey': output_key,
        'sqlConnection': f"data/{output_key}.db",
        'schema': {'columns': result.get('output_schema', [])},
        'rowCount': result.get('row_count', 0)
    }
    data_connections.append(new_connection)
```

**Added Debug Logging:**
- Print which input each node is using
- Show parent-child relationships
- Display output keys for tracking

### 3. Visual: Directed Edges with Arrows (`PipelineCanvas.tsx`)

**Added Arrow Markers:**
- Edges now show direction with arrowheads
- Makes data flow direction visually obvious
- Uses React Flow's `markerEnd` property

```typescript
const newEdge = {
  ...params,
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#94a3b8', strokeWidth: 2 },
  markerEnd: {
    type: 'arrowclosed' as const,
    color: '#94a3b8',
  },
};
```

## Data Flow Example

### Before Fix
```
Data Source (1000 rows)
    ↓
Filter Node → reads from Data Source (1000 rows) ❌
    ↓
Select Node → reads from Data Source (1000 rows) ❌
```

### After Fix
```
Data Source (1000 rows)
    ↓ (directed edge)
Filter Node → reads from Data Source (1000 rows) ✓
    ↓ (directed edge)
    Output: filter_20241023.db (250 rows)
    ↓
Select Node → reads from filter_20241023.db (250 rows) ✓
    ↓
    Output: select_20241023.db (250 rows, 3 columns)
```

## How It Works Now

### Step-by-Step Execution

1. **User Builds Graph**
   ```
   [Sales Data] → [Filter: Amount > 100] → [Select: Name, Amount]
   ```

2. **Frontend Sends Pipeline**
   ```json
   {
     "nodes": [
       {
         "id": "filter-1",
         "transform": {"operation": "filter", ...},
         "data": "data_abc123",  // Original data source
         "parent": "data-node-1",
         "child": "select-1"
       },
       {
         "id": "select-1",
         "transform": {"operation": "select", ...},
         "data": "filter-1",  // References parent node!
         "parent": "filter-1",
         "child": null
       }
     ],
     "dataConnections": [
       {"dataKey": "data_abc123", "sqlConnection": "data/data_abc123.db", ...}
     ]
   }
   ```

3. **Backend Executes**
   - **Node filter-1:**
     - Parent not in outputs yet
     - Uses `data: "data_abc123"` → reads from original data
     - Executes filter
     - Outputs to `filter_20241023.db`
     - Stores: `node_outputs["filter-1"] = "filter_20241023"`
     - Adds to connections: `{"dataKey": "filter_20241023", ...}`
   
   - **Node select-1:**
     - Parent "filter-1" exists in `node_outputs`
     - Uses `node_outputs["filter-1"]` = "filter_20241023"
     - Reads from `data/filter_20241023.db` ✓
     - Executes select on filtered data
     - Outputs to `select_20241023.db`

4. **Result**
   - Each node operated on the correct input
   - Data flowed through the graph properly
   - Final result shows only filtered + selected data

## Benefits

### Correct Data Flow
- ✅ Each node processes output from its parent
- ✅ Transformations build on each other properly
- ✅ Results are cumulative through the pipeline

### Visual Clarity
- ✅ Arrows show data flow direction
- ✅ Easy to see which nodes feed into others
- ✅ Directed graph is immediately recognizable

### Debugging
- ✅ Console logs show execution path
- ✅ Can verify which data each node reads
- ✅ Track intermediate outputs

### Flexibility
- ✅ Support complex graphs with branches
- ✅ Multiple transforms can chain together
- ✅ Proper parent-child relationships

## Testing the Fix

### Test Case 1: Linear Pipeline
```
[Data] → [Filter] → [Select] → [Sort]
```

**Expected:**
- Filter operates on Data
- Select operates on Filter's output
- Sort operates on Select's output

### Test Case 2: Filter Chain
```
[Data] → [Filter: Region=West] → [Filter: Amount>100] → [Results]
```

**Expected:**
- First filter: 1000 rows → 400 rows (West region)
- Second filter: 400 rows → 150 rows (Amount > 100)
- Not 1000 → 600 rows (which would happen if both read from source)

### Test Case 3: Branch (Future Support)
```
[Data] → [Filter] → [Select A]
              ↓
         [Select B]
```

**Expected:**
- Both Select nodes read from Filter's output
- Each gets the filtered data

## Verification

Check the browser console when running a pipeline:
```
Executing to node: select-1
Execution path: ["data-node-1 (dataNode)", "filter-1 (transformNode)", "select-1 (transformNode)"]
Pipeline request: {...}
```

Check the backend logs:
```
Node filter-1 using data source: data_abc123
Node filter-1 completed, output: filter_20241023_120000
Node select-1 using parent output: filter_20241023_120000
Node select-1 completed, output: select_20241023_120001
```

## Files Modified

1. **Frontend:**
   - `frontend/src/store/useWorkflowStore.ts` - Enhanced `executeToNode`
   - `frontend/src/components/PipelineCanvas.tsx` - Added directed arrows

2. **Backend:**
   - `backend/app/transformations/executor_fixed.py` - Dynamic connection tracking

## Impact

This fix ensures that the visual pipeline actually represents the data flow. Without this fix, all nodes would independently transform the original data, making the pipeline graph misleading. Now the graph is a true representation of how data flows and transforms through your pipeline.

---

**The pipeline now correctly chains transformations, with each node building upon the output of its parent!** 🎯

