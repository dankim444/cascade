# Troubleshooting Guide

## Common Issues and Solutions

### 🔴 Application Won't Start

#### Problem: `./start.sh` command fails
**Solution:**
```bash
# Make the script executable
chmod +x start.sh

# Then run it
./start.sh
```

#### Problem: Port 3000 or 8000 already in use
**Solution:**
```bash
# Find and kill the process using the port
# On macOS/Linux:
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Then restart
./start.sh
```

#### Problem: Python virtual environment issues
**Solution:**
```bash
cd backend
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

### 🟡 Frontend Issues

#### Problem: "Module not found" errors
**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Problem: TypeScript errors about types
**Solution:**
- The type exports have been fixed
- Make sure you're using `import type` for types
- Check that all files use the correct import syntax

#### Problem: White screen / Nothing loads
**Solution:**
1. Open browser console (F12)
2. Check for errors
3. Make sure backend is running on port 8000
4. Try clearing browser cache and hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

---

### 🟠 Data Upload Issues

#### Problem: "Failed to process file"
**Possible causes:**
1. **File is not CSV** - Make sure it's a .csv file
2. **File is too large** - Max 100MB
3. **File encoding issues** - Make sure it's UTF-8 encoded
4. **Malformed CSV** - Check for consistent columns

**Solution:**
- Try opening the CSV in Excel/Google Sheets first
- Save it again as CSV UTF-8
- Check that all rows have the same number of columns

#### Problem: Columns not showing up correctly
**Solution:**
- Make sure the CSV has a header row
- Column names should be in the first row
- No special characters in column names (or use quotes)

---

### 🔵 Transform Node Issues

#### Problem: "No columns available" in dropdowns
**Solution:**
1. Make sure you uploaded a dataset first
2. Check that the upload was successful (look for success message)
3. Try refreshing the page
4. Re-upload the dataset if needed

#### Problem: Node configuration doesn't save
**Solution:**
- Configuration saves automatically when you change values
- If the node closes immediately, try expanding it again
- Check browser console for errors

#### Problem: Can't select multiple columns
**Solution:**
- For Select operation: Click "Add column..." button
- Click on column names to toggle them
- Click X on chips to remove them
- This is the correct behavior - it's working!

---

### 🟢 Connection Issues

#### Problem: Can't connect nodes
**Solution:**
1. Make sure you're dragging from **bottom handle** (output)
2. Drop on **top handle** (input) of another node
3. Can't connect a node to itself
4. Can't create circular dependencies

#### Problem: Edges disappear
**Solution:**
- This might happen if you delete a node
- Edges connected to that node are automatically removed
- This is correct behavior

---

### 🟣 Pipeline Execution Issues

#### Problem: "Pipeline execution failed"
**Common causes:**
1. **Empty configuration** - Make sure all nodes are configured
2. **Invalid column names** - Check that column names exist in your data
3. **Type mismatches** - e.g., filtering text column with numeric value
4. **Backend not running** - Make sure backend is running on port 8000

**Solution:**
1. Open browser console (F12)
2. Look for detailed error message
3. Check each node's configuration
4. Verify column names match your data exactly
5. Test with a simple pipeline first (just one node)

#### Problem: "No nodes in pipeline"
**Solution:**
- You need to add at least one transform node
- Drag an operation from the sidebar to the canvas
- Configure it, then run

#### Problem: Results don't make sense
**Solution:**
1. Check the execution order - system auto-orders based on connections
2. Verify each node's configuration
3. Test each operation individually
4. Check the console logs for intermediate results

---

### 🔴 Backend/API Issues

#### Problem: "Network Error" or "Failed to fetch"
**Solution:**
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not running, start it:
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

#### Problem: CORS errors
**Solution:**
- Backend should already be configured for CORS
- Check `backend/app/main.py` for CORS settings
- Make sure frontend is running on port 3000, 3001, or 3002

#### Problem: Database errors
**Solution:**
```bash
# Clear old database files
cd backend
rm -rf data/*.db

# Restart backend
```

---

### 🟤 Performance Issues

#### Problem: App is slow
**Solution:**
1. **Large datasets** - Consider filtering data before upload
2. **Too many nodes** - Try simplifying pipeline
3. **Browser extensions** - Disable React DevTools for better performance
4. **Old browser** - Make sure you're using latest Chrome/Firefox/Safari

#### Problem: Upload takes forever
**Solution:**
- File size limit is 100MB
- Large files take time to process
- Consider splitting the data or using a sample

---

## 🆘 Still Having Issues?

### Debug Mode
1. Open browser console (F12)
2. Go to Console tab
3. Look for red error messages
4. Copy the error message

### Check Backend Logs
```bash
# In terminal where backend is running
# Look for error messages
```

### Reset Everything
```bash
# Nuclear option - reset everything
cd cascade

# Clean frontend
cd frontend
rm -rf node_modules package-lock.json dist
npm install

# Clean backend
cd ../backend
rm -rf venv data/*.db
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start fresh
cd ..
./start.sh
```

---

## 📋 Checklist Before Asking for Help

- [ ] Backend is running on port 8000
- [ ] Frontend is running on port 3000
- [ ] You've uploaded at least one dataset
- [ ] You've checked the browser console for errors
- [ ] You've tried refreshing the page
- [ ] You've checked this troubleshooting guide

---

## 🎓 Best Practices

1. **Start simple** - Test with small datasets first
2. **One step at a time** - Add nodes one by one
3. **Verify uploads** - Make sure data uploaded successfully
4. **Check configurations** - Double-check each node before running
5. **Use console** - Browser console is your friend for debugging
6. **Save often** - Use the Save Pipeline button

---

*Most issues can be solved by restarting the application or checking the browser console!*

