# Join Operation - Complete Guide

## What Was Fixed

✅ **Fixed the bug**: Join now correctly finds the right dataset by `dataKey` instead of `id`
✅ **Added numbered steps**: Clear 1-2-3-4 workflow
✅ **Added helpful hints**: Shows which table you're selecting from
✅ **Added validation messages**: Warns if you need more datasets
✅ **Added preview**: Shows exactly what will be joined
✅ **Better labels**: Makes it crystal clear which dropdown does what

## How to Use Join (Step by Step)

### Step 1: Upload Two Datasets

You need at least 2 datasets to join. For example:
- `customers.csv` - Contains: id, name, email
- `orders.csv` - Contains: order_id, customer_id, amount

### Step 2: Select First Dataset

In the Transform Panel:
1. Select Dataset: Choose `customers.csv`
2. Choose Operation: Click "Join Tables"

### Step 3: Configure the Join

You'll see 4 numbered steps:

#### **1. Join Type**
Choose how to combine the tables:
- **Inner Join** - Only rows that match in both tables
  - Example: Only customers who have orders
- **Left Join** - All from left + matching from right
  - Example: All customers, with their orders if they have any
- **Right Join** - All from right + matching from left
  - Example: All orders, with customer info if available
- **Outer Join** - All rows from both tables
  - Example: All customers and all orders, matched where possible

#### **2. Second Table (Right)**
Select which dataset to join with:
- Dropdown shows all available datasets
- Shows row count and column count for each
- **Note**: You can't select the same dataset you started with

#### **3. Left Column (from first table)**
Select the column from your first dataset (customers):
- Example: Select `id`
- This is what we'll match on from the first table

#### **4. Right Column (from second table)**
Select the column from the second dataset (orders):
- Dropdown is **disabled until you select a second table**
- Once you select second table, this shows columns from that table
- Example: Select `customer_id`
- Label shows which table: "(orders)"

### Step 4: Verify and Run

You'll see a green confirmation box:
```
✓ Ready to join:
Match rows where id = customer_id
```

Click **"Run Transformation"** button!

## Visual Guide

```
┌─────────────────────────────────────┐
│  Join Tables Configuration         │
├─────────────────────────────────────┤
│ ℹ️ Join combines two tables...     │
│                                     │
│ 1. Join Type:                       │
│    [Inner Join ▼]                   │
│                                     │
│ 2. Second Table (Right):            │
│    [orders.csv ▼]                   │
│                                     │
│ 3. Left Column (first table):      │
│    [id ▼]                           │
│                                     │
│ 4. Right Column (second table):    │
│    (orders)                         │
│    [customer_id ▼]                  │
│                                     │
│ ✓ Ready to join:                   │
│   Match rows where id = customer_id │
│                                     │
│ [Run Transformation]                │
└─────────────────────────────────────┘
```

## Example Scenarios

### Scenario 1: Customers with Orders

**Goal**: See which customers have placed orders

**Setup**:
- Left table: `customers.csv` (id, name, email)
- Right table: `orders.csv` (order_id, customer_id, amount)

**Configuration**:
1. Join Type: **Inner Join**
2. Second Table: **orders.csv**
3. Left Column: **id**
4. Right Column: **customer_id**

**Result**: Only customers who have orders, with order details

### Scenario 2: All Customers + Their Orders

**Goal**: List all customers, show orders if they have any

**Setup**: Same tables as above

**Configuration**:
1. Join Type: **Left Join**
2. Second Table: **orders.csv**
3. Left Column: **id**
4. Right Column: **customer_id**

**Result**: All customers, with order details where available (NULL for customers with no orders)

### Scenario 3: Product Sales

**Goal**: Combine product info with sales data

**Setup**:
- Left table: `products.csv` (product_id, product_name, price)
- Right table: `sales.csv` (sale_id, product_id, quantity, date)

**Configuration**:
1. Join Type: **Inner Join**
2. Second Table: **sales.csv**
3. Left Column: **product_id**
4. Right Column: **product_id**

**Result**: Sales with full product information

## Understanding the Result

After joining, you'll see:
- **All columns from both tables**
- **Duplicate column names** get suffixes:
  - `column_name_left` - From first table
  - `column_name_right` - From second table
- **Row count** depends on join type and matches

### Example Result Structure

**Before Join**:

Customers:
| id | name  | email          |
|----|-------|----------------|
| 1  | Alice | alice@mail.com |
| 2  | Bob   | bob@mail.com   |

Orders:
| order_id | customer_id | amount |
|----------|-------------|--------|
| 101      | 1           | 50     |
| 102      | 1           | 75     |
| 103      | 3           | 100    |

**After Inner Join** (id = customer_id):
| id | name  | email          | order_id | customer_id | amount |
|----|-------|----------------|----------|-------------|--------|
| 1  | Alice | alice@mail.com | 101      | 1           | 50     |
| 1  | Alice | alice@mail.com | 102      | 1           | 75     |

Note:
- Bob has no orders (excluded in inner join)
- Order 103 has no matching customer (excluded in inner join)
- Alice appears twice (one row per order)

**After Left Join** (id = customer_id):
| id | name  | email          | order_id | customer_id | amount |
|----|-------|----------------|----------|-------------|--------|
| 1  | Alice | alice@mail.com | 101      | 1           | 50     |
| 1  | Alice | alice@mail.com | 102      | 1           | 75     |
| 2  | Bob   | bob@mail.com   | NULL     | NULL        | NULL   |

Note:
- Bob is included with NULL order values
- Order 103 still excluded (no matching customer)

## Common Issues & Solutions

### Issue 1: "You need at least 2 datasets"
**Solution**: Upload another CSV file first

### Issue 2: Right Column dropdown is empty
**Possible causes**:
- You haven't selected a second table yet
- The second table has no columns (corrupted data)

**Solution**: Select a second table first

### Issue 3: Join returns 0 rows
**Possible causes**:
- No matching values in the join columns
- Wrong columns selected
- Data type mismatch (e.g., "1" vs 1)

**Solution**: 
- Verify the columns have matching values
- Try a Left or Right join to see all data
- Check data types in both columns

### Issue 4: Too many rows in result
**Possible causes**:
- Multiple matches (one-to-many or many-to-many)
- Joining on non-unique columns

**This is normal** if:
- One customer has multiple orders
- One product appears in multiple sales

### Issue 5: Duplicate columns with _left/_right
**This is normal** when:
- Both tables have columns with the same name
- The join column appears in both tables

**Solution**: Use SELECT after joining to keep only needed columns

## Tips & Best Practices

### 1. Join on Primary/Foreign Keys
- Best: `customer.id` ← → `order.customer_id`
- Avoid: Joining on names or descriptions (duplicates!)

### 2. Check Row Counts
- Before join: Note row counts of both tables
- After join: Understand why count changed
- Inner join ≤ smaller table
- Left join = left table (usually)

### 3. Choose Right Join Type
- **Default to Inner Join** - Safest, only matched data
- **Use Left Join** - When you want all from main table
- **Use Right Join** - Rarely needed (just swap tables)
- **Use Outer Join** - When you need everything

### 4. Chain Operations
After joining:
1. **SELECT** - Remove duplicate/unwanted columns
2. **FILTER** - Keep only relevant rows
3. **SORT** - Order by date or amount
4. **GROUP BY** - Aggregate the joined data

## Technical Details

### Backend Implementation
File: `backend/app/transformations/executor_fixed.py`
Function: `_execute_join()`

**How it works**:
1. Loads both tables from SQLite
2. Uses pandas `merge()` for flexibility
3. Supports all join types
4. Adds suffixes for duplicate columns
5. Saves result to new SQLite database

### Config Format
```json
{
  "joinType": "inner",
  "leftColumn": "id",
  "rightColumn": "customer_id",
  "rightTable": "data_xyz123"  // dataKey of second dataset
}
```

## Summary

✅ **Join is now fully functional and user-friendly!**

Key improvements:
- Fixed dataset lookup bug
- Added clear numbered steps
- Shows which table you're selecting from
- Validates configuration
- Previews the join before running
- Provides helpful error messages

Users can now easily join tables without confusion! 🎉

