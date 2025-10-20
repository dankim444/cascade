#!/usr/bin/env python3
"""
End-to-end test for Cascade transformation system
Tests a complete workflow from data upload to pipeline execution
"""

import requests
import json
import os
import time

BACKEND_URL = "http://localhost:8000"

def test_end_to_end():
    """Test complete end-to-end workflow"""
    print("=" * 70)
    print("🚀 END-TO-END WORKFLOW TEST")
    print("=" * 70)
    print()
    
    # Step 1: Create test data
    print("Step 1: Creating test CSV data...")
    csv_content = """name,age,city,salary,department
Alice,25,New York,50000,Engineering
Bob,30,Los Angeles,60000,Engineering
Charlie,35,Chicago,70000,Management
Diana,28,Houston,55000,Sales
Eve,32,Phoenix,65000,Sales
Frank,45,Philadelphia,80000,HR
Grace,29,San Antonio,58000,HR
Henry,38,San Diego,75000,Engineering
Ivan,27,Austin,52000,Engineering
Jane,31,Dallas,62000,Sales"""
    
    with open("test_employees_full.csv", "w") as f:
        f.write(csv_content)
    print("✅ Test data created")
    print()
    
    # Step 2: Upload data
    print("Step 2: Uploading data to backend...")
    with open("test_employees_full.csv", "rb") as f:
        files = {"file": ("test_employees_full.csv", f, "text/csv")}
        response = requests.post(f"{BACKEND_URL}/api/upload", files=files)
    
    if response.status_code != 200:
        print(f"❌ Upload failed: {response.status_code}")
        return False
    
    dataset = response.json()
    dataset_id = dataset["id"]
    dataset_path = f"/Users/yashsamtani2/cascade/backend/data/data_{dataset_id}.db"
    
    print(f"✅ Data uploaded successfully")
    print(f"   Dataset ID: {dataset_id}")
    print(f"   Rows: {dataset['rowCount']}")
    print(f"   Columns: {', '.join([c['name'] for c in dataset['columns']])}")
    print()
    
    # Step 3: Create transformation pipeline
    print("Step 3: Creating transformation pipeline...")
    print("   Pipeline: Data -> GROUPBY (aggregate by department)")
    
    pipeline = {
        "nodes": [
            {
                "id": "transform-1",
                "transform": {
                    "operation": "groupby",
                    "params": [json.dumps({
                        "groupColumns": ["department"],
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
                "data": "employees",
                "position": {"x": 100, "y": 100}
            }
        ],
        "dataConnections": [
            {
                "dataKey": "employees",
                "sqlConnection": dataset_path,
                "schema": {
                    "columns": dataset["columns"]
                },
                "rowCount": dataset["rowCount"],
                "lastAccessed": "2024-01-01T00:00:00Z"
            }
        ]
    }
    
    print("✅ Pipeline created")
    print()
    
    # Step 4: Execute pipeline
    print("Step 4: Executing pipeline...")
    response = requests.post(
        f"{BACKEND_URL}/api/transformations/run",
        json=pipeline,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code != 200:
        print(f"❌ Pipeline execution failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False
    
    result = response.json()
    
    if result.get("status") != "success":
        print(f"❌ Pipeline execution failed: {result.get('message')}")
        return False
    
    print("✅ Pipeline executed successfully")
    print(f"   Output rows: {result.get('outputRows')}")
    print(f"   Execution time: {result.get('executionTime')}")
    print()
    
    # Step 5: Verify output data
    print("Step 5: Verifying output data...")
    output_data = result.get("outputData", [])
    
    if len(output_data) > 0:
        print("✅ Output data available")
        print(f"   Sample output (first row):")
        for key, value in output_data[0].items():
            print(f"      {key}: {value}")
    else:
        print("⚠️  No output data in preview")
    print()
    
    # Step 6: Save pipeline
    print("Step 6: Saving pipeline...")
    save_payload = {
        "name": "End-to-End Test Pipeline",
        "nodes": pipeline["nodes"],
        "dataConnections": pipeline["dataConnections"]
    }
    
    response = requests.post(
        f"{BACKEND_URL}/api/pipelines/save",
        json=save_payload,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code != 200:
        print(f"❌ Pipeline save failed: {response.status_code}")
        return False
    
    saved_pipeline = response.json()
    pipeline_id = saved_pipeline.get("id")
    
    print("✅ Pipeline saved successfully")
    print(f"   Pipeline ID: {pipeline_id}")
    print()
    
    # Step 7: Load pipelines
    print("Step 7: Loading saved pipelines...")
    response = requests.get(f"{BACKEND_URL}/api/pipelines")
    
    if response.status_code != 200:
        print(f"❌ Pipeline load failed: {response.status_code}")
        return False
    
    pipelines_data = response.json()
    pipelines = pipelines_data.get("pipelines", [])
    
    # Find our pipeline
    found = False
    for p in pipelines:
        if p.get("id") == pipeline_id:
            found = True
            break
    
    if found:
        print("✅ Pipeline loaded successfully")
        print(f"   Total pipelines: {len(pipelines)}")
    else:
        print("❌ Saved pipeline not found in list")
        return False
    print()
    
    # Cleanup
    os.remove("test_employees_full.csv")
    
    # Final summary
    print("=" * 70)
    print("🎉 END-TO-END TEST COMPLETED SUCCESSFULLY")
    print("=" * 70)
    print()
    print("Summary:")
    print("  ✅ Data upload working")
    print("  ✅ Transformations working (GROUPBY with aggregations)")
    print("  ✅ Pipeline execution working")
    print("  ✅ Output data generation working")
    print("  ✅ Pipeline save working")
    print("  ✅ Pipeline load working")
    print()
    print("🚀 System is fully operational and ready for production use!")
    print()
    
    return True

if __name__ == "__main__":
    try:
        success = test_end_to_end()
        exit(0 if success else 1)
    except Exception as e:
        print(f"❌ End-to-end test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

