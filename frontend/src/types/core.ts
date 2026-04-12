// Core data types - redesigned to match specification
// Updated to fix import issues

export interface ProjectShare {
  id: string;
  sharedWithEmail: string;
  sharedByEmail: string;
  permission: 'view' | 'edit' | 'admin';
  sharedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  datasetCount: number;
  pipelineCount: number;
  graphCount: number;
  isOwner?: boolean;
  ownerEmail?: string;
  permission?: 'view' | 'edit' | 'admin';
}

export interface ProjectDetails extends Project {
  datasets: Dataset[];
  pipelines: Pipeline[];
  graphs: SavedGraph[];
  shares?: ProjectShare[];
}

export interface SavedGraph {
  id: string;
  name: string;
  config: any;
  dataKey: string;
  projectId?: string;
  createdAt: string;
}

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
  operation: 'filter' | 'select' | 'groupby' | 'join' | 'sort' | 'rename' | 'calculate' | 'ml_regression' | 'ml_classification' | 'ml_clustering';
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

export type ChartType = 'scatter' | 'line' | 'bar' | 'area' | 'pie';

// Dataset for uploads
export interface Dataset {
  id: string;
  name: string;
  columns: Column[];
  rowCount: number;
  preview: Record<string, any>[];
  dataKey: string; // Key to reference in Data storage
  projectId?: string;
  uploadedAt?: string;
  /** Optional display name from some upload flows */
  filename?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  nodes: Node[];
  dataConnections: DataConnection[]; // Active data connections
  projectId?: string;
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
  | 'calculate'
  | 'ml_regression'
  | 'ml_classification'
  | 'ml_clustering';

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

// Machine Learning types
export type MLModelType = 'linear' | 'logistic' | 'decision_tree' | 'random_forest' | 'kmeans';

export interface MLRegressionConfig {
  modelType: 'linear' | 'decision_tree' | 'random_forest';
  featureColumns: string[];
  targetColumn: string;
  testSize: number;
}

export interface MLClassificationConfig {
  modelType: 'logistic' | 'decision_tree' | 'random_forest';
  featureColumns: string[];
  targetColumn: string;
  testSize: number;
}

export interface MLClusteringConfig {
  featureColumns: string[];
  nClusters: number;
}

export interface MLResults {
  model_type: string;
  metrics: Record<string, number>;
  feature_columns: string[];
  target_column?: string;
  train_size?: number;
  test_size?: number;
  cluster_stats?: Array<{cluster: number; size: number; percentage: number}>;
  cluster_centers?: number[][];
  classes?: string[];
  model_serialized: string;
}