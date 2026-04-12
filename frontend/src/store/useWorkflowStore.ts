import { create } from 'zustand';
import type { Node as FlowNode, Edge as FlowEdge } from 'reactflow';
import type { DataConnection, Pipeline as PipelineType, Dataset } from '../types';
import { API_BASE_URL } from '../config/apiBase';

// Store for node execution results
interface NodeExecutionResult {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error';
  outputData?: any[];
  outputRows?: number;
  outputSchema?: any[];
  error?: string;
  timestamp?: Date;
  ml_results?: unknown;
}

interface WorkflowState {
  // Pipeline state - using React Flow types
  flowNodes: FlowNode[];
  flowEdges: FlowEdge[];
  selectedNodeId: string | null;
  
  // Node execution history
  nodeResults: Map<string, NodeExecutionResult>;
  
  // Data connections
  dataConnections: DataConnection[];
  
  // Datasets
  datasets: Dataset[];
  selectedDatasetId: string | null;
  
  // Actions for React Flow nodes
  setFlowNodes: (nodes: FlowNode[]) => void;
  setFlowEdges: (edges: FlowEdge[]) => void;
  addFlowNode: (node: FlowNode) => void;
  updateFlowNode: (nodeId: string, updates: any) => void;
  deleteFlowNode: (nodeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  
  // Node result actions
  setNodeResult: (nodeId: string, result: NodeExecutionResult) => void;
  getNodeResult: (nodeId: string) => NodeExecutionResult | undefined;
  clearNodeResults: () => void;
  
  // Dataset actions
  addDataset: (dataset: Dataset) => void;
  setDatasets: (datasets: Dataset[]) => void;
  setSelectedDataset: (datasetId: string | null) => void;
  
  // Data connection actions
  addDataConnection: (connection: DataConnection) => void;
  setDataConnections: (connections: DataConnection[]) => void;
  removeDataConnection: (dataKey: string) => void;
  
  // Pipeline actions
  savePipeline: () => void;
  loadPipeline: (pipeline: PipelineType) => void;
  executePipeline: (pipelineId?: string, projectId?: string) => Promise<any>;
  executeToNode: (
    nodeId: string,
    pipelineId?: string,
    projectId?: string,
    options?: { persistOutputAsDataset?: boolean }
  ) => Promise<any>;
  
  // Current pipeline context
  currentPipelineId: string | null;
  currentProjectId: string | null;
  setPipelineContext: (pipelineId: string | null, projectId: string | null) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  flowNodes: [],
  flowEdges: [],
  selectedNodeId: null,
  nodeResults: new Map(),
  dataConnections: [],
  datasets: [],
  selectedDatasetId: null,
  currentPipelineId: null,
  currentProjectId: null,
  
  setPipelineContext: (pipelineId: string | null, projectId: string | null) => {
    set({ currentPipelineId: pipelineId, currentProjectId: projectId });
  },

  // React Flow node actions
  setFlowNodes: (nodes: FlowNode[]) => {
    set({ flowNodes: nodes });
  },

  setFlowEdges: (edges: FlowEdge[]) => {
    set({ flowEdges: edges });
  },

  addFlowNode: (node: FlowNode) => {
    set((state) => ({
      flowNodes: [...state.flowNodes, node]
    }));
  },

  updateFlowNode: (nodeId: string, updates: any) => {
    set((state) => ({
      flowNodes: state.flowNodes.map(node =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...updates } } : node
      )
    }));
  },

  deleteFlowNode: (nodeId: string) => {
    set((state) => ({
      flowNodes: state.flowNodes.filter(node => node.id !== nodeId),
      flowEdges: state.flowEdges.filter(edge => 
        edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId
    }));
  },

  setSelectedNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  // Node result actions
  setNodeResult: (nodeId: string, result: NodeExecutionResult) => {
    set((state) => {
      const newResults = new Map(state.nodeResults);
      newResults.set(nodeId, result);
      return { nodeResults: newResults };
    });
  },

  getNodeResult: (nodeId: string) => {
    return get().nodeResults.get(nodeId);
  },

  clearNodeResults: () => {
    set({ nodeResults: new Map() });
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

  setDatasets: (datasets: Dataset[]) => {
    set({ datasets });
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

  setDataConnections: (connections: DataConnection[]) => {
    set({ dataConnections: connections });
  },

  removeDataConnection: (dataKey: string) => {
    set((state) => ({
      dataConnections: state.dataConnections.filter(conn => conn.dataKey !== dataKey)
    }));
  },

  // Pipeline actions
  savePipeline: () => {
    const state = get();
    const pipeline = {
      id: 'pipeline-' + Date.now(),
      name: 'Untitled Pipeline',
      flowNodes: state.flowNodes,
      flowEdges: state.flowEdges,
      dataConnections: state.dataConnections,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Saving pipeline:', pipeline);
    localStorage.setItem('cascade-pipeline', JSON.stringify(pipeline));
  },

  loadPipeline: (pipeline: any) => {
    set({
      flowNodes: pipeline.flowNodes || [],
      flowEdges: pipeline.flowEdges || [],
      dataConnections: pipeline.dataConnections || []
    });
  },

  executeToNode: async (
    targetNodeId: string,
    pipelineId?: string,
    projectId?: string,
    options?: { persistOutputAsDataset?: boolean }
  ) => {
    const state = get();
    
    // Build path from data sources to target node (topological order)
    const buildPathToNode = (targetId: string): FlowNode[] => {
      const path: FlowNode[] = [];
      const visited = new Set<string>();
      
      const traverse = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        
        // Get incoming edges (parent nodes)
        const incomingEdges = state.flowEdges.filter(e => e.target === nodeId);
        
        // Visit parent nodes first (depth-first)
        incomingEdges.forEach(edge => traverse(edge.source));
        
        // Add current node
        const node = state.flowNodes.find(n => n.id === nodeId);
        if (node) path.push(node);
      };
      
      traverse(targetId);
      return path;
    };
    
    const nodesToExecute = buildPathToNode(targetNodeId);
    
    // Convert to backend format with proper data flow
    const transformNodes = nodesToExecute.filter(node => node.type === 'transformNode' || node.type === 'mlNode');
    
    const pipeline = {
      nodes: transformNodes.map((node) => {
        const isJoinNode = node.data.operation === 'join';
        
        if (isJoinNode) {
          // Join nodes have TWO inputs
          const leftEdge = state.flowEdges.find(e => e.target === node.id && e.targetHandle === 'input-left');
          const rightEdge = state.flowEdges.find(e => e.target === node.id && e.targetHandle === 'input-right');
          
          // Get left input data key
          let leftDataKey = '';
          if (leftEdge) {
            const leftNode = state.flowNodes.find(n => n.id === leftEdge.source);
            if (leftNode?.type === 'dataNode') {
              leftDataKey = leftNode.data.dataKey;
            } else {
              leftDataKey = leftEdge.source; // Transform node - backend will resolve
            }
          }
          
          // Get right input data key
          let rightDataKey = '';
          if (rightEdge) {
            const rightNode = state.flowNodes.find(n => n.id === rightEdge.source);
            if (rightNode?.type === 'dataNode') {
              rightDataKey = rightNode.data.dataKey;
            } else {
              rightDataKey = rightEdge.source; // Transform node - backend will resolve
            }
          }
          
          // Update config with the right table key
          const joinConfig = {
            ...node.data.config,
            rightDataKey: rightDataKey, // Add right table reference
          };
          
          return {
            id: node.id,
            transform: {
              operation: node.data.operation,
              params: [JSON.stringify(joinConfig)]
            },
            data: leftDataKey, // Left table is primary input
            parent: leftEdge?.source,
            child: state.flowEdges.find(e => e.source === node.id)?.target,
            secondaryParent: rightEdge?.source, // Track secondary input
          };
        } else {
          // Regular nodes with single input
          const parentEdge = state.flowEdges.find(e => e.target === node.id);
          
          // Determine input data key
          let inputDataKey: string;
          if (parentEdge) {
            const parentNode = state.flowNodes.find(n => n.id === parentEdge.source);
            if (parentNode?.type === 'dataNode') {
              // Parent is a data source
              inputDataKey = parentNode.data.dataKey;
            } else {
              // Parent is a transform - use its output
              // The output key will be generated by backend, use parent ID as reference
              inputDataKey = parentEdge.source;
            }
          } else {
            // No parent edge - use first available data connection
            inputDataKey = state.dataConnections[0]?.dataKey || '';
          }
          
          return {
            id: node.id,
            transform: {
              operation: node.data.operation,
              params: [JSON.stringify(node.data.config || {})]
            },
            data: inputDataKey,
            parent: parentEdge?.source,
            child: state.flowEdges.find(e => e.source === node.id)?.target
          };
        }
      }),
      dataConnections: state.dataConnections.map(dc => ({
        dataKey: dc.dataKey,
        sqlConnection: dc.sqlConnection,
        schema: dc.schema,
        rowCount: dc.rowCount
      })),
      id: pipelineId || state.currentPipelineId || undefined,
      projectId: projectId || state.currentProjectId || undefined,
      persistOutputAsDataset: options?.persistOutputAsDataset === true,
    };
    
    console.log('Executing to node:', targetNodeId);
    console.log('Execution path:', nodesToExecute.map(n => `${n.id} (${n.type})`));
    console.log('Pipeline request:', JSON.stringify(pipeline, null, 2));
    
    try {
      // Mark nodes as running
      nodesToExecute.forEach(node => {
        if (node.type === 'transformNode' || node.type === 'mlNode') {
          get().updateFlowNode(node.id, { status: 'running' });
        }
      });
      
      // Get auth token
      const authStorage = localStorage.getItem('cascade-auth-storage');
      let token = null;
      if (authStorage) {
        try {
          const authData = JSON.parse(authStorage);
          token = authData.token;
        } catch (e) {
          // Invalid token format
        }
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/transformations/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify(pipeline),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Pipeline execution result:', result);
      
      // Update all executed nodes with success
      if (result.executionResults) {
        result.executionResults.forEach((nodeResult: any) => {
          const nodeUpdates: any = { 
            status: 'success',
            outputRows: nodeResult.row_count 
          };
          
          // Add ML results to node data if present
          if (nodeResult.ml_results) {
            nodeUpdates.mlResults = nodeResult.ml_results;
          }
          
          get().updateFlowNode(nodeResult.node_id, nodeUpdates);
          
          // Store detailed results
          get().setNodeResult(nodeResult.node_id, {
            nodeId: nodeResult.node_id,
            status: 'success',
            outputData: nodeResult.preview,
            outputRows: nodeResult.row_count,
            outputSchema: nodeResult.output_schema,
            ml_results: nodeResult.ml_results, // Include ML results
            timestamp: new Date()
          });
        });
      }
      
      // Also update the target node
      const targetNodeUpdates: any = { 
        status: 'success',
        outputRows: result.outputRows 
      };
      
      // Check if final result has ML results
      if (result.executionResults && result.executionResults.length > 0) {
        const lastResult = result.executionResults[result.executionResults.length - 1];
        if (lastResult.ml_results) {
          targetNodeUpdates.mlResults = lastResult.ml_results;
        }
      }
      
      get().updateFlowNode(targetNodeId, targetNodeUpdates);
      
      // Store final result
      get().setNodeResult(targetNodeId, {
        nodeId: targetNodeId,
        status: 'success',
        outputData: result.data,
        outputRows: result.outputRows,
        outputSchema: result.outputSchema,
        ml_results: result.executionResults?.[result.executionResults.length - 1]?.ml_results,
        timestamp: new Date()
      });
      
      return result;
    } catch (error: any) {
      console.error('Pipeline execution failed:', error);
      
      // Mark all executed nodes as error
      nodesToExecute.forEach(node => {
        if (node.type === 'transformNode' || node.type === 'mlNode') {
          get().updateFlowNode(node.id, { status: 'error' });
        }
      });
      
      get().setNodeResult(targetNodeId, {
        nodeId: targetNodeId,
        status: 'error',
        error: error.message,
        timestamp: new Date()
      });
      
      throw error;
    }
  },

  executePipeline: async (pipelineId?: string, projectId?: string) => {
    const state = get();
    
    // Find all leaf nodes (nodes with no outgoing edges)
    const leafNodes = state.flowNodes.filter(node => 
      !state.flowEdges.some(edge => edge.source === node.id)
    );
    
    // Execute to the last leaf node (or first if multiple)
    if (leafNodes.length > 0) {
      const lastNode = leafNodes[leafNodes.length - 1];
      return get().executeToNode(lastNode.id, pipelineId, projectId, {
        persistOutputAsDataset: true,
      });
    }
    
    throw new Error('No nodes to execute');
  }
}));
