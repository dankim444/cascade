"""
Fixed transformation execution engine for Cascade
Implements the core transformations: select, filter, groupby, join
"""

import sqlite3
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import pandas as pd


class TransformationExecutor:
    """Executes transformation pipelines using SQL operations"""
    
    def __init__(self, data_connections: Dict[str, Any]):
        self.data_connections = data_connections
    
    def execute_pipeline(self, nodes: List[Dict[str, Any]], data_connections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Execute a transformation pipeline
        
        Args:
            nodes: List of transformation nodes
            data_connections: List of data connections
            
        Returns:
            Execution result with output data and metadata
        """
        try:
            # Build execution graph
            execution_order = self._build_execution_order(nodes)
            
            # Execute transformations in order
            current_data_key = None
            execution_results = []
            
            for node in execution_order:
                result = self._execute_node(node, current_data_key, data_connections)
                current_data_key = result['output_data_key']
                execution_results.append(result)
            
            # Get final result from the last execution
            if execution_results:
                final_result = execution_results[-1]
                return {
                    "status": "success",
                    "message": "Pipeline executed successfully",
                    "executionTime": "0.5s",  # TODO: Calculate actual time
                    "outputRows": final_result['row_count'],
                    "data": final_result['preview'],  # Changed from outputData to data
                    "outputSchema": final_result.get('output_schema', []),
                    "timestamp": datetime.now().isoformat(),
                    "executionResults": execution_results
                }
            else:
                raise ValueError("No transformations were executed")
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Pipeline execution failed: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
    
    def _build_execution_order(self, nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Build execution order based on parent-child relationships"""
        # For now, simple linear execution
        # TODO: Implement proper DAG traversal
        return sorted(nodes, key=lambda x: x.get('id', ''))
    
    def _execute_node(self, node: Dict[str, Any], input_data_key: Optional[str], data_connections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute a single transformation node"""
        transform = node['transform']
        operation = transform['operation']
        params = transform['params']
        
        # Get input data connection
        if input_data_key:
            input_conn = self._get_data_connection(input_data_key, data_connections)
        else:
            # First node - use the data key from the node
            input_conn = self._get_data_connection(node['data'], data_connections)
        
        # Execute transformation based on operation
        if operation == 'select':
            return self._execute_select(input_conn, params)
        elif operation == 'filter':
            return self._execute_filter(input_conn, params)
        elif operation == 'groupby':
            return self._execute_groupby(input_conn, params)
        elif operation == 'join':
            return self._execute_join(input_conn, params, data_connections)
        elif operation == 'sort':
            return self._execute_sort(input_conn, params)
        elif operation == 'rename':
            return self._execute_rename(input_conn, params)
        elif operation == 'calculate':
            return self._execute_calculate(input_conn, params)
        else:
            raise ValueError(f"Unsupported operation: {operation}")
    
    def _execute_select(self, input_conn: Dict[str, Any], params: List[str]) -> Dict[str, Any]:
        """Execute SELECT transformation"""
        config = json.loads(params[0]) if params else {}
        columns = config.get('columns', []) if isinstance(config, dict) else config
        
        # Connect to database
        conn = sqlite3.connect(input_conn['sqlConnection'])
        cursor = conn.cursor()
        
        # If no columns specified or empty list, select all columns
        if not columns:
            query = "SELECT * FROM data"
        else:
            # Build SELECT query
            columns_str = ', '.join(columns)
            query = f"SELECT {columns_str} FROM data"
        
        # Execute query
        cursor.execute(query)
        results = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]
        
        # Get schema info
        cursor.execute("PRAGMA table_info(data)")
        schema_info = cursor.fetchall()
        
        # Filter schema to only selected columns
        selected_schema = []
        for col_info in schema_info:
            if col_info[1] in columns:
                selected_schema.append({
                    "name": col_info[1],
                    "type": self._map_sqlite_type(col_info[2]),
                    "nullable": not col_info[3]
                })
        
        # Create output data key
        output_data_key = f"select_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_db_path = f"data/{output_data_key}.db"
        
        # Create new database with results
        output_conn = sqlite3.connect(output_db_path)
        df = pd.DataFrame(results, columns=column_names)
        df.to_sql('data', output_conn, if_exists='replace', index=False)
        
        # Get preview data from the original query results
        preview_data = []
        for row in results[:10]:  # Take first 10 rows
            row_dict = {}
            for i, value in enumerate(row):
                row_dict[column_names[i]] = value
            preview_data.append(row_dict)
        
        # Get row count from results
        row_count = len(results)
        
        conn.close()
        output_conn.close()
        
        return {
            'node_id': 'select_node',
            'operation': 'select',
            'output_data_key': output_data_key,
            'output_schema': selected_schema,
            'row_count': row_count,
            'preview': preview_data
        }
    
    def _execute_filter(self, input_conn: Dict[str, Any], params: List[str]) -> Dict[str, Any]:
        """Execute FILTER transformation"""
        filter_config = json.loads(params[0]) if params else {}
        
        if not filter_config:
            raise ValueError("No filter configuration provided")
        
        column = filter_config['column']
        operator = filter_config['operator']
        value = filter_config['value']
        
        # Connect to database
        conn = sqlite3.connect(input_conn['sqlConnection'])
        cursor = conn.cursor()
        
        # Build WHERE clause
        if operator == 'equals':
            where_clause = f"{column} = '{value}'"
        elif operator == 'not_equals':
            where_clause = f"{column} != '{value}'"
        elif operator == 'greater_than':
            where_clause = f"{column} > {value}"
        elif operator == 'less_than':
            where_clause = f"{column} < {value}"
        elif operator == 'contains':
            where_clause = f"{column} LIKE '%{value}%'"
        else:
            raise ValueError(f"Unsupported operator: {operator}")
        
        # Execute filter query
        query = f"SELECT * FROM data WHERE {where_clause}"
        cursor.execute(query)
        results = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]
        
        # Get schema info
        cursor.execute("PRAGMA table_info(data)")
        schema_info = cursor.fetchall()
        
        # Create output data key
        output_data_key = f"filter_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_db_path = f"data/{output_data_key}.db"
        
        # Create new database with results
        output_conn = sqlite3.connect(output_db_path)
        df = pd.DataFrame(results, columns=column_names)
        df.to_sql('data', output_conn, if_exists='replace', index=False)
        
        # Get preview data from the original query results
        preview_data = []
        for row in results[:10]:  # Take first 10 rows
            row_dict = {}
            for i, value in enumerate(row):
                row_dict[column_names[i]] = value
            preview_data.append(row_dict)
        
        # Get row count from results
        row_count = len(results)
        
        conn.close()
        output_conn.close()
        
        return {
            'node_id': 'filter_node',
            'operation': 'filter',
            'output_data_key': output_data_key,
            'output_schema': [{"name": col[1], "type": self._map_sqlite_type(col[2]), "nullable": not col[3]} for col in schema_info],
            'row_count': row_count,
            'preview': preview_data
        }
    
    def _execute_groupby(self, input_conn: Dict[str, Any], params: List[str]) -> Dict[str, Any]:
        """Execute GROUP BY transformation"""
        groupby_config = json.loads(params[0]) if params else {}
        
        if not groupby_config:
            raise ValueError("No groupby configuration provided")
        
        group_columns = groupby_config['groupColumns']
        aggregations = groupby_config['aggregations']
        
        # Connect to database
        conn = sqlite3.connect(input_conn['sqlConnection'])
        cursor = conn.cursor()
        
        # Build GROUP BY query
        select_parts = group_columns.copy()
        
        for agg in aggregations:
            column = agg['column']
            operation = agg['operation']
            alias = agg.get('alias', f"{operation}_{column}")
            
            if operation == 'sum':
                select_parts.append(f"SUM({column}) AS {alias}")
            elif operation == 'mean':
                select_parts.append(f"AVG({column}) AS {alias}")
            elif operation == 'count':
                select_parts.append(f"COUNT({column}) AS {alias}")
            elif operation == 'min':
                select_parts.append(f"MIN({column}) AS {alias}")
            elif operation == 'max':
                select_parts.append(f"MAX({column}) AS {alias}")
        
        select_clause = ', '.join(select_parts)
        group_clause = ', '.join(group_columns)
        query = f"SELECT {select_clause} FROM data GROUP BY {group_clause}"
        
        # Execute query
        cursor.execute(query)
        results = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]
        
        # Create output data key
        output_data_key = f"groupby_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_db_path = f"data/{output_data_key}.db"
        
        # Create new database with results
        output_conn = sqlite3.connect(output_db_path)
        df = pd.DataFrame(results, columns=column_names)
        df.to_sql('data', output_conn, if_exists='replace', index=False)
        
        # Get preview data from the original query results
        preview_data = []
        for row in results[:10]:  # Take first 10 rows
            row_dict = {}
            for i, value in enumerate(row):
                row_dict[column_names[i]] = value
            preview_data.append(row_dict)
        
        # Get row count from results
        row_count = len(results)
        
        # Create output schema
        output_schema = []
        for col_name in column_names:
            output_schema.append({
                "name": col_name,
                "type": "number" if col_name.startswith(('SUM_', 'AVG_', 'COUNT_', 'MIN_', 'MAX_')) else "string",
                "nullable": False
            })
        
        conn.close()
        output_conn.close()
        
        return {
            'node_id': 'groupby_node',
            'operation': 'groupby',
            'output_data_key': output_data_key,
            'output_schema': output_schema,
            'row_count': row_count,
            'preview': preview_data
        }
    
    def _execute_join(self, input_conn: Dict[str, Any], params: List[str], data_connections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute JOIN transformation"""
        join_config = json.loads(params[0]) if params else {}
        
        if not join_config:
            raise ValueError("No join configuration provided")
        
        join_type = join_config['joinType']
        left_column = join_config['leftColumn']
        right_column = join_config['rightColumn']
        # Support both rightTable and rightDataKey
        right_table = join_config.get('rightTable') or join_config.get('rightDataKey')
        
        if not right_table:
            raise ValueError("No right table/data key specified for JOIN")
        
        # Get right table connection
        right_conn = None
        for conn in data_connections:
            if conn['dataKey'] == right_table:
                right_conn = conn
                break
        
        if not right_conn:
            raise ValueError(f"Right table connection not found: {right_table}")
        
        # Use pandas for joining data from different databases
        left_db = sqlite3.connect(input_conn['sqlConnection'])
        right_db = sqlite3.connect(right_conn['sqlConnection'])
        
        # Read data from both databases
        left_df = pd.read_sql_query("SELECT * FROM data", left_db)
        right_df = pd.read_sql_query("SELECT * FROM data", right_db)
        
        # Perform join using pandas
        if join_type.lower() == 'inner':
            result_df = pd.merge(left_df, right_df, left_on=left_column, right_on=right_column, how='inner', suffixes=('_left', '_right'))
        elif join_type.lower() == 'left':
            result_df = pd.merge(left_df, right_df, left_on=left_column, right_on=right_column, how='left', suffixes=('_left', '_right'))
        elif join_type.lower() == 'right':
            result_df = pd.merge(left_df, right_df, left_on=left_column, right_on=right_column, how='right', suffixes=('_left', '_right'))
        elif join_type.lower() == 'outer':
            result_df = pd.merge(left_df, right_df, left_on=left_column, right_on=right_column, how='outer', suffixes=('_left', '_right'))
        else:
            raise ValueError(f"Unsupported join type: {join_type}")
        
        column_names = result_df.columns.tolist()
        results = result_df.values.tolist()
        
        # Create output data key
        output_data_key = f"join_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_db_path = f"data/{output_data_key}.db"
        
        # Create new database with results
        output_conn = sqlite3.connect(output_db_path)
        result_df.to_sql('data', output_conn, if_exists='replace', index=False)
        
        # Get preview data from the original query results
        preview_data = []
        for row in results[:10]:  # Take first 10 rows
            row_dict = {}
            for i, value in enumerate(row):
                row_dict[column_names[i]] = value
            preview_data.append(row_dict)
        
        # Get row count from results
        row_count = len(results)
        
        # Create output schema (combine both schemas)
        output_schema = []
        for col_name in column_names:
            output_schema.append({
                "name": col_name,
                "type": "string",  # Simplified for now
                "nullable": True
            })
        
        left_db.close()
        right_db.close()
        output_conn.close()
        
        return {
            'node_id': 'join_node',
            'operation': 'join',
            'output_data_key': output_data_key,
            'output_schema': output_schema,
            'row_count': row_count,
            'preview': preview_data
        }
    
    def _get_data_connection(self, data_key: str, data_connections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get data connection by key"""
        for conn in data_connections:
            if conn['dataKey'] == data_key:
                return conn
        raise ValueError(f"Data connection not found: {data_key}")
    
    def _get_final_result(self, data_key: str) -> Dict[str, Any]:
        """Get final result from the last transformation"""
        # This would connect to the final database and get results
        # For now, return mock data
        return {
            'row_count': 100,
            'preview': [],
            'schema': []
        }
    
    def _execute_sort(self, input_conn: Dict[str, Any], params: List[str]) -> Dict[str, Any]:
        """Execute SORT transformation"""
        sort_config = json.loads(params[0]) if params else {}
        
        if not sort_config:
            raise ValueError("No sort configuration provided")
        
        column = sort_config.get('column', '')
        ascending = sort_config.get('ascending', True)
        
        if not column:
            raise ValueError("No column specified for SORT operation")
        
        # Connect to database
        conn = sqlite3.connect(input_conn['sqlConnection'])
        cursor = conn.cursor()
        
        # Build ORDER BY query
        order = 'ASC' if ascending else 'DESC'
        query = f"SELECT * FROM data ORDER BY {column} {order}"
        
        # Execute query
        cursor.execute(query)
        results = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]
        
        # Get schema info
        cursor.execute("PRAGMA table_info(data)")
        schema_info = cursor.fetchall()
        
        # Create output data key
        output_data_key = f"sort_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_db_path = f"data/{output_data_key}.db"
        
        # Create new database with results
        output_conn = sqlite3.connect(output_db_path)
        df = pd.DataFrame(results, columns=column_names)
        df.to_sql('data', output_conn, if_exists='replace', index=False)
        
        # Get preview data
        preview_data = []
        for row in results[:10]:
            row_dict = {}
            for i, value in enumerate(row):
                row_dict[column_names[i]] = value
            preview_data.append(row_dict)
        
        row_count = len(results)
        
        conn.close()
        output_conn.close()
        
        return {
            'node_id': 'sort_node',
            'operation': 'sort',
            'output_data_key': output_data_key,
            'output_schema': [{"name": col[1], "type": self._map_sqlite_type(col[2]), "nullable": not col[3]} for col in schema_info],
            'row_count': row_count,
            'preview': preview_data
        }
    
    def _execute_rename(self, input_conn: Dict[str, Any], params: List[str]) -> Dict[str, Any]:
        """Execute RENAME transformation"""
        rename_config = json.loads(params[0]) if params else {}
        
        if not rename_config:
            raise ValueError("No rename configuration provided")
        
        # rename_config should be like: {"old_name": "new_name", ...}
        
        # Connect to database
        conn = sqlite3.connect(input_conn['sqlConnection'])
        
        # Read all data
        df = pd.read_sql_query("SELECT * FROM data", conn)
        
        # Rename columns
        df = df.rename(columns=rename_config)
        
        column_names = df.columns.tolist()
        results = df.values.tolist()
        
        # Create output data key
        output_data_key = f"rename_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_db_path = f"data/{output_data_key}.db"
        
        # Create new database with results
        output_conn = sqlite3.connect(output_db_path)
        df.to_sql('data', output_conn, if_exists='replace', index=False)
        
        # Get preview data
        preview_data = []
        for row in results[:10]:
            row_dict = {}
            for i, value in enumerate(row):
                row_dict[column_names[i]] = value
            preview_data.append(row_dict)
        
        row_count = len(results)
        
        # Create output schema
        output_schema = []
        for col_name in column_names:
            output_schema.append({
                "name": col_name,
                "type": "string",
                "nullable": True
            })
        
        conn.close()
        output_conn.close()
        
        return {
            'node_id': 'rename_node',
            'operation': 'rename',
            'output_data_key': output_data_key,
            'output_schema': output_schema,
            'row_count': row_count,
            'preview': preview_data
        }
    
    def _execute_calculate(self, input_conn: Dict[str, Any], params: List[str]) -> Dict[str, Any]:
        """Execute CALCULATE transformation - add a new calculated column"""
        calc_config = json.loads(params[0]) if params else {}
        
        if not calc_config:
            raise ValueError("No calculate configuration provided")
        
        new_column = calc_config.get('newColumn', 'calculated')
        expression = calc_config.get('expression', '')
        
        if not expression:
            raise ValueError("No expression provided for CALCULATE operation")
        
        # Connect to database
        conn = sqlite3.connect(input_conn['sqlConnection'])
        
        # Read all data
        df = pd.read_sql_query("SELECT * FROM data", conn)
        
        # Add calculated column
        # For safety, we'll use eval but in a limited context
        # In production, you'd want to parse and validate the expression
        try:
            df[new_column] = df.eval(expression)
        except Exception as e:
            raise ValueError(f"Failed to evaluate expression: {str(e)}")
        
        column_names = df.columns.tolist()
        results = df.values.tolist()
        
        # Create output data key
        output_data_key = f"calculate_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_db_path = f"data/{output_data_key}.db"
        
        # Create new database with results
        output_conn = sqlite3.connect(output_db_path)
        df.to_sql('data', output_conn, if_exists='replace', index=False)
        
        # Get preview data
        preview_data = []
        for row in results[:10]:
            row_dict = {}
            for i, value in enumerate(row):
                row_dict[column_names[i]] = value
            preview_data.append(row_dict)
        
        row_count = len(results)
        
        # Create output schema
        output_schema = []
        for col_name in column_names:
            output_schema.append({
                "name": col_name,
                "type": "number" if col_name == new_column else "string",
                "nullable": True
            })
        
        conn.close()
        output_conn.close()
        
        return {
            'node_id': 'calculate_node',
            'operation': 'calculate',
            'output_data_key': output_data_key,
            'output_schema': output_schema,
            'row_count': row_count,
            'preview': preview_data
        }
    
    def _map_sqlite_type(self, sqlite_type: str) -> str:
        """Map SQLite types to our type system"""
        if sqlite_type.upper() in ['INTEGER', 'REAL']:
            return 'number'
        elif sqlite_type.upper() == 'TEXT':
            return 'string'
        else:
            return 'string'
