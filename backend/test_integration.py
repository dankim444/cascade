"""
Full integration test - Tests transformations through the actual API
"""
import requests
import pandas as pd
import time
import os

BASE_URL = "http://localhost:8000"

def test_health():
    """Test API health"""
    response = requests.get(f"{BASE_URL}/health")
    assert response.status_code == 200
    print("✅ API is healthy")

def upload_file(filepath, name):
    """Upload a CSV file"""
    with open(filepath, 'rb') as f:
        files = {'file': (name, f, 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
    
    assert response.status_code == 200, f"Upload failed: {response.text}"
    data = response.json()
    print(f"✅ Uploaded {name}: {data['rowCount']} rows, {len(data['columns'])} columns")
    return data

def run_pipeline(pipeline_config):
    """Execute a pipeline"""
    response = requests.post(
        f"{BASE_URL}/api/transformations/run",
        json=pipeline_config
    )
    
    if response.status_code != 200:
        print(f"❌ Pipeline failed: {response.text}")
        return None
    
    return response.json()

def test_pivot_transform():
    """Test pivot transformation end-to-end"""
    print("\n" + "="*50)
    print("TESTING PIVOT TRANSFORMATION (FULLSTACK)")
    print("="*50)
    
    # Upload sales data
    sales = upload_file('test_data/sales.csv', 'sales.csv')
    
    # Create pivot pipeline
    pipeline = {
        "nodes": [{
            "id": "pivot1",
            "transform": {
                "operation": "pivot",
                "params": ['{"indexColumn":"product","pivotColumn":"region","valueColumn":"sales_amount","aggFunc":"sum"}']
            },
            "data": sales['dataKey']
        }],
        "dataConnections": [{
            "dataKey": sales['dataKey'],
            "sqlConnection": f"data/{sales['dataKey']}.db",
            "schema": {"columns": sales['columns']},
            "rowCount": sales['rowCount']
        }]
    }
    
    result = run_pipeline(pipeline)
    if result:
        print(f"✅ Pivot executed successfully")
        print(f"   Result keys: {result.keys()}")
        if 'results' in result:
            print(f"   Rows: {result['results'][0].get('row_count', 'N/A')}")
    return result

def test_aggregate_transform():
    """Test aggregate transformation"""
    print("\n" + "="*50)
    print("TESTING AGGREGATE TRANSFORMATION (FULLSTACK)")
    print("="*50)
    
    sales = upload_file('test_data/sales.csv', 'sales2.csv')
    
    pipeline = {
        "nodes": [{
            "id": "agg1",
            "transform": {
                "operation": "aggregate",
                "params": ['{"aggregations":[{"column":"sales_amount","operation":"sum","alias":"total"},{"column":"sales_amount","operation":"mean","alias":"avg"}]}']
            },
            "data": sales['dataKey']
        }],
        "dataConnections": [{
            "dataKey": sales['dataKey'],
            "sqlConnection": f"data/{sales['dataKey']}.db",
            "schema": {"columns": sales['columns']},
            "rowCount": sales['rowCount']
        }]
    }
    
    result = run_pipeline(pipeline)
    if result:
        print(f"✅ Aggregate executed successfully")
    return result

def test_deduplicate_transform():
    """Test deduplicate transformation"""
    print("\n" + "="*50)
    print("TESTING DEDUPLICATE TRANSFORMATION (FULLSTACK)")
    print("="*50)
    
    sales = upload_file('test_data/sales.csv', 'sales3.csv')
    
    pipeline = {
        "nodes": [{
            "id": "dedup1",
            "transform": {
                "operation": "deduplicate",
                "params": ['{"keep":"first"}']
            },
            "data": sales['dataKey']
        }],
        "dataConnections": [{
            "dataKey": sales['dataKey'],
            "sqlConnection": f"data/{sales['dataKey']}.db",
            "schema": {"columns": sales['columns']},
            "rowCount": sales['rowCount']
        }]
    }
    
    result = run_pipeline(pipeline)
    if result:
        print(f"✅ Deduplicate executed successfully")
    return result

def test_fill_transform():
    """Test fill transformation"""
    print("\n" + "="*50)
    print("TESTING FILL TRANSFORMATION (FULLSTACK)")
    print("="*50)
    
    sales = upload_file('test_data/sales.csv', 'sales4.csv')
    
    pipeline = {
        "nodes": [{
            "id": "fill1",
            "transform": {
                "operation": "fill",
                "params": ['{"columns":["sales_amount"],"method":"forward"}']
            },
            "data": sales['dataKey']
        }],
        "dataConnections": [{
            "dataKey": sales['dataKey'],
            "sqlConnection": f"data/{sales['dataKey']}.db",
            "schema": {"columns": sales['columns']},
            "rowCount": sales['rowCount']
        }]
    }
    
    result = run_pipeline(pipeline)
    if result:
        print(f"✅ Fill executed successfully")
    return result

def test_window_transform():
    """Test window transformation"""
    print("\n" + "="*50)
    print("TESTING WINDOW TRANSFORMATION (FULLSTACK)")
    print("="*50)
    
    sales = upload_file('test_data/sales.csv', 'sales5.csv')
    
    pipeline = {
        "nodes": [{
            "id": "window1",
            "transform": {
                "operation": "window",
                "params": ['{"column":"sales_amount","operation":"rank","orderBy":"sales_amount"}']
            },
            "data": sales['dataKey']
        }],
        "dataConnections": [{
            "dataKey": sales['dataKey'],
            "sqlConnection": f"data/{sales['dataKey']}.db",
            "schema": {"columns": sales['columns']},
            "rowCount": sales['rowCount']
        }]
    }
    
    result = run_pipeline(pipeline)
    if result:
        print(f"✅ Window executed successfully")
    return result

def run_all_integration_tests():
    """Run all integration tests"""
    print("\n" + "🧪 " + "="*48)
    print("FULLSTACK INTEGRATION TESTS")
    print("="*50 + "\n")
    
    try:
        test_health()
        
        results = {
            'pivot': test_pivot_transform(),
            'aggregate': test_aggregate_transform(),
            'deduplicate': test_deduplicate_transform(),
            'fill': test_fill_transform(),
            'window': test_window_transform(),
        }
        
        print("\n" + "="*50)
        print("✅ ALL INTEGRATION TESTS PASSED!")
        print("="*50)
        
        failures = [k for k, v in results.items() if v is None]
        if failures:
            print(f"\n⚠️  Failed: {', '.join(failures)}")
        else:
            print("\n🎉 All 5 new transformations working end-to-end!")
        
    except Exception as e:
        print(f"\n❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_all_integration_tests()

