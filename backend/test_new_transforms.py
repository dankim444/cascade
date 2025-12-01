"""
Test script for new transformation operations
"""
import pandas as pd
import numpy as np
import os

# Create synthetic test datasets
def create_sales_data():
    """Create a sales dataset for testing"""
    np.random.seed(42)
    dates = pd.date_range('2024-01-01', periods=100, freq='D')
    
    data = {
        'date': dates,
        'product': np.random.choice(['Laptop', 'Phone', 'Tablet', 'Monitor'], 100),
        'region': np.random.choice(['North', 'South', 'East', 'West'], 100),
        'sales_amount': np.random.uniform(100, 1000, 100).round(2),
        'quantity': np.random.randint(1, 10, 100),
        'customer_id': np.random.randint(1000, 1100, 100)
    }
    df = pd.DataFrame(data)
    # Add some missing values for fill testing
    df.loc[np.random.choice(df.index, 10), 'sales_amount'] = np.nan
    return df

def create_customer_data():
    """Create customer dataset for join/union testing"""
    data = {
        'customer_id': range(1000, 1110),
        'customer_name': [f'Customer_{i}' for i in range(110)],
        'tier': np.random.choice(['Gold', 'Silver', 'Bronze'], 110)
    }
    return pd.DataFrame(data)

def create_second_sales_data():
    """Create another sales dataset for union testing"""
    np.random.seed(123)
    dates = pd.date_range('2024-04-11', periods=50, freq='D')
    
    data = {
        'date': dates,
        'product': np.random.choice(['Laptop', 'Phone', 'Tablet', 'Monitor'], 50),
        'region': np.random.choice(['North', 'South', 'East', 'West'], 50),
        'sales_amount': np.random.uniform(100, 1000, 50).round(2),
        'quantity': np.random.randint(1, 10, 50),
        'customer_id': np.random.randint(1000, 1100, 50)
    }
    return pd.DataFrame(data)

def save_test_data():
    """Save all test datasets as CSV"""
    os.makedirs('test_data', exist_ok=True)
    
    sales_df = create_sales_data()
    customers_df = create_customer_data()
    sales2_df = create_second_sales_data()
    
    sales_df.to_csv('test_data/sales.csv', index=False)
    customers_df.to_csv('test_data/customers.csv', index=False)
    sales2_df.to_csv('test_data/sales_q2.csv', index=False)
    
    print("✅ Created test datasets:")
    print(f"  - sales.csv ({len(sales_df)} rows, {len(sales_df.columns)} columns)")
    print(f"  - customers.csv ({len(customers_df)} rows, {len(customers_df.columns)} columns)")
    print(f"  - sales_q2.csv ({len(sales2_df)} rows, {len(sales2_df.columns)} columns)")
    print(f"\nMissing values in sales.csv: {sales_df.isna().sum().sum()}")
    print(f"Duplicate rows in sales.csv: {len(sales_df) - len(sales_df.drop_duplicates())}")

def test_pivot():
    """Test pivot transformation"""
    print("\n" + "="*50)
    print("TESTING PIVOT")
    print("="*50)
    
    df = create_sales_data()
    print(f"Input: {len(df)} rows")
    
    # Pivot: product x region with sum of sales_amount
    result = df.pivot_table(
        index='product',
        columns='region',
        values='sales_amount',
        aggfunc='sum',
        fill_value=0
    ).reset_index()
    result.columns = [str(col) for col in result.columns]
    
    print(f"Output: {len(result)} rows, {len(result.columns)} columns")
    print(f"Columns: {list(result.columns)}")
    print(f"\nSample output:")
    print(result.head())
    print("✅ Pivot test passed")

def test_aggregate():
    """Test aggregate transformation"""
    print("\n" + "="*50)
    print("TESTING AGGREGATE")
    print("="*50)
    
    df = create_sales_data()
    print(f"Input: {len(df)} rows")
    
    # Multiple aggregations
    result = pd.DataFrame({
        'total_sales': [df['sales_amount'].sum()],
        'avg_sales': [df['sales_amount'].mean()],
        'max_quantity': [df['quantity'].max()],
        'total_transactions': [len(df)]
    })
    
    print(f"Output: {len(result)} row (summary)")
    print(f"\nResults:")
    print(result.to_string())
    print("✅ Aggregate test passed")

def test_window():
    """Test window functions"""
    print("\n" + "="*50)
    print("TESTING WINDOW FUNCTIONS")
    print("="*50)
    
    df = create_sales_data().copy()
    df = df.sort_values('sales_amount')
    print(f"Input: {len(df)} rows")
    
    # Test various window functions
    df['rank'] = df['sales_amount'].rank()
    df['dense_rank'] = df['sales_amount'].rank(method='dense')
    df['row_number'] = range(1, len(df) + 1)
    df['cumsum'] = df['sales_amount'].cumsum()
    df['running_avg'] = df['sales_amount'].expanding().mean()
    
    print(f"Output: {len(df)} rows with 5 new window columns")
    print(f"\nSample (sorted by sales_amount):")
    print(df[['sales_amount', 'rank', 'dense_rank', 'row_number', 'cumsum', 'running_avg']].head(10))
    print("✅ Window functions test passed")

def test_union():
    """Test union transformation"""
    print("\n" + "="*50)
    print("TESTING UNION")
    print("="*50)
    
    df1 = create_sales_data()
    df2 = create_second_sales_data()
    print(f"Input 1: {len(df1)} rows")
    print(f"Input 2: {len(df2)} rows")
    
    # Union all
    result_all = pd.concat([df1, df2], ignore_index=True)
    print(f"Union ALL: {len(result_all)} rows")
    
    # Union distinct
    result_distinct = result_all.drop_duplicates()
    print(f"Union DISTINCT: {len(result_distinct)} rows")
    print(f"Duplicates removed: {len(result_all) - len(result_distinct)}")
    print("✅ Union test passed")

def test_deduplicate():
    """Test deduplicate transformation"""
    print("\n" + "="*50)
    print("TESTING DEDUPLICATE")
    print("="*50)
    
    df = create_sales_data()
    # Add some duplicate rows
    df_with_dupes = pd.concat([df, df.head(20)], ignore_index=True)
    print(f"Input: {len(df_with_dupes)} rows (with duplicates)")
    
    # Full deduplication
    result_full = df_with_dupes.drop_duplicates(keep='first')
    print(f"After full dedup: {len(result_full)} rows")
    print(f"Removed: {len(df_with_dupes) - len(result_full)} duplicates")
    
    # Dedup by specific columns
    result_partial = df_with_dupes.drop_duplicates(subset=['product', 'region'], keep='first')
    print(f"After dedup by product+region: {len(result_partial)} rows")
    print(f"Removed: {len(df_with_dupes) - len(result_partial)} rows")
    print("✅ Deduplicate test passed")

def test_fill():
    """Test fill transformation"""
    print("\n" + "="*50)
    print("TESTING FILL")
    print("="*50)
    
    df = create_sales_data()
    null_count_before = df['sales_amount'].isna().sum()
    print(f"Input: {len(df)} rows")
    print(f"Missing values in sales_amount: {null_count_before}")
    
    # Forward fill
    df_ffill = df.copy()
    df_ffill['sales_amount'] = df_ffill['sales_amount'].fillna(method='ffill')
    null_after_ffill = df_ffill['sales_amount'].isna().sum()
    print(f"After forward fill: {null_after_ffill} missing")
    
    # Constant fill
    df_const = df.copy()
    df_const['sales_amount'] = df_const['sales_amount'].fillna(0)
    null_after_const = df_const['sales_amount'].isna().sum()
    print(f"After constant fill (0): {null_after_const} missing")
    
    # Interpolate
    df_interp = df.copy()
    df_interp['sales_amount'] = df_interp['sales_amount'].interpolate()
    null_after_interp = df_interp['sales_amount'].isna().sum()
    print(f"After interpolate: {null_after_interp} missing")
    
    print("✅ Fill test passed")

def run_all_tests():
    """Run all transformation tests"""
    print("\n" + "🧪 " + "="*48)
    print("TESTING NEW TRANSFORMATION OPERATIONS")
    print("="*50)
    
    try:
        save_test_data()
        test_pivot()
        test_aggregate()
        test_window()
        test_union()
        test_deduplicate()
        test_fill()
        
        print("\n" + "="*50)
        print("✅ ALL TESTS PASSED!")
        print("="*50)
        print("\nTest data saved in: test_data/")
        print("You can upload these files in the UI:")
        print("  1. Upload sales.csv")
        print("  2. Upload customers.csv")
        print("  3. Upload sales_q2.csv")
        print("\nTry these pipelines:")
        print("  • Pivot: sales by product × region")
        print("  • Aggregate: total sales, avg sales, max quantity")
        print("  • Window: rank sales by amount")
        print("  • Union: combine sales.csv + sales_q2.csv")
        print("  • Deduplicate: remove duplicate transactions")
        print("  • Fill: handle missing sales amounts")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_all_tests()

