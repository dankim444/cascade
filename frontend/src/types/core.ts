// Core data types - redesigned to match specification
// Updated to fix import issues

export interface Column {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  nullable: boolean;
}

export interface Schema {
  columns: Column[];
}

// Transformation interface as specified
export interface Transformation {
  operation: 'filter' | 'select' | 'groupby' | 'join' | 'sort' | 'rename' | 'calculate';
  params: string[]; // Define what this list has for each type of transform
}

// Node interface as specified - all nodes are transforms
export interface Node {
  id: string;
  transform: Transformation;
  data: string; // data key
  parent?: string; // parent transform id
  child?: string; // child transform id
  position: { x: number; y: number }; // for UI positioning
}

// Data storage - SQL connections instead of full table copies
export interface DataConnection {
  dataKey: string;
  sqlConnection: string; // SQL connection string or reference
  schema: Schema;
  rowCount: number;
  lastAccessed: Date;
}

// Dataset for uploads
export interface Dataset {
  id: string;
  name: string;
  columns: Column[];
  rowCount: number;
  preview: Record<string, any>[];
  dataKey: string; // Key to reference in Data storage
}

export interface Pipeline {
  id: string;
  name: string;
  nodes: Node[];
  dataConnections: DataConnection[]; // Active data connections
  createdAt: Date;
  updatedAt: Date;
}

// Transform operation types
export type TransformOperation = 
  | 'filter'
  | 'select' 
  | 'groupby'
  | 'join'
  | 'sort'
  | 'rename'
  | 'calculate';

// Configuration for different transform operations
export interface FilterConfig {
  column: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number;
}

export interface SelectConfig {
  columns: string[];
}

export interface GroupByConfig {
  groupColumns: string[];
  aggregations: Aggregation[];
}

export interface JoinConfig {
  joinType: 'inner' | 'left' | 'right' | 'outer';
  leftColumn: string;
  rightColumn: string;
  rightTable: string;
}

export interface Aggregation {
  column: string;
  operation: 'sum' | 'mean' | 'count' | 'min' | 'max';
  alias?: string;
}

// Transform parameter definitions for each operation type
export interface TransformParams {
  filter: {
    column: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: string | number;
  };
  select: {
    columns: string[];
  };
  groupby: {
    groupColumns: string[];
    aggregations: Aggregation[];
  };
  join: {
    joinType: 'inner' | 'left' | 'right' | 'outer';
    leftColumn: string;
    rightColumn: string;
    rightTable: string;
  };
}