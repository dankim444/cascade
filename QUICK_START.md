# Quick Start Guide - Visual Pipeline

## Get Running in 2 Minutes ⚡

### 1. Start the Application
```bash
cd /Users/yashsamtani2/cascade

# Install dependencies (first time only)
npm run install-all

# Start both frontend and backend
npm start
```

### 2. Open the Application
- Frontend: http://localhost:5173 (or 3000, 3001, 3002)
- The visual pipeline editor will load automatically

### 3. Build Your First Pipeline

#### Step 1: Upload Data
1. Click **"Upload Data"** button (top right)
2. Choose a CSV file (any CSV works - sales data, customer data, etc.)
3. Review the preview
4. Click **"Confirm Upload"**

#### Step 2: Add Data Source Node
1. Click **"Add Node"** button
2. Under "Data Sources", click your uploaded dataset
3. A blue node appears on the canvas - this is your raw data

#### Step 3: Add a Filter Transformation
1. Click **"Add Node"** button again
2. Under "Transformations", click **"filter"**
3. A purple node appears on the canvas

#### Step 4: Connect the Nodes
1. Click and drag from the **right handle** of the data node
2. Drop on the **left handle** of the filter node
3. An animated line appears showing the connection

#### Step 5: Configure the Filter
1. Click the filter node (it highlights)
2. A configuration panel opens on the right
3. Choose:
   - **Column**: Select any column from your data
   - **Operator**: Choose "equals", "greater_than", "contains", etc.
   - **Value**: Enter a value to filter by
4. Click **"Save Configuration"**

#### Step 6: Run the Pipeline
1. Click **"Run Pipeline"** button (in the top-right panel on canvas)
2. Watch the nodes light up as they execute
3. A results viewer appears showing your filtered data
4. Click **"Download CSV"** to save the results

### 4. Try More Operations

#### Add a Select (Column Selection)
1. Add another transform node → select "select"
2. Connect it after the filter
3. Click it and check which columns to keep
4. Run again to see only selected columns

#### Add a Sort
1. Add transform node → select "sort"
2. Connect it to the chain
3. Choose column and order (ascending/descending)
4. Run to see sorted results

#### Add a Group By (Aggregation)
1. Add transform node → select "groupby"
2. Connect it to the chain
3. Check columns to group by
4. Add aggregations (Sum, Mean, Count, etc.)
5. Run to see aggregated data

## Example Workflows

### Simple: Filter and Select
```
[Sales Data] → [Filter: Region = "West"] → [Select: Name, Amount] → [Results]
```

### Medium: Filter, Group, Sort
```
[Orders] → [Filter: Date > 2024] 
         → [Group By: Customer, Sum(Amount)] 
         → [Sort: Sum DESC] 
         → [Top Customers]
```

### Advanced: Multiple Sources
```
[Customers]─┐
             ├→ [Join: customer_id] → [Filter] → [Group By] → [Results]
[Orders]────┘
```

## Tips for Success

### Navigation
- **Pan**: Click and drag empty space
- **Zoom**: Use mouse wheel or controls (bottom-right)
- **Select Node**: Click on any node
- **Delete Node**: Select node, click "Delete" button

### Configuration
- Always save your configuration after editing
- Use descriptive node labels
- Check available columns in the dropdown

### Execution
- **Run Pipeline**: Executes everything
- **View Output**: Click a node, then click "View Output" to see just that step
- **Check Status**: Green = success, Red = error, Yellow = running

### Debugging
- Use "View Output" to check intermediate results
- If a node fails, check its configuration
- Make sure columns exist in the data
- Verify connections are correct

## Common Issues

**Problem**: Can't connect nodes
- **Solution**: Drag from right handle (source) to left handle (target)

**Problem**: Node configuration not saving
- **Solution**: Click "Save Configuration" button after editing

**Problem**: Pipeline fails to execute
- **Solution**: 
  - Check all nodes are configured
  - Verify column names match your data
  - Make sure nodes are connected in the right order

**Problem**: No data sources available
- **Solution**: Upload a CSV file first using "Upload Data" button

## Sample Data for Testing

If you don't have data ready, create a simple CSV:

**sales.csv**
```csv
Name,Region,Amount,Date
Alice,West,100,2024-01-15
Bob,East,150,2024-01-16
Carol,West,200,2024-01-17
Dave,East,120,2024-01-18
Eve,West,180,2024-01-19
```

Save this as `sales.csv` and upload it!

## Next Steps

Once comfortable with the basics:

1. **Read PIPELINE_GUIDE.md** - Comprehensive guide with all features
2. **Try all 7 operations** - select, filter, groupby, join, sort, rename, calculate
3. **Build complex pipelines** - Multi-step transformations
4. **Save your work** - Use "Save" button to export pipeline as JSON
5. **Experiment** - Try different configurations and see results

## Video Walkthrough (If Available)

_[Coming soon - Will include screen recording of building a pipeline]_

## Need Help?

- Check **PIPELINE_GUIDE.md** for detailed documentation
- See **ARCHITECTURE.md** for technical details
- Review **TROUBLESHOOTING.md** for common issues
- Read **WHATS_NEW_PIPELINE.md** for feature overview

---

**Happy pipeline building! 🚀**

