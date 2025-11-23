# Cascade Pipeline System - User Guide

## Overview

Cascade now features a **visual, graph-based data pipeline system** that allows you to build complex data transformations through an intuitive node-based interface. Each transformation is represented as a node, and edges between nodes represent the flow of data through your pipeline.

## Key Features

### 🎨 Visual Pipeline Editor
- **Drag-and-drop interface** for building data pipelines
- **Node-based transformations** - each operation is a visual node
- **Real-time canvas** with zoom, pan, and minimap
- **Edge connections** showing data flow between operations

### 📊 Data Source Nodes
- Upload CSV files as data sources
- Each dataset becomes a **blue data source node**
- Shows row count and column count
- Can be used multiple times in different pipelines

### 🔧 Transformation Nodes
- **Select** - Choose specific columns
- **Filter** - Filter rows based on conditions
- **Group By** - Aggregate data with sum, mean, count, etc.
- **Join** - Combine datasets (inner, left, right, outer)
- **Sort** - Order data by column
- **Rename** - Rename columns
- **Calculate** - Create calculated columns with expressions

### 🔄 Pipeline Execution
- **Run entire pipeline** - Execute all transformations from start to finish
- **View intermediate results** - Click any node and "View Output" to see data at that point
- **Status indicators** - See which nodes are running, completed, or have errors
- **Go back to any state** - Click earlier nodes to see raw or intermediate data

### 💾 Pipeline State Management
- **Save pipeline** - Export your pipeline as JSON
- **Node history** - Each execution stores results
- **Reusable transformations** - Clone and modify nodes

## How to Use

### 1. Upload Data
1. Click **"Upload Data"** button in the top right
2. Select a CSV file
3. Review the preview and confirm
4. Your dataset is now available as a data source

### 2. Build Your Pipeline

#### Add Data Source Node
1. Click **"Add Node"** → Select from "Data Sources"
2. Place the node on the canvas
3. This represents your raw data

#### Add Transformation Nodes
1. Click **"Add Node"** → Select from "Transformations"
2. Choose an operation (filter, select, etc.)
3. **Connect nodes** by dragging from the right handle of one node to the left handle of another
4. **Configure the node** by clicking it to open the configuration panel

### 3. Configure Transformations

When you click a transformation node, the configuration panel opens on the right:

- **Select**: Check boxes for columns you want to keep
- **Filter**: Choose column, operator (=, !=, >, <, contains), and value
- **Group By**: Select grouping columns and add aggregations
- **Join**: Select second dataset and matching columns
- **Sort**: Pick column and sort order (ascending/descending)
- **Rename**: Map old column names to new ones
- **Calculate**: Write expressions like `column_a + column_b * 2`

### 4. Execute and View Results

#### Run Full Pipeline
- Click **"Run Pipeline"** in the top-right panel
- The entire pipeline executes from start to finish
- Results viewer shows the final output

#### View Intermediate Results
- Click any transformation node
- Click **"View Output"** button
- See the data state at that specific point
- **This lets you debug and verify each step!**

### 5. Iterate and Refine
- Modify node configurations
- Add or remove nodes
- Reconnect edges to change the flow
- Re-run to see updated results

## Example Workflows

### Simple Filter Pipeline
```
[Sales Data] → [Filter: Region = "West"] → [Results]
```

### Complex Analytics Pipeline
```
[Orders] → [Filter: Date > 2024] → [Group By: Customer] 
         ↓
    [Sum(Amount), Count(*)] → [Sort by Sum DESC] → [Top 10 Customers]
```

### Multi-Source Join
```
[Customers] ─┐
              ├→ [Join: customer_id] → [Select Columns] → [Results]
[Orders] ────┘
```

## Tips & Best Practices

1. **Name your nodes** - Use descriptive labels to track what each transformation does
2. **Test incrementally** - Use "View Output" to verify each step works correctly
3. **Start simple** - Build small pipelines first, then add complexity
4. **Save frequently** - Export your pipeline JSON for backup
5. **Use data node multiple times** - One dataset can feed multiple transformation branches

## Graph Navigation

- **Pan**: Click and drag on empty canvas space
- **Zoom**: Use mouse wheel or controls in bottom-right
- **Select**: Click nodes to select and configure them
- **Delete**: Select node and click "Delete" button
- **Minimap**: Use the overview in bottom-right to navigate large pipelines

## Technical Details

### Pipeline Execution Model
- Pipelines execute as **Directed Acyclic Graphs (DAGs)**
- Each node depends on its parent nodes
- Execution follows topological order
- Results are cached per node for re-viewing

### Data Storage
- Each transformation creates a new SQLite database
- Original data is never modified
- Intermediate results are stored in `backend/data/`
- Allows instant access to any pipeline state

### Supported File Types
- CSV files (up to 100MB)
- Excel files (.xlsx, .xls)

## Troubleshooting

**Issue**: Can't connect nodes
- **Solution**: Make sure you're dragging from a source handle (right side) to a target handle (left side)

**Issue**: Transformation fails
- **Solution**: Check node configuration - ensure columns exist and values are correct

**Issue**: "View Output" shows error
- **Solution**: Verify all parent nodes execute successfully and data flows correctly

**Issue**: Nodes not showing up
- **Solution**: Upload at least one dataset first before adding transform nodes

## Future Enhancements

- [ ] Pipeline templates and sharing
- [ ] Branching pipelines (multiple outputs)
- [ ] Undo/redo support
- [ ] Auto-layout for nodes
- [ ] Pipeline version control
- [ ] Collaboration features

---

**Enjoy building powerful data pipelines with Cascade!** 🚀

