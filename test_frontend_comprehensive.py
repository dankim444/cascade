#!/usr/bin/env python3
"""
Comprehensive frontend test for Cascade
Tests all major functionality including data upload, transformations, and pipeline execution
"""

import requests
import json
import time
import os
from io import StringIO

# Test configuration
FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:8000"

def test_backend_health():
    """Test if backend is healthy"""
    try:
        response = requests.get(f"{BACKEND_URL}/health")
        if response.status_code == 200:
            print("✅ Backend health check passed")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend health check error: {e}")
        return False

def test_frontend_accessibility():
    """Test if frontend is accessible"""
    try:
        response = requests.get(FRONTEND_URL)
        if response.status_code == 200:
            print("✅ Frontend accessibility test passed")
            return True
        else:
            print(f"❌ Frontend accessibility test failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend accessibility test error: {e}")
        return False

def create_test_csv():
    """Create a test CSV file"""
    csv_content = """name,age,city,salary
Alice,25,New York,50000
Bob,30,Los Angeles,60000
Charlie,35,Chicago,70000
Diana,28,Houston,55000
Eve,32,Phoenix,65000
Frank,45,Philadelphia,80000
Grace,29,San Antonio,58000
Henry,38,San Diego,75000"""
    
    with open("test_data.csv", "w") as f:
        f.write(csv_content)
    
    print("✅ Test CSV file created")
    return "test_data.csv"

def test_data_upload():
    """Test data upload functionality"""
    try:
        # Create test CSV
        csv_file = create_test_csv()
        
        # Upload the file
        with open(csv_file, "rb") as f:
            files = {"file": ("test_data.csv", f, "text/csv")}
            response = requests.post(f"{BACKEND_URL}/api/upload", files=files)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Data upload test passed")
            print(f"   Dataset ID: {data.get('id')}")
            print(f"   Rows: {data.get('rowCount')}")
            print(f"   Columns: {len(data.get('columns', []))}")
            
            # Clean up
            os.remove(csv_file)
            return data
        else:
            print(f"❌ Data upload test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Data upload test error: {e}")
        return None

def test_transformation_api():
    """Test transformation API with a simple SELECT operation"""
    try:
        # Test pipeline with SELECT transformation
        test_pipeline = {
            "nodes": [
                {
                    "id": "transform-1",
                    "transform": {
                        "operation": "select",
                        "params": [json.dumps(["name", "age"])]
                    },
                    "data": "test_data",
                    "position": {"x": 100, "y": 100}
                }
            ],
            "dataConnections": [
                {
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
                    "rowCount": 8,
                    "lastAccessed": "2024-01-01T00:00:00Z"
                }
            ]
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/transformations/run",
            json=test_pipeline,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("status") == "success":
                print("✅ Transformation API test passed")
                print(f"   Output rows: {result.get('outputRows')}")
                return True
            else:
                print(f"❌ Transformation API test failed: {result.get('message')}")
                return False
        else:
            print(f"❌ Transformation API test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Transformation API test error: {e}")
        return False

def test_filter_transformation():
    """Test FILTER transformation"""
    try:
        test_pipeline = {
            "nodes": [
                {
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
                }
            ],
            "dataConnections": [
                {
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
                    "rowCount": 8,
                    "lastAccessed": "2024-01-01T00:00:00Z"
                }
            ]
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/transformations/run",
            json=test_pipeline,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("status") == "success":
                print("✅ Filter transformation test passed")
                print(f"   Output rows: {result.get('outputRows')}")
                return True
            else:
                print(f"❌ Filter transformation test failed: {result.get('message')}")
                return False
        else:
            print(f"❌ Filter transformation test failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Filter transformation test error: {e}")
        return False

def test_groupby_transformation():
    """Test GROUPBY transformation"""
    try:
        test_pipeline = {
            "nodes": [
                {
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
                }
            ],
            "dataConnections": [
                {
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
                    "rowCount": 8,
                    "lastAccessed": "2024-01-01T00:00:00Z"
                }
            ]
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/transformations/run",
            json=test_pipeline,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("status") == "success":
                print("✅ GroupBy transformation test passed")
                print(f"   Output rows: {result.get('outputRows')}")
                return True
            else:
                print(f"❌ GroupBy transformation test failed: {result.get('message')}")
                return False
        else:
            print(f"❌ GroupBy transformation test failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ GroupBy transformation test error: {e}")
        return False

def test_pipeline_save():
    """Test pipeline save functionality"""
    try:
        test_pipeline = {
            "name": "Test Pipeline",
            "nodes": [
                {
                    "id": "transform-1",
                    "transform": {
                        "operation": "select",
                        "params": [json.dumps(["name", "age"])]
                    },
                    "data": "test_data",
                    "position": {"x": 100, "y": 100}
                }
            ],
            "dataConnections": []
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/pipelines/save",
            json=test_pipeline,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Pipeline save test passed")
            print(f"   Pipeline ID: {result.get('id')}")
            return True
        else:
            print(f"❌ Pipeline save test failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Pipeline save test error: {e}")
        return False

def main():
    """Run comprehensive frontend tests"""
    print("🧪 Starting Comprehensive Frontend Tests for Cascade")
    print("=" * 60)
    
    tests = [
        ("Backend Health Check", test_backend_health),
        ("Frontend Accessibility", test_frontend_accessibility),
        ("Data Upload", test_data_upload),
        ("Transformation API (SELECT)", test_transformation_api),
        ("Filter Transformation", test_filter_transformation),
        ("GroupBy Transformation", test_groupby_transformation),
        ("Pipeline Save", test_pipeline_save),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n🔍 Running: {test_name}")
        print("-" * 40)
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The frontend is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
