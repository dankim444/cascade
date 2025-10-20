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
    set((state) => ({
      datasets: [...state.datasets, dataset]
    }));
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
    const pipeline = {
      nodes: state.nodes,
      dataConnections: state.dataConnections
    };
    
    try {
      const response = await fetch('http://localhost:8000/api/transformations/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipeline),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Pipeline execution failed:', error);
      throw error;
    }
  }
}));
