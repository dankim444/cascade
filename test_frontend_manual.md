# Frontend Manual Test Checklist

## UI Component Tests

### ✅ Test 1: Page Load
- [ ] Open http://localhost:3000
- [ ] Verify page loads without errors
- [ ] Check that header shows "Cascade - Data Transformation Pipeline"
- [ ] Verify NodePalette sidebar is visible
- [ ] Verify WorkflowEditor canvas is visible

### ✅ Test 2: Data Upload
- [ ] Click "Upload Data" button in header
- [ ] Select a CSV file
- [ ] Verify upload progress indicator
- [ ] Check that dataset appears in the datasets list
- [ ] Verify dataset shows row count and column count

### ✅ Test 3: Node Creation
- [ ] Drag "Data Source" from palette to canvas
- [ ] Verify node appears on canvas
- [ ] Drag "Transform" node from palette to canvas
- [ ] Verify transform node appears

### ✅ Test 4: Node Configuration - SELECT
- [ ] Click on a transform node
- [ ] Change operation to "Select"
- [ ] Select columns from dropdown
- [ ] Verify configuration updates

### ✅ Test 5: Node Configuration - FILTER
- [ ] Click on a transform node
- [ ] Change operation to "Filter"
- [ ] Select column, operator, and value
- [ ] Verify configuration updates

### ✅ Test 6: Node Configuration - GROUPBY
- [ ] Click on a transform node
- [ ] Change operation to "GroupBy"
- [ ] Select group columns
- [ ] Add aggregations (column, operation, alias)
- [ ] Verify configuration updates

### ✅ Test 7: Node Configuration - JOIN
- [ ] Click on a transform node
- [ ] Change operation to "Join"
- [ ] Select right table, join columns, and join type
- [ ] Verify configuration updates

### ✅ Test 8: Node Connections
- [ ] Connect data source node to transform node
- [ ] Verify edge appears between nodes
- [ ] Delete edge by selecting and pressing Delete
- [ ] Verify edge is removed

### ✅ Test 9: Pipeline Execution
- [ ] Create a simple pipeline: Data -> Select -> Filter
- [ ] Click "Run Pipeline" button
- [ ] Verify execution completes
- [ ] Check result modal shows output data
- [ ] Verify output shows correct row count

### ✅ Test 10: Pipeline Save/Load
- [ ] Click "Save Pipeline" button
- [ ] Enter pipeline name
- [ ] Verify save success message
- [ ] Refresh page
- [ ] Click "Load Pipeline" button
- [ ] Verify saved pipeline appears in list
- [ ] Load pipeline
- [ ] Verify nodes and edges are restored

## Browser Console Tests

### ✅ Test 11: No Console Errors
- [ ] Open browser DevTools (F12)
- [ ] Check Console tab
- [ ] Verify no red errors (warnings are OK)
- [ ] Interact with UI
- [ ] Verify no new errors appear

### ✅ Test 12: Network Requests
- [ ] Open Network tab in DevTools
- [ ] Upload a file
- [ ] Verify POST /api/upload succeeds (200)
- [ ] Run a pipeline
- [ ] Verify POST /api/transformations/run succeeds (200)
- [ ] Save a pipeline
- [ ] Verify POST /api/pipelines/save succeeds (200)

## Responsive Design Tests

### ✅ Test 13: Window Resize
- [ ] Resize browser window to small size
- [ ] Verify UI remains usable
- [ ] Verify no elements overlap
- [ ] Resize to large size
- [ ] Verify UI scales appropriately

## Data Validation Tests

### ✅ Test 14: Invalid Data Handling
- [ ] Try to run pipeline without data source
- [ ] Verify error message appears
- [ ] Try to configure filter with invalid value
- [ ] Verify validation message

### ✅ Test 15: Large Dataset
- [ ] Upload CSV with 1000+ rows
- [ ] Verify upload completes
- [ ] Run transformation
- [ ] Verify performance is acceptable (< 5 seconds)

---

## Test Summary

**Total Tests:** 15  
**Passed:** ___ / 15  
**Failed:** ___ / 15  

**Status:** ⬜ Not Started | 🔄 In Progress | ✅ All Passed | ❌ Some Failed

**Notes:**
- List any issues found
- List any bugs to fix
- List any improvements needed

