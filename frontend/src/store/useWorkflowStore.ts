import { create } from 'zustand';
import type { Node, Transformation, DataConnection, Pipeline as PipelineType, Dataset } from '../types';

interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowState {
  // Pipeline state
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  
  // Data connections
  dataConnections: DataConnection[];
  
  // Datasets
  datasets: Dataset[];
  selectedDatasetId: string | null;
  
  // Actions
  addNode: (node: Node) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: Edge) => void;
  deleteEdge: (edgeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  
  // Dataset actions
  addDataset: (dataset: Dataset) => void;
  setSelectedDataset: (datasetId: string | null) => void;
  
  // Data connection actions
  addDataConnection: (connection: DataConnection) => void;
  removeDataConnection: (dataKey: string) => void;
  
  // Pipeline actions
  savePipeline: () => void;
  loadPipeline: (pipeline: PipelineType) => void;
  executePipeline: () => Promise<any>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNodeId: null,
  dataConnections: [],
  datasets: [],
  selectedDatasetId: null,

  // Node actions
  addNode: (node: Node) => {
    set((state) => ({
      nodes: [...state.nodes, node]
    }));
  },

  updateNode: (nodeId: string, updates: Partial<Node>) => {
    set((state) => ({
      nodes: state.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));
  },

  deleteNode: (nodeId: string) => {
    set((state) => ({
      nodes: state.nodes.filter(node => node.id !== nodeId),
      edges: state.edges.filter(edge => 
        edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId
    }));
  },

  addEdge: (edge: Edge) => {
    set((state) => ({
      edges: [...state.edges, edge]
    }));
  },

  deleteEdge: (edgeId: string) => {
    set((state) => ({
      edges: state.edges.filter(edge => edge.id !== edgeId)
    }));
  },

  setSelectedNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  // Dataset actions
  addDataset: (dataset: Dataset) => {
    set((state) => {
      // Also create a data connection for this dataset
      const newDataConnection: DataConnection = {
        dataKey: dataset.dataKey,
        sqlConnection: `data/${dataset.dataKey}.db`, // This will be handled by backend
        schema: { columns: dataset.columns },
        rowCount: dataset.rowCount,
        lastAccessed: new Date()
      };
      
      return {
        datasets: [...state.datasets, dataset],
        dataConnections: [...state.dataConnections, newDataConnection]
      };
    });
  },

  setSelectedDataset: (datasetId: string | null) => {
    set({ selectedDatasetId: datasetId });
  },

  // Data connection actions
  addDataConnection: (connection: DataConnection) => {
    set((state) => ({
      dataConnections: [...state.dataConnections, connection]
    }));
  },

  removeDataConnection: (dataKey: string) => {
    set((state) => ({
      dataConnections: state.dataConnections.filter(conn => conn.dataKey !== dataKey)
    }));
  },

  // Pipeline actions
  savePipeline: () => {
    const state = get();
    const pipeline: PipelineType = {
      id: 'pipeline-' + Date.now(),
      name: 'Untitled Pipeline',
      nodes: state.nodes,
      dataConnections: state.dataConnections,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // In a real app, this would save to backend
    console.log('Saving pipeline:', pipeline);
    localStorage.setItem('cascade-pipeline', JSON.stringify(pipeline));
  },

  loadPipeline: (pipeline: PipelineType) => {
    set({
      nodes: pipeline.nodes,
      dataConnections: pipeline.dataConnections
    });
  },

  executePipeline: async () => {
    const state = get();
    
    // Build execution order based on edges
    const buildExecutionOrder = () => {
      const nodes = state.nodes;
      const edges = state.edges;
      
      // Find root nodes (no incoming edges)
      const nodeIds = new Set(nodes.map(n => n.id));
      const nodesWithIncoming = new Set(edges.map(e => e.target));
      const rootNodes = nodes.filter(n => !nodesWithIncoming.has(n.id));
      
      // If no edges, just return nodes in order
      if (edges.length === 0) {
        return nodes;
      }
      
      // Simple topological sort
      const visited = new Set<string>();
      const result: Node[] = [];
      
      const visit = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        
        // Visit all nodes this one depends on (incoming edges)
        const incomingEdges = edges.filter(e => e.target === nodeId);
        incomingEdges.forEach(edge => visit(edge.source));
        
        // Add this node
        const node = nodes.find(n => n.id === nodeId);
        if (node) result.push(node);
      };
      
      // Visit all nodes
      nodes.forEach(n => visit(n.id));
      
      return result;
    };
    
    const orderedNodes = buildExecutionOrder();
    
    // Create pipeline with ordered nodes and data connections
    const pipeline = {
      nodes: orderedNodes.map(node => ({
        id: node.id,
        transform: node.transform,
        data: node.data,
        parent: state.edges.find(e => e.target === node.id)?.source,
        child: state.edges.find(e => e.source === node.id)?.target
      })),
      dataConnections: state.dataConnections.map(dc => ({
        dataKey: dc.dataKey,
        sqlConnection: dc.sqlConnection,
        schema: dc.schema,
        rowCount: dc.rowCount
      }))
    };
    
    console.log('Executing pipeline:', pipeline);
    
    try {
      const response = await fetch('http://localhost:8000/api/transformations/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipeline),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Pipeline execution result:', result);
      return result;
    } catch (error) {
      console.error('Pipeline execution failed:', error);
      throw error;
    }
  }
}));
