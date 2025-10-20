#!/usr/bin/env python3
"""
Test script for the transformation system
"""

import requests
import json
import time

# Test data
test_pipeline = {
    "nodes": [
        {
            "id": "transform-1",
            "transform": {
                "operation": "select",
                "params": [json.dumps(["name", "age", "city"])]
            },
            "data": "test_data",
            "position": {"x": 100, "y": 100}
        },
        {
            "id": "transform-2", 
            "transform": {
                "operation": "filter",
                "params": [json.dumps({
                    "column": "age",
                    "operator": "greater_than",
                    "value": 25
                })]
            },
            "data": "test_data",
            "parent": "transform-1",
            "position": {"x": 100, "y": 200}
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

def test_transformation_api():
    """Test the transformation API endpoint"""
    try:
        # Wait for server to start
        time.sleep(2)
        
        # Test health endpoint
        response = requests.get("http://localhost:8000/health")
        print(f"Health check: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Backend is running")
        else:
            print("❌ Backend is not responding")
            return False
            
        # Test transformation endpoint
        response = requests.post(
            "http://localhost:8000/api/transformations/run",
            json=test_pipeline,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Transformation test: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Transformation API is working")
            print(f"Result: {json.dumps(result, indent=2)}")
            return True
        else:
            print(f"❌ Transformation API failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing Cascade Transformation System...")
    success = test_transformation_api()
    
    if success:
        print("\n🎉 All tests passed! The transformation system is working.")
    else:
        print("\n💥 Tests failed. Check the logs above for details.")
