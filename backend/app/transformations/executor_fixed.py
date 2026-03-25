"""
Fixed transformation execution engine for Cascade
Implements the core transformations: select, filter, groupby, join
"""

import sqlite3
import json
from collections import defaultdict, deque
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report, silhouette_score
from sklearn.preprocessing import LabelEncoder
import pickle
import base64


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
        start_time = datetime.now()
        
        try:
            # If no nodes, just return the first data connection's data
            if not nodes:
                if data_connections:
                    first_conn = data_connections[0]
                    conn = sqlite3.connect(first_conn['sqlConnection'])
                    cursor = conn.cursor()
                    cursor.execute("SELECT * FROM data LIMIT 10")
                    results = cursor.fetchall()
                    column_names = [desc[0] for desc in cursor.description]
                    
                    preview_data = []
                    for row in results:
                        row_dict = {}
                        for i, value in enumerate(row):
                            row_dict[column_names[i]] = value
                        preview_data.append(row_dict)
                    
                    cursor.execute("SELECT COUNT(*) FROM data")
                    row_count = cursor.fetchone()[0]
                    conn.close()
                    
                    return {
                        "status": "success",
                        "message": "No transformations - showing source data",
                        "executionTime": f"{(datetime.now() - start_time).total_seconds():.2f}s",
                        "outputRows": row_count,
                        "data": preview_data,
                        "outputSchema": first_conn.get('schema', {}).get('columns', []),
                        "timestamp": datetime.now().isoformat(),
                        "executionResults": []
                    }
                else:
                    raise ValueError("No data connections provided")
            
            # Build execution graph - track dependencies
            execution_order = self._build_execution_order(nodes)
            
            # Execute transformations in order, tracking intermediate results
            node_outputs = {}  # Map node_id -> output_data_key
            execution_results = []
            
            for node in execution_order:
                node_id = node.get('id', 'unknown')
                
                # Determine input data key
                parent_id = node.get('parent')
                if parent_id and parent_id in node_outputs:
                    # Use output from parent transform node
                    input_data_key = node_outputs[parent_id]
                    print(f"Node {node_id} using parent output: {input_data_key}")
                else:
                    # Use the data key from the node (should be a data source key)
                    input_data_key = node.get('data')
                    print(f"Node {node_id} using data source: {input_data_key}")
                
                # Execute the transformation
                result = self._execute_node(node, input_data_key, data_connections)
                
                # Store output for child nodes - add to data_connections dynamically
                output_key = result['output_data_key']
                node_outputs[node_id] = output_key
                
                # Add the output as a new data connection for subsequent nodes
                new_connection = {
                    'dataKey': output_key,
                    'sqlConnection': f"data/{output_key}.db",
                    'schema': {'columns': result.get('output_schema', [])},
                    'rowCount': result.get('row_count', 0)
                }
                data_connections.append(new_connection)
                
                # Add node ID to result
                result['node_id'] = node_id
                execution_results.append(result)
                
                print(f"Node {node_id} completed, output: {output_key}")
            
            # Get final result from the last execution
            if execution_results:
                final_result = execution_results[-1]
                execution_time = (datetime.now() - start_time).total_seconds()
                
                return {
                    "status": "success",
                    "message": "Pipeline executed successfully",
                    "executionTime": f"{execution_time:.2f}s",
                    "outputRows": final_result['row_count'],
                    "data": final_result['preview'],
                    "outputSchema": final_result.get('output_schema', []),
                    "timestamp": datetime.now().isoformat(),
                    "executionResults": execution_results,
                    "nodeOutputs": node_outputs  # Include mapping of node outputs
                }
            else:
                raise ValueError("No transformations were executed")
            
        except Exception as e:
            import traceback
            return {
                "status": "error",
                "message": f"Pipeline execution failed: {str(e)}",
                "error": str(e),
                "traceback": traceback.format_exc(),
                "timestamp": datetime.now().isoformat()
            }

    def validate_pipeline_graph(
        self, nodes: List[Dict[str, Any]], data_connections: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Run the same per-node execution as execute_pipeline, stopping at first failure.
        Returns { valid: bool, errors: [{ nodeId: str, message: str }] }
        """
        dc_copy: List[Dict[str, Any]] = [dict(d) for d in data_connections]
        errors: List[Dict[str, str]] = []

        if not nodes:
            if not dc_copy:
                return {
                    "valid": False,
                    "errors": [{"nodeId": "", "message": "No data connections"}],
                }
            return {"valid": True, "errors": []}

        node_outputs: Dict[str, str] = {}
        execution_order = self._build_execution_order(nodes)

        for node in execution_order:
            node_id = node.get("id", "unknown")
            try:
                parent_id = node.get("parent")
                if parent_id and parent_id in node_outputs:
                    input_data_key = node_outputs[parent_id]
                else:
                    input_data_key = node.get("data")

                result = self._execute_node(node, input_data_key, dc_copy)
                output_key = result["output_data_key"]
                node_outputs[node_id] = output_key
                dc_copy.append(
                    {
                        "dataKey": output_key,
                        "sqlConnection": f"data/{output_key}.db",
                        "schema": {"columns": result.get("output_schema", [])},
                        "rowCount": result.get("row_count", 0),
                    }
                )
            except Exception as e:
                errors.append({"nodeId": str(node_id), "message": str(e)})
                return {"valid": False, "errors": errors}

        return {"valid": True, "errors": []}

    def _build_execution_order(self, nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Topological order: each node runs after its transform parents (parent / secondaryParent).
        Sorting by id was wrong — e.g. transform-filter-* can sort before transform-select-* and
        then `data` still holds the parent node id, which is not a data connection key.
        """
        if not nodes:
            return []

        nodes_with_id = [n for n in nodes if n.get('id')]
        nodes_without_id = [n for n in nodes if not n.get('id')]
        if not nodes_with_id:
            return list(nodes)

        node_by_id: Dict[str, Dict[str, Any]] = {}
        for n in nodes_with_id:
            node_by_id[n['id']] = n

        node_ids: Set[str] = set(node_by_id.keys())
        # deps[nid] = transform node ids that must run before nid
        deps: Dict[str, Set[str]] = {nid: set() for nid in node_ids}
        for n in nodes_with_id:
            nid = n.get('id')
            if not nid:
                continue
            for pkey in ('parent', 'secondaryParent'):
                p = n.get(pkey)
                if p and p in node_ids and p != nid:
                    deps[nid].add(p)

        # Edge dep -> nid (dep must complete before nid)
        adj: Dict[str, List[str]] = defaultdict(list)
        in_degree: Dict[str, int] = {nid: 0 for nid in node_ids}
        for nid in node_ids:
            for d in deps[nid]:
                adj[d].append(nid)
                in_degree[nid] += 1

        queue = deque(sorted(nid for nid in node_ids if in_degree[nid] == 0))
        ordered: List[Dict[str, Any]] = []
        while queue:
            cur = queue.popleft()
            ordered.append(node_by_id[cur])
            for succ in sorted(adj[cur]):
                in_degree[succ] -= 1
                if in_degree[succ] == 0:
                    queue.append(succ)

        if len(ordered) != len(nodes_with_id):
            # Cycle or inconsistent graph — preserve deterministic fallback
            return sorted(nodes, key=lambda x: x.get('id', ''))

        return ordered + nodes_without_id
    
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
            node_data_key = node.get('data')
            if not node_data_key:
                # Try to find the first available data connection
                if data_connections:
                    input_conn = data_connections[0]
                else:
                    raise ValueError(f"No data connection specified for node {node.get('id', 'unknown')}")
            else:
                input_conn = self._get_data_connection(node_data_key, data_connections)
        
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
        elif operation == 'ml_regression':
            return self._execute_ml_regression(input_conn, params)
        elif operation == 'ml_classification':
            return self._execute_ml_classification(input_conn, params)
        elif operation == 'ml_clustering':
            return self._execute_ml_clustering(input_conn, params)
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
        
        join_type = join_config.get('joinType', 'inner')
        left_column = join_config.get('leftColumn', '')
        right_column = join_config.get('rightColumn', '')
        # Support both rightTable and rightDataKey (from graph edges)
        right_table = join_config.get('rightTable') or join_config.get('rightDataKey')
        
        print(f"JOIN operation - Config: {join_config}")
        print(f"JOIN - Left column: {left_column}, Right column: {right_column}")
        print(f"JOIN - Right table key: {right_table}")
        
        # Validate all required fields
        if not left_column:
            raise ValueError("Left column not specified for JOIN")
        if not right_column:
            raise ValueError("Right column not specified for JOIN")
        if not right_table:
            raise ValueError("No right table/data key specified for JOIN. Make sure to connect both input handles.")
        
        # Get right table connection
        right_conn = None
        available_keys = [conn['dataKey'] for conn in data_connections]
        
        for conn in data_connections:
            if conn['dataKey'] == right_table:
                right_conn = conn
                break
        
        if not right_conn:
            raise ValueError(f"Right table connection not found: '{right_table}'. Available connections: {available_keys}")
        
        # Use pandas for joining data from different databases
        try:
            left_db = sqlite3.connect(input_conn['sqlConnection'])
            right_db = sqlite3.connect(right_conn['sqlConnection'])
            
            # Read data from both databases
            left_df = pd.read_sql_query("SELECT * FROM data", left_db)
            right_df = pd.read_sql_query("SELECT * FROM data", right_db)
            
            # Validate columns exist
            if left_column not in left_df.columns:
                raise ValueError(f"Column '{left_column}' not found in left table. Available columns: {list(left_df.columns)}")
            if right_column not in right_df.columns:
                raise ValueError(f"Column '{right_column}' not found in right table. Available columns: {list(right_df.columns)}")
            
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
        except Exception as e:
            if left_db:
                left_db.close()
            if right_db:
                right_db.close()
            raise ValueError(f"Join failed: {str(e)}")
        
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
    
    def _execute_ml_regression(self, input_conn: Dict[str, Any], params: List[str]) -> Dict[str, Any]:
        """Execute ML Regression (Linear, Decision Tree, Random Forest)"""
        ml_config = json.loads(params[0]) if params else {}
        
        model_type = ml_config.get('modelType', 'linear')
        feature_columns = ml_config.get('featureColumns', [])
        target_column = ml_config.get('targetColumn', '')
        test_size = ml_config.get('testSize', 0.2)
        
        if not feature_columns or not target_column:
            raise ValueError("Feature columns and target column must be specified")
        
        # Load data using pandas
        conn = sqlite3.connect(input_conn['sqlConnection'])
        df = pd.read_sql_query("SELECT * FROM data", conn)
        conn.close()
        
        # Validate columns
        missing_cols = [col for col in feature_columns + [target_column] if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Columns not found: {missing_cols}")
        
        # Prepare features and target
        X = df[feature_columns].copy()
        y = df[target_column].copy()
        
        # Handle categorical features with label encoding
        label_encoders = {}
        for col in X.columns:
            if X[col].dtype == 'object':
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
                label_encoders[col] = le
        
        # Handle missing values
        X = X.fillna(X.mean())
        y = y.fillna(y.mean())
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        
        # Train model
        if model_type == 'linear':
            model = LinearRegression()
        elif model_type == 'decision_tree':
            model = DecisionTreeRegressor(random_state=42)
        elif model_type == 'random_forest':
            model = RandomForestRegressor(n_estimators=100, random_state=42)
        else:
            raise ValueError(f"Unsupported regression model type: {model_type}")
        
        model.fit(X_train, y_train)
        
        # Make predictions
        y_pred = model.predict(X_test)
        
        # Calculate metrics
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_test, y_pred)
        
        # Create results dataframe with predictions
        results_df = X_test.copy()
        results_df['actual'] = y_test.values
        results_df['predicted'] = y_pred
        results_df['error'] = results_df['actual'] - results_df['predicted']
        
        # Save results to new database
        output_data_key = f"ml_regression_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_db_path = f"data/{output_data_key}.db"
        output_conn = sqlite3.connect(output_db_path)
        results_df.to_sql('data', output_conn, if_exists='replace', index=False)
        output_conn.close()
        
        # Serialize model
        model_bytes = pickle.dumps(model)
        model_b64 = base64.b64encode(model_bytes).decode('utf-8')
        
        # Create preview data
        preview_data = results_df.head(10).to_dict('records')
        
        # Create output schema
        output_schema = [{"name": col, "type": "number", "nullable": True} for col in results_df.columns]
        
        return {
            'node_id': 'ml_regression_node',
            'operation': 'ml_regression',
            'output_data_key': output_data_key,
            'output_schema': output_schema,
            'row_count': len(results_df),
            'preview': preview_data,
            'ml_results': {
                'model_type': model_type,
                'metrics': {
                    'mse': float(mse),
                    'rmse': float(rmse),
                    'r2_score': float(r2)
                },
                'feature_columns': feature_columns,
                'target_column': target_column,
                'train_size': len(X_train),
                'test_size': len(X_test),
                'model_serialized': model_b64
            }
        }
    
    def _execute_ml_classification(self, input_conn: Dict[str, Any], params: List[str]) -> Dict[str, Any]:
        """Execute ML Classification (Logistic Regression, Decision Tree, Random Forest)"""
        ml_config = json.loads(params[0]) if params else {}
        
        model_type = ml_config.get('modelType', 'logistic')
        feature_columns = ml_config.get('featureColumns', [])
        target_column = ml_config.get('targetColumn', '')
        test_size = ml_config.get('testSize', 0.2)
        
        if not feature_columns or not target_column:
            raise ValueError("Feature columns and target column must be specified")
        
        # Load data
        conn = sqlite3.connect(input_conn['sqlConnection'])
        df = pd.read_sql_query("SELECT * FROM data", conn)
        conn.close()
        
        # Validate columns
        missing_cols = [col for col in feature_columns + [target_column] if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Columns not found: {missing_cols}")
        
        # Prepare features and target
        X = df[feature_columns].copy()
        y = df[target_column].copy()
        
        # Encode target if it's categorical
        target_encoder = None
        if y.dtype == 'object':
            target_encoder = LabelEncoder()
            y = target_encoder.fit_transform(y.astype(str))
        
        # Handle categorical features
        label_encoders = {}
        for col in X.columns:
            if X[col].dtype == 'object':
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
                label_encoders[col] = le
        
        # Handle missing values
        X = X.fillna(X.mean())
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        
        # Train model
        if model_type == 'logistic':
            model = LogisticRegression(max_iter=1000, random_state=42)
        elif model_type == 'decision_tree':
            model = DecisionTreeClassifier(random_state=42)
        elif model_type == 'random_forest':
            model = RandomForestClassifier(n_estimators=100, random_state=42)
        else:
            raise ValueError(f"Unsupported classification model type: {model_type}")
        
        model.fit(X_train, y_train)
        
        # Make predictions
        y_pred = model.predict(X_test)
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        
        # Get class labels
        classes = np.unique(y_train)
        class_labels = target_encoder.inverse_transform(classes) if target_encoder else classes
        
        # Create results dataframe
        results_df = X_test.copy()
        results_df['actual'] = y_test
        results_df['predicted'] = y_pred
        results_df['correct'] = (results_df['actual'] == results_df['predicted']).astype(int)
        
        # Save results
        output_data_key = f"ml_classification_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_db_path = f"data/{output_data_key}.db"
        output_conn = sqlite3.connect(output_db_path)
        results_df.to_sql('data', output_conn, if_exists='replace', index=False)
        output_conn.close()
        
        # Serialize model
        model_bytes = pickle.dumps(model)
        model_b64 = base64.b64encode(model_bytes).decode('utf-8')
        
        # Create preview data
        preview_data = results_df.head(10).to_dict('records')
        
        # Create output schema
        output_schema = [{"name": col, "type": "number", "nullable": True} for col in results_df.columns]
        
        return {
            'node_id': 'ml_classification_node',
            'operation': 'ml_classification',
            'output_data_key': output_data_key,
            'output_schema': output_schema,
            'row_count': len(results_df),
            'preview': preview_data,
            'ml_results': {
                'model_type': model_type,
                'metrics': {
                    'accuracy': float(accuracy)
                },
                'classes': [str(c) for c in class_labels],
                'feature_columns': feature_columns,
                'target_column': target_column,
                'train_size': len(X_train),
                'test_size': len(X_test),
                'model_serialized': model_b64
            }
        }
    
    def _execute_ml_clustering(self, input_conn: Dict[str, Any], params: List[str]) -> Dict[str, Any]:
        """Execute ML Clustering (K-Means)"""
        ml_config = json.loads(params[0]) if params else {}
        
        feature_columns = ml_config.get('featureColumns', [])
        n_clusters = ml_config.get('nClusters', 3)
        
        if not feature_columns:
            raise ValueError("Feature columns must be specified")
        
        # Load data
        conn = sqlite3.connect(input_conn['sqlConnection'])
        df = pd.read_sql_query("SELECT * FROM data", conn)
        conn.close()
        
        # Validate columns
        missing_cols = [col for col in feature_columns if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Columns not found: {missing_cols}")
        
        # Prepare features
        X = df[feature_columns].copy()
        
        # Handle categorical features
        label_encoders = {}
        for col in X.columns:
            if X[col].dtype == 'object':
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
                label_encoders[col] = le
        
        # Handle missing values
        X = X.fillna(X.mean())
        
        # Train KMeans model
        model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        clusters = model.fit_predict(X)
        
        # Calculate silhouette score
        silhouette = silhouette_score(X, clusters) if len(X) > n_clusters else 0
        
        # Create results dataframe
        results_df = df.copy()
        results_df['cluster'] = clusters
        
        # Calculate cluster statistics
        cluster_stats = []
        for i in range(n_clusters):
            cluster_data = results_df[results_df['cluster'] == i]
            cluster_stats.append({
                'cluster': int(i),
                'size': len(cluster_data),
                'percentage': float(len(cluster_data) / len(results_df) * 100)
            })
        
        # Save results
        output_data_key = f"ml_clustering_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_db_path = f"data/{output_data_key}.db"
        output_conn = sqlite3.connect(output_db_path)
        results_df.to_sql('data', output_conn, if_exists='replace', index=False)
        output_conn.close()
        
        # Serialize model
        model_bytes = pickle.dumps(model)
        model_b64 = base64.b64encode(model_bytes).decode('utf-8')
        
        # Create preview data
        preview_data = results_df.head(10).to_dict('records')
        
        # Create output schema
        output_schema = [{"name": col, "type": "string", "nullable": True} for col in results_df.columns]
        
        return {
            'node_id': 'ml_clustering_node',
            'operation': 'ml_clustering',
            'output_data_key': output_data_key,
            'output_schema': output_schema,
            'row_count': len(results_df),
            'preview': preview_data,
            'ml_results': {
                'model_type': 'kmeans',
                'metrics': {
                    'silhouette_score': float(silhouette),
                    'n_clusters': n_clusters
                },
                'cluster_stats': cluster_stats,
                'feature_columns': feature_columns,
                'cluster_centers': model.cluster_centers_.tolist(),
                'model_serialized': model_b64
            }
        }
