# Testing Group By → Sort with Aggregated Columns

## What Was Fixed

The frontend now shows aggregated columns (like `sum_sales`, `avg_price`) in the sort dropdown when configuring a sort node that comes after a group by operation.

## How It Works

1. When you execute a pipeline with a group by, the backend returns the output schema including the new aggregated columns
2. The frontend stores this output schema for each executed node
3. When you configure a downstream transformation (like sort), it now checks the parent node's output schema first
4. If the parent has been executed and has an output schema, those columns are shown in the dropdown

## Test Steps

### 1. Create Sample Data (if needed)

Create a CSV file called `sales.csv`:
```csv
Region,Salesperson,Amount,Month
West,Alice,1000,January
West,Bob,1500,January
East,Carol,2000,January
East,Dave,1200,January
West,Alice,1100,February
East,Carol,2200,February
```

### 2. Build the Pipeline

1. **Upload the data**: Click "Upload Data" and select `sales.csv`
2. **Add Data Source Node**: Click "Add Node" → Select your uploaded dataset
3. **Add Group By Node**: Click "Add Node" → Select "groupby"
4. **Connect them**: Draw an edge from the data node to the group by node
5. **Configure Group By**:
   - Click the group by node
   - Group By: Select "Region"
   - Aggregations: Click "Add Aggregation"
     - Column: Amount
     - Operation: Sum
     - Alias: `total_sales` (or leave blank for `sum_Amount`)
   - Click "Save Configuration"

### 3. Execute to Group By

1. Click the group by node
2. In the right panel, click "View Output" or "Execute to Node"
3. Wait for execution to complete (node should turn green)
4. Verify the results show grouped data with the new `total_sales` (or `sum_Amount`) column

### 4. Add Sort Node

1. **Add Sort Node**: Click "Add Node" → Select "sort"
2. **Connect them**: Draw an edge from the group by node to the sort node
3. **Configure Sort**: Click the sort node
4. **🎯 THE FIX**: In the "Column" dropdown, you should now see:
   - `Region` (original column)
   - `total_sales` or `sum_Amount` (the aggregated column!)
5. Select the aggregated column
6. Choose order (Ascending/Descending)
7. Click "Save Configuration"

### 5. Execute Full Pipeline

1. Click "Run Pipeline" button
2. Verify the results are sorted by the aggregated column

## Before the Fix

- The sort dropdown would only show `Region` and `Salesperson` (original columns)
- You'd have to manually type `sum_Amount` to sort by it
- No way to know what the aggregated column was named

## After the Fix

- The sort dropdown shows all columns including `sum_Amount` or `total_sales`
- You can select it from the dropdown like any other column
- Works for all aggregation types: sum, avg, count, min, max

## Technical Details

**File Changed**: `frontend/src/components/NodeConfigPanel.tsx`

**Key Changes**:
- Imports `useWorkflowStore` to access `flowEdges` and `getNodeResult`
- `getAvailableColumns()` now:
  1. Finds the parent node via edges
  2. Checks if parent has execution results with output schema
  3. Uses parent's output schema if available
  4. Falls back to original dataset columns if not

**Data Flow**:
```
Group By Node → Backend executes → Returns output_schema with aggregated columns
                                  ↓
                     Store saves in nodeResults Map
                                  ↓
                     Sort Node reads parent's outputSchema
                                  ↓
                     Dropdown shows aggregated columns!
```

## Other Transformations That Benefit

This fix also helps with:
- **Calculate** → Sort (sort by calculated columns)
- **Rename** → Filter (use renamed columns)
- **Join** → Any downstream operation (use joined columns with `_left`/`_right` suffixes)
- Any transformation chain where columns change

## Notes

- You must **execute the parent node** before the child node will see the new columns
- If you haven't executed yet, you'll see the original dataset columns
- After execution, the dropdown updates automatically when you open the config panel

