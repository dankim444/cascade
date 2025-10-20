# Quick Test - Node Configuration

## What to Do Right Now

### 1. Start the Application
```bash
cd /Users/yashsamtani2/cascade
./start.sh
```

Wait for both servers to start, then visit: **http://localhost:3000**

### 2. Look for Debug Panel
You should see a **Debug Panel** in the bottom-right corner showing:
- Number of datasets
- Number of data connections  
- Number of nodes

This will help us diagnose the issue!

### 3. Test Workflow

#### Step A: Upload Data
1. Click "Upload Data" button (top-right)
2. Select a CSV file
3. Confirm upload
4. **Check Debug Panel** - Should show: "Datasets: 1"

#### Step B: Create a Node
1. Drag any operation from the left sidebar
2. Drop it on the canvas
3. **What should happen**:
   - A modal appears asking you to select operation type
   - You select an operation (e.g., "Select Columns")
   - A colored node appears on the canvas
4. **Check Debug Panel** - Should show: "Nodes: 1"

#### Step C: Test Node Interaction
With the node on canvas:

1. **Click the colored header** (top part of node)
   - Should expand/collapse the node
   - If it doesn't respond → **Issue with header click**

2. **If node is expanded**, try the form:
   - Click "Add column..." button
   - Should see a dropdown with column names
   - If dropdown doesn't open → **Issue with dropdown**

3. **Try selecting a column**:
   - Click on a column name in dropdown
   - Should appear as a blue chip/tag
   - If nothing happens → **Issue with form interaction**

### 4. Report What You See

Please tell me:
1. **Does the Debug Panel show up?**
   - Yes / No

2. **How many datasets show in Debug Panel after upload?**
   - 0, 1, or more?

3. **Does the modal appear when you drag to canvas?**
   - Yes / No

4. **How many nodes show in Debug Panel after creating one?**
   - 0, 1, or more?

5. **Can you click the node header to expand/collapse?**
   - Yes / No

6. **Can you click "Add column..." button?**
   - Yes / No

7. **Does the dropdown open and show columns?**
   - Yes / No

8. **Can you select a column?**
   - Yes / No

### 5. Check Browser Console

Open browser DevTools:
- Press **F12** (or Cmd+Option+I on Mac)
- Go to **Console** tab
- Look for any **red errors**
- Copy any error messages you see

## What Each Issue Means

### Debug Panel shows "Datasets: 0"
→ Upload didn't work. Check:
- Is backend running on port 8000?
- Check Network tab for failed requests

### Debug Panel shows "Nodes: 0" after dragging
→ Node creation failed. Possible causes:
- Modal didn't appear
- Operation selector broken
- Store not updating

### Node appears but header doesn't click
→ Event handling issue
- Already fixed with `stopPropagation`
- Might need hard refresh (Cmd+Shift+R)

### Header clicks but form doesn't work
→ ReactFlow interference
- Already fixed with `nodrag` class
- Might need hard refresh

### Everything works except specific operations
→ Configuration component issue
- Needs specific fix for that operation

## Quick Fixes to Try

### 1. Hard Refresh Browser
```
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows/Linux)
```

### 2. Clear Browser Cache
```
Chrome: Settings → Privacy → Clear browsing data → Cached images
```

### 3. Restart Dev Server
```bash
# Stop current server (Ctrl+C)
# Then:
cd frontend
npm run dev
```

### 4. Check Backend is Running
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","timestamp":"..."}
```

## What I Need to Know

To help you further, please provide:

1. **Debug Panel numbers** (datasets, connections, nodes)
2. **Which step fails** (upload, modal, node creation, interaction)
3. **Browser console errors** (if any)
4. **Screenshot** (if possible) of:
   - The Debug Panel
   - The canvas with node (if node appears)
   - Browser console errors (if any)

This will help me pinpoint exactly what's wrong! 🎯

