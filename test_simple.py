#!/usr/bin/env python3
"""
Simple test for the transformation system
"""

import requests
import json
import time

# Simple test with just one transformation
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

def test_simple_transformation():
    """Test a simple SELECT transformation"""
    try:
        # Wait for server to start
        time.sleep(1)
        
        # Test transformation endpoint
        response = requests.post(
            "http://localhost:8000/api/transformations/run",
            json=test_pipeline,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Transformation test: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Simple transformation is working")
            print(f"Status: {result.get('status')}")
            print(f"Message: {result.get('message')}")
            if result.get('status') == 'success':
                print(f"Output rows: {result.get('outputRows')}")
                print(f"Preview data: {result.get('outputData', [])[:3]}")  # Show first 3 rows
            return True
        else:
            print(f"❌ Transformation API failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing Simple Transformation...")
    success = test_simple_transformation()
    
    if success:
        print("\n🎉 Simple transformation test passed!")
    else:
        print("\n💥 Simple transformation test failed.")
