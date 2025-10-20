# Cascade - User Guide

## Quick Start Guide

### 1. Starting the Application

```bash
# Start both frontend and backend
./start.sh

# Or using npm
npm start
```

Access the application at: **http://localhost:3000**

---

## Step-by-Step Workflow

### Step 1: Upload Your Data

1. Click the **"Upload Data"** button in the top-right corner
2. Drag & drop a CSV file or click to browse
3. Review the data preview:
   - Column names and types
   - First 10 rows of data
   - Row count
4. Click **"Confirm Upload"**

**Tip**: You can upload multiple datasets for joining!

---

### Step 2: Create Transform Nodes

1. Look at the **left sidebar** - it shows all available transform operations
2. **Drag** an operation from the sidebar onto the canvas
3. A modal will appear:
   - If you have multiple datasets, select which one to use
   - Choose the operation type (Select, Filter, Group By, Join, Sort)
4. The node appears on the canvas!

**Available Operations**:
- 🔵 **Select Columns** - Choose which columns to keep
- 🟣 **Filter Rows** - Keep only rows matching conditions
- 🟢 **Group By** - Group data and calculate aggregations
- 🟠 **Join Tables** - Combine multiple datasets
- 🩷 **Sort** - Sort data by column

---

### Step 3: Configure Each Node

1. **Click on a node** to expand its configuration
2. Use the **dropdown menus** to select columns
   - All dropdowns are pre-populated with actual column names!
3. Configure the operation:

#### Select Columns
- Click "Add column..." to see available columns
- Click column names to add them
- Click ❌ on chips to remove columns
- Empty = select all columns

#### Filter Rows
- **Column**: Pick which column to filter on
- **Operator**: Choose comparison (=, ≠, >, <, Contains)
- **Value**: Enter the filter value

#### Group By & Aggregate
- **Check boxes** for columns to group by
- Click **"+ Add Aggregation"** to add calculations:
  - Column to aggregate
  - Operation (Sum, Mean, Count, Min, Max)
  - Alias for the result column
- Click ❌ to remove aggregations

#### Join Tables
- **Join Type**: Inner, Left, Right, or Outer
- **Right Table**: Pick another dataset
- **Left Column**: Column from current dataset
- **Right Column**: Column from right dataset

#### Sort
- **Column**: Pick column to sort by
- **Order**: Ascending (↑) or Descending (↓)

---

### Step 4: Connect Nodes

1. **Hover over a node** - you'll see small circles (handles)
   - **Top handle** = input
   - **Bottom handle** = output
2. **Click and drag** from bottom handle
3. **Drop on top handle** of another node
4. An animated edge appears showing data flow!

**Flow Direction**: Data flows from top to bottom

---

### Step 5: Run Your Pipeline

1. Click the **"Run Pipeline"** button in the top-right
2. Watch the button show a loading spinner
3. You'll see an alert with results:
   - ✅ Success: Shows output row count
   - ❌ Error: Shows error message
4. Check the **browser console** (F12) for detailed results

---

## Tips & Tricks

### 💡 Collapsible Nodes
- Click the **node header** to collapse/expand configuration
- Saves screen space when working with many nodes

### 💡 Multiple Datasets
- Upload multiple CSV files
- Use the Join operation to combine them
- Each node can operate on different datasets

### 💡 Pipeline Execution Order
- The system automatically determines the correct execution order
- Just connect nodes in logical flow
- No need to worry about execution sequence!

### 💡 Visual Feedback
- **Blue ring** = Selected node
- **Animated edges** = Data flow connections
- **Colored nodes** = Each operation has a unique color
- **Minimap** (bottom-right) = Overall view of your pipeline

### 💡 Delete Nodes
- Select a node
- Press **Delete** or **Backspace** key
- Node and its connections will be removed

### 💡 Zoom & Pan
- **Mouse wheel** = Zoom in/out
- **Click & drag** on empty space = Pan around
- **Controls** (bottom-left) = Zoom controls and fit view

---

## Example Workflows

### Example 1: Simple Filtering
1. Upload a sales dataset
2. Add a **Filter** node
3. Configure: `amount > 1000`
4. Run pipeline
5. Result: Only sales over $1000

### Example 2: Aggregation
1. Upload customer data
2. Add a **Group By** node
3. Group by: `country`
4. Add aggregation: `COUNT(customer_id)` as `total_customers`
5. Run pipeline
6. Result: Customer count per country

### Example 3: Complex Pipeline
1. Upload two datasets: `customers` and `orders`
2. Add **Join** node
   - Join `customers.id` with `orders.customer_id`
3. Add **Filter** node
   - Filter: `order_date >= 2024-01-01`
4. Add **Group By** node
   - Group by: `customer_name`
   - Aggregate: `SUM(order_amount)` as `total_spent`
5. Add **Sort** node
   - Sort by: `total_spent` descending
6. Run pipeline
7. Result: Top customers by spending in 2024!

---

## Keyboard Shortcuts

- **Delete/Backspace** - Delete selected node(s)
- **Ctrl/Cmd + Z** - Undo (browser)
- **Ctrl/Cmd + Mouse Wheel** - Zoom
- **Space + Drag** - Pan canvas

---

## Troubleshooting

### "No columns available"
- Make sure you've uploaded a dataset first
- Check that the dataset uploaded successfully

### "Pipeline execution failed"
- Check that all nodes are properly configured
- Verify column names match your data
- Look at browser console (F12) for detailed errors

### Nodes won't connect
- Make sure you're dragging from bottom handle to top handle
- Can't connect a node to itself
- Check for circular dependencies

### Changes not saving
- Changes save automatically when you modify a node
- If node closes immediately, try expanding it again

---

## Getting Help

- Check the **sidebar instructions** for quick tips
- Open **browser console** (F12) for detailed logs
- Read error messages carefully - they're helpful!

---

## Have Fun! 🎉

You now have a powerful visual data transformation tool at your fingertips. Build complex pipelines, transform your data, and discover insights!

