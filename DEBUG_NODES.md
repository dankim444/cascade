# Debug Guide: Node Configuration Not Working

## Quick Diagnosis

Follow these steps to identify the issue:

### Step 1: Check if Nodes Are Created
1. Upload a dataset
2. Drag a transform operation to canvas
3. **Expected**: Modal appears asking you to select operation type
4. **If modal doesn't appear**: Issue with node creation

### Step 2: Check if Nodes Are Visible
1. After selecting operation in modal
2. **Expected**: Node appears on canvas with colored header
3. **If node doesn't appear**: Check browser console (F12) for errors

### Step 3: Check if Header is Clickable
1. Click on the colored header of the node
2. **Expected**: Node should expand/collapse
3. **If doesn't expand**: Event handling issue

### Step 4: Check if Form Elements Work
1. With node expanded, try to:
   - Click on a dropdown
   - Type in an input field
   - Click a button
2. **Expected**: All should work normally
3. **If doesn't work**: ReactFlow interference issue

## Common Issues & Solutions

### Issue 1: Modal Doesn't Appear

**Symptoms**: You drag to canvas but nothing happens

**Solutions**:
```bash
# 1. Check browser console for errors (F12)
# 2. Verify dev server is running
cd frontend
npm run dev

# 3. Check if files are being served
curl http://localhost:3000
```

### Issue 2: Node Doesn't Appear After Modal

**Symptoms**: You select operation but no node appears

**Check**:
1. Open browser console (F12)
2. Look for errors mentioning:
   - `TransformNode`
   - `undefined is not a function`
   - `Cannot read property of undefined`

**Solution**:
```bash
# Restart dev server
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Restart
cd frontend
npm run dev
```

### Issue 3: Header Not Clickable

**Symptoms**: Clicking header doesn't expand/collapse node

**Debug**:
1. Open React DevTools
2. Find TransformNode component
3. Check if `isExpanded` state exists
4. Check if `onClick` handler is attached to header

**Verify Fix Applied**:
```bash
# Check if nodrag class is present
grep -n "nodrag" frontend/src/components/nodes/TransformNode.tsx

# Should show line with: <div className="p-4 nodrag">
```

### Issue 4: Form Elements Not Working

**Symptoms**: Can't click dropdowns, type in inputs, or click buttons

**This is the MAIN issue - here's the fix**:

Check that these are in place in `TransformNode.tsx`:

1. **Content div has `nodrag` class**:
```tsx
<div className="p-4 nodrag">
  {/* Content here */}
</div>
```

2. **Config components have `onMouseDown` handler**:
```tsx
<div className="space-y-3" onMouseDown={(e) => e.stopPropagation()}>
  {/* Form elements here */}
</div>
```

3. **Buttons have `stopPropagation`**:
```tsx
<button onClick={(e) => {
  e.stopPropagation();
  // handle click
}}>
```

### Issue 5: Dropdowns Don't Open

**Symptoms**: Clicking dropdown button does nothing

**Check z-index**:
```tsx
// Dropdown should have z-50 or higher
<div className="absolute z-50 w-full mt-1 bg-white ...">
```

### Issue 6: Changes Don't Save

**Symptoms**: Configure node but settings reset

**Debug Store**:
```javascript
// In browser console:
window.__REACT_DEVTOOLS_GLOBAL_HOOK__

// Or add console.log in onUpdate function
```

## Manual Verification

### 1. Check Files Exist
```bash
cd /Users/yashsamtani2/cascade

# Check Transform Node
ls -la frontend/src/components/nodes/TransformNode.tsx

# Check Operation Selector
ls -la frontend/src/components/TransformOperationSelector.tsx

# Check Workflow Editor
ls -la frontend/src/components/WorkflowEditor.tsx
```

### 2. Verify Imports
```bash
# Check for import errors
cd frontend
npm run build

# If errors, check:
# - All imports use 'import type' for types
# - No circular dependencies
```

### 3. Check ReactFlow Setup
```bash
# Verify ReactFlow is installed
cd frontend
npm list reactflow

# Should show: reactflow@11.11.4 (or similar)
```

### 4. Verify CSS
```bash
# Check if ReactFlow CSS is imported
grep -n "reactflow/dist/style.css" frontend/src/index.css

# Should show import at top of file
```

## Browser Console Commands

Open browser console (F12) and run:

```javascript
// 1. Check if store has nodes
const store = window.__ZUSTAND_STORE__; // if exposed
console.log('Nodes:', store?.nodes);

// 2. Check React DevTools
// Click on TransformNode component
// Look at Props and State
// Verify:
//   - data.node exists
//   - data.onUpdate is a function
//   - isExpanded state exists

// 3. Check for errors
// Look in Console tab for red errors

// 4. Test event handling
document.querySelector('.nodrag')?.addEventListener('click', (e) => {
  console.log('Nodrag clicked!', e);
});
```

## Step-by-Step Test

1. **Start Fresh**:
```bash
# Stop all servers
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Start clean
./start.sh
```

2. **Open Browser**:
   - Visit http://localhost:3000
   - Open DevTools (F12)
   - Go to Console tab

3. **Upload Data**:
   - Click "Upload Data"
   - Select a CSV file
   - Confirm upload
   - **Check console**: Should see success message

4. **Create Node**:
   - Drag "Select Columns" from sidebar
   - Drop on canvas
   - **Check**: Modal should appear
   - Select operation (e.g., "Select Columns")
   - **Check**: Node should appear

5. **Test Interaction**:
   - Click node header
   - **Check**: Should expand/collapse
   - Click "Add column..." button
   - **Check**: Dropdown should open
   - Click a column name
   - **Check**: Should appear as chip

6. **Check Network**:
   - Go to Network tab
   - Click "Run Pipeline"
   - **Check**: Should see POST to `/api/transformations/run`

## If Still Not Working

### Nuclear Option - Full Reset
```bash
cd /Users/yashsamtani2/cascade

# Clean everything
rm -rf frontend/node_modules frontend/dist
rm -rf backend/venv backend/data/*.db

# Reinstall
cd frontend
npm install

cd ../backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start fresh
cd ..
./start.sh
```

### Report Issue
If none of this works, please provide:
1. Browser console errors (screenshot or copy)
2. React DevTools component tree screenshot
3. Network tab showing any failed requests
4. Browser and version (Chrome, Firefox, etc.)

## Expected Behavior

✅ **Working correctly**:
- Modal appears when you drag operation
- Node appears after selecting operation
- Header expands/collapses on click
- Dropdowns open and show columns
- Can select columns (appear as chips)
- Can type in input fields
- Can click buttons to add/remove items
- Run Pipeline button executes correctly

❌ **Not working**:
- Any of the above doesn't work
- Console shows errors
- Node doesn't respond to clicks

