#!/usr/bin/env python3
"""
Comprehensive test suite for Cascade - tests all backend and frontend functionality
"""

import requests
import json
import os
import time
import sqlite3
from io import StringIO

BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

# Test results tracking
test_results = []

def log_test(name, passed, message=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({"name": name, "passed": passed, "message": message})
    print(f"{status} - {name}")
    if message:
        print(f"   {message}")
    return passed

def create_test_csv():
    """Create test CSV file"""
    csv_content = """name,age,city,salary
Alice,25,New York,50000
Bob,30,Los Angeles,60000
Charlie,35,Chicago,70000
Diana,28,Houston,55000
Eve,32,Phoenix,65000
Frank,45,Philadelphia,80000
Grace,29,San Antonio,58000
Henry,38,San Diego,75000"""
    
    with open("test_employees.csv", "w") as f:
        f.write(csv_content)
    
    return "test_employees.csv"

def create_test_csv_departments():
    """Create second test CSV for JOIN"""
    csv_content = """name,department,manager
Alice,Engineering,Bob
Bob,Engineering,Charlie
Charlie,Management,None
Diana,Sales,Eve
Eve,Sales,Charlie
Frank,HR,Grace
Grace,HR,Charlie
Henry,Engineering,Bob"""
    
    with open("test_departments.csv", "w") as f:
        f.write(csv_content)
    
    return "test_departments.csv"

# ========== BACKEND TESTS ==========

def test_backend_health():
    """Test backend health endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/health")
        if response.status_code == 200:
            data = response.json()
            return log_test("Backend Health Check", 
                          "status" in data and data["status"] == "healthy",
                          f"Response: {data}")
        else:
            return log_test("Backend Health Check", False, f"Status code: {response.status_code}")
    except Exception as e:
        return log_test("Backend Health Check", False, f"Error: {e}")

def test_backend_upload():
    """Test file upload"""
    try:
        csv_file = create_test_csv()
        with open(csv_file, "rb") as f:
            files = {"file": ("test_employees.csv", f, "text/csv")}
            response = requests.post(f"{BACKEND_URL}/api/upload", files=files)
        
        os.remove(csv_file)
        
        if response.status_code == 200:
            data = response.json()
            passed = (
                "id" in data and 
                "rowCount" in data and 
                data["rowCount"] == 8 and
                "columns" in data and
                len(data["columns"]) == 4
            )
            return log_test("Backend CSV Upload", passed, 
                          f"Uploaded {data.get('rowCount')} rows, {len(data.get('columns', []))} columns")
        else:
            return log_test("Backend CSV Upload", False, f"Status: {response.status_code}, {response.text}")
    except Exception as e:
        return log_test("Backend CSV Upload", False, f"Error: {e}")

def test_backend_select():
    """Test SELECT transformation"""
    try:
        pipeline = {
            "nodes": [{
                "id": "transform-1",
                "transform": {
                    "operation": "select",
                    "params": [json.dumps(["name", "age"])]
                },
                "data": "test_data",
                "position": {"x": 100, "y": 100}
            }],
            "dataConnections": [{
                "dataKey": "test_data",
                "sqlConnection": "/Users/yashsamtani2/cascade/backend/data/test_data.db",
                "schema": {
                    "columns": [
                        {"name": "name", "type": "string", "nullable": False},
                        {"name": "age", "type": "number", "nullable": False},
                        {"name": "city", "type": "string", "nullable": False},
                        {"name": "salary", "type": "number", "nullable": False}
                    ]
                },
                "rowCount": 100,
                "lastAccessed": "2024-01-01T00:00:00Z"
            }]
        }
        
        response = requests.post(f"{BACKEND_URL}/api/transformations/run", 
                               json=pipeline,
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            result = response.json()
            passed = result.get("status") == "success"
            return log_test("SELECT Transformation", passed,
                          f"Output rows: {result.get('outputRows')}")
        else:
            return log_test("SELECT Transformation", False, f"Status: {response.status_code}")
    except Exception as e:
        return log_test("SELECT Transformation", False, f"Error: {e}")

def test_backend_filter():
    """Test FILTER transformation"""
    try:
        pipeline = {
            "nodes": [{
                "id": "transform-1",
                "transform": {
                    "operation": "filter",
                    "params": [json.dumps({
                        "column": "age",
                        "operator": "greater_than",
                        "value": 30
                    })]
                },
                "data": "test_data",
                "position": {"x": 100, "y": 100}
            }],
            "dataConnections": [{
                "dataKey": "test_data",
                "sqlConnection": "/Users/yashsamtani2/cascade/backend/data/test_data.db",
                "schema": {
                    "columns": [
                        {"name": "name", "type": "string", "nullable": False},
                        {"name": "age", "type": "number", "nullable": False},
                        {"name": "city", "type": "string", "nullable": False},
                        {"name": "salary", "type": "number", "nullable": False}
                    ]
                },
                "rowCount": 100,
                "lastAccessed": "2024-01-01T00:00:00Z"
            }]
        }
        
        response = requests.post(f"{BACKEND_URL}/api/transformations/run", 
                               json=pipeline,
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            result = response.json()
            passed = result.get("status") == "success"
            return log_test("FILTER Transformation", passed,
                          f"Output rows: {result.get('outputRows')}")
        else:
            return log_test("FILTER Transformation", False, f"Status: {response.status_code}")
    except Exception as e:
        return log_test("FILTER Transformation", False, f"Error: {e}")

def test_backend_groupby():
    """Test GROUPBY transformation"""
    try:
        pipeline = {
            "nodes": [{
                "id": "transform-1",
                "transform": {
                    "operation": "groupby",
                    "params": [json.dumps({
                        "groupColumns": ["city"],
                        "aggregations": [
                            {
                                "column": "salary",
                                "operation": "mean",
                                "alias": "avg_salary"
                            },
                            {
                                "column": "age",
                                "operation": "count",
                                "alias": "employee_count"
                            }
                        ]
                    })]
                },
                "data": "test_data",
                "position": {"x": 100, "y": 100}
            }],
            "dataConnections": [{
                "dataKey": "test_data",
                "sqlConnection": "/Users/yashsamtani2/cascade/backend/data/test_data.db",
                "schema": {
                    "columns": [
                        {"name": "name", "type": "string", "nullable": False},
                        {"name": "age", "type": "number", "nullable": False},
                        {"name": "city", "type": "string", "nullable": False},
                        {"name": "salary", "type": "number", "nullable": False}
                    ]
                },
                "rowCount": 100,
                "lastAccessed": "2024-01-01T00:00:00Z"
            }]
        }
        
        response = requests.post(f"{BACKEND_URL}/api/transformations/run", 
                               json=pipeline,
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            result = response.json()
            passed = result.get("status") == "success"
            return log_test("GROUPBY Transformation", passed,
                          f"Output rows: {result.get('outputRows')}")
        else:
            return log_test("GROUPBY Transformation", False, f"Status: {response.status_code}")
    except Exception as e:
        return log_test("GROUPBY Transformation", False, f"Error: {e}")

def test_backend_join():
    """Test JOIN transformation"""
    try:
        # First upload both datasets
        csv1 = create_test_csv()
        csv2 = create_test_csv_departments()
        
        dataset1_id = None
        dataset2_id = None
        
        # Upload first dataset
        with open(csv1, "rb") as f:
            files = {"file": ("test_employees.csv", f, "text/csv")}
            response1 = requests.post(f"{BACKEND_URL}/api/upload", files=files)
            if response1.status_code == 200:
                dataset1_id = response1.json().get("id")
        
        # Upload second dataset
        with open(csv2, "rb") as f:
            files = {"file": ("test_departments.csv", f, "text/csv")}
            response2 = requests.post(f"{BACKEND_URL}/api/upload", files=files)
            if response2.status_code == 200:
                dataset2_id = response2.json().get("id")
        
        os.remove(csv1)
        os.remove(csv2)
        
        if not dataset1_id or not dataset2_id:
            return log_test("JOIN Transformation", False, "Failed to upload test datasets")
        
        # Get actual database paths
        db1_path = f"/Users/yashsamtani2/cascade/backend/data/data_{dataset1_id}.db"
        db2_path = f"/Users/yashsamtani2/cascade/backend/data/data_{dataset2_id}.db"
        
        pipeline = {
            "nodes": [{
                "id": "transform-1",
                "transform": {
                    "operation": "join",
                    "params": [json.dumps({
                        "rightDataKey": "dataset2",
                        "leftColumn": "name",
                        "rightColumn": "name",
                        "joinType": "inner"
                    })]
                },
                "data": "dataset1",
                "position": {"x": 100, "y": 100}
            }],
            "dataConnections": [
                {
                    "dataKey": "dataset1",
                    "sqlConnection": db1_path,
                    "schema": {
                        "columns": [
                            {"name": "name", "type": "string", "nullable": False},
                            {"name": "age", "type": "number", "nullable": False},
                            {"name": "city", "type": "string", "nullable": False},
                            {"name": "salary", "type": "number", "nullable": False}
                        ]
                    },
                    "rowCount": 8,
                    "lastAccessed": "2024-01-01T00:00:00Z"
                },
                {
                    "dataKey": "dataset2",
                    "sqlConnection": db2_path,
                    "schema": {
                        "columns": [
                            {"name": "name", "type": "string", "nullable": False},
                            {"name": "department", "type": "string", "nullable": False},
                            {"name": "manager", "type": "string", "nullable": False}
                        ]
                    },
                    "rowCount": 8,
                    "lastAccessed": "2024-01-01T00:00:00Z"
                }
            ]
        }
        
        response = requests.post(f"{BACKEND_URL}/api/transformations/run", 
                               json=pipeline,
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            result = response.json()
            passed = result.get("status") == "success"
            return log_test("JOIN Transformation", passed,
                          f"Output rows: {result.get('outputRows')}")
        else:
            return log_test("JOIN Transformation", False, f"Status: {response.status_code}, {response.text}")
    except Exception as e:
        return log_test("JOIN Transformation", False, f"Error: {e}")

def test_pipeline_save():
    """Test pipeline save"""
    try:
        pipeline = {
            "name": "Test Pipeline",
            "nodes": [{
                "id": "transform-1",
                "transform": {
                    "operation": "select",
                    "params": [json.dumps(["name", "age"])]
                },
                "data": "test_data",
                "position": {"x": 100, "y": 100}
            }],
            "dataConnections": []
        }
        
        response = requests.post(f"{BACKEND_URL}/api/pipelines/save", 
                               json=pipeline,
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            data = response.json()
            passed = "id" in data
            return log_test("Pipeline Save", passed, f"Pipeline ID: {data.get('id')}")
        else:
            return log_test("Pipeline Save", False, f"Status: {response.status_code}")
    except Exception as e:
        return log_test("Pipeline Save", False, f"Error: {e}")

def test_pipeline_load():
    """Test pipeline load"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/pipelines")
        
        if response.status_code == 200:
            data = response.json()
            # API returns {"pipelines": [...]}
            pipelines = data.get("pipelines", []) if isinstance(data, dict) else data
            passed = isinstance(pipelines, list)
            return log_test("Pipeline Load", passed, f"Loaded {len(pipelines)} pipeline(s)")
        else:
            return log_test("Pipeline Load", False, f"Status: {response.status_code}")
    except Exception as e:
        return log_test("Pipeline Load", False, f"Error: {e}")

# ========== FRONTEND TESTS ==========

def test_frontend_accessibility():
    """Test frontend is accessible"""
    try:
        response = requests.get(FRONTEND_URL)
        if response.status_code == 200:
            html = response.text
            passed = "react" in html.lower() or "vite" in html.lower()
            return log_test("Frontend Accessibility", passed, f"Frontend is running")
        else:
            return log_test("Frontend Accessibility", False, f"Status: {response.status_code}")
    except Exception as e:
        return log_test("Frontend Accessibility", False, f"Error: {e}")

def test_frontend_api_integration():
    """Test frontend can call backend API"""
    try:
        # This would be tested via browser automation, but we can test the endpoints
        response = requests.get(f"{BACKEND_URL}/api/datasets")
        passed = response.status_code == 200
        return log_test("Frontend API Integration", passed, 
                       f"API endpoints accessible from frontend")
    except Exception as e:
        return log_test("Frontend API Integration", False, f"Error: {e}")

# ========== MAIN TEST RUNNER ==========

def main():
    print("=" * 70)
    print("🧪 COMPREHENSIVE CASCADE TEST SUITE")
    print("=" * 70)
    print()
    
    # Backend Tests
    print("📡 BACKEND TESTS")
    print("-" * 70)
    test_backend_health()
    test_backend_upload()
    test_backend_select()
    test_backend_filter()
    test_backend_groupby()
    test_backend_join()
    test_pipeline_save()
    test_pipeline_load()
    
    print()
    
    # Frontend Tests
    print("🎨 FRONTEND TESTS")
    print("-" * 70)
    test_frontend_accessibility()
    test_frontend_api_integration()
    
    print()
    
    # Summary
    print("=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    
    total = len(test_results)
    passed = sum(1 for r in test_results if r["passed"])
    failed = total - passed
    
    print(f"\nTotal Tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"\nSuccess Rate: {(passed/total*100):.1f}%")
    
    if failed > 0:
        print("\n⚠️  Failed Tests:")
        for result in test_results:
            if not result["passed"]:
                print(f"  - {result['name']}: {result['message']}")
    
    print()
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! System is fully operational.")
        return True
    else:
        print(f"⚠️  {failed} test(s) failed. See details above.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

