import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  ReactFlowProvider,
  MiniMap,
  BackgroundVariant,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  addEdge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
// ReactFlow styles are imported in index.css

import { DataNode } from './nodes/DataNode';
import { TransformNode } from './nodes/TransformNode';
import { TransformOperationSelector } from './TransformOperationSelector';
import { useWorkflowStore } from '../store/useWorkflowStore';
import type { Node, Transformation, Dataset, DataConnection, TransformOperation } from '../types';

// Define node types
const nodeTypes: NodeTypes = {
  dataNode: DataNode,
  transformNode: TransformNode,
};

// Define edge types
const edgeTypes: EdgeTypes = {};

const WorkflowEditor: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [showDatasetSelector, setShowDatasetSelector] = useState(false);
  const [showOperationSelector, setShowOperationSelector] = useState(false);
  const [pendingNodePosition, setPendingNodePosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingDataKey, setPendingDataKey] = useState<string | null>(null);

  const { 
    nodes: storeNodes, 
    edges: storeEdges, 
    datasets, 
    addNode, 
    addEdge: addStoreEdge, 
    updateNode, 
    deleteNode,
    dataConnections 
  } = useWorkflowStore();

  // Convert store nodes to ReactFlow format
  const reactFlowNodes = React.useMemo(() => 
    storeNodes.map(node => ({
      id: node.id,
      type: 'transformNode',
      position: node.position,
      data: {
        node,
        onUpdate: (nodeId: string, transform: Transformation) => {
          updateNode(nodeId, { transform });
        }
      }
    })),
    [storeNodes, updateNode]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        addStoreEdge({
          id: `${params.source}-${params.target}`,
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle
        });
      }
    },
    [addStoreEdge]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance?.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      if (!position) return;

      // If there are no datasets, show a message
      if (datasets.length === 0) {
        alert('Please upload a dataset first before adding transform nodes.');
        return;
      }

      // Store position and show selectors
      setPendingNodePosition(position);
      
      // Show dataset selector if there are multiple datasets
      if (datasets.length > 1) {
        setShowDatasetSelector(true);
      } else {
        // Only one dataset, skip to operation selector
        setPendingDataKey(datasets[0].dataKey);
        setShowOperationSelector(true);
      }
    },
    [reactFlowInstance, datasets]
  );

  const createTransformNode = (position: { x: number; y: number }, dataKey: string, operation: TransformOperation) => {
    const nodeId = `transform-${Date.now()}`;
    
    // Set default params based on operation
    let defaultParams: string[] = [];
    switch (operation) {
      case 'select':
        defaultParams = [JSON.stringify([])];
        break;
      case 'filter':
        defaultParams = [JSON.stringify({ column: '', operator: 'equals', value: '' })];
        break;
      case 'groupby':
        defaultParams = [JSON.stringify({ groupColumns: [], aggregations: [] })];
        break;
      case 'join':
        defaultParams = [JSON.stringify({ joinType: 'inner', leftColumn: '', rightColumn: '', rightTable: '' })];
        break;
      case 'sort':
        defaultParams = [JSON.stringify({ column: '', ascending: true })];
        break;
      default:
        defaultParams = [JSON.stringify({})];
    }
    
    const defaultTransform: Transformation = {
      operation,
      params: defaultParams
    };
    
    const newNode: Node = {
      id: nodeId,
      transform: defaultTransform,
      data: dataKey,
      position
    };

    addNode(newNode);
  };

  const handleDatasetSelect = (dataKey: string) => {
    if (pendingNodePosition) {
      setPendingDataKey(dataKey);
      setShowDatasetSelector(false);
      setShowOperationSelector(true);
    }
  };

  const handleOperationSelect = (operation: TransformOperation) => {
    if (pendingNodePosition && pendingDataKey) {
      createTransformNode(pendingNodePosition, pendingDataKey, operation);
      setPendingNodePosition(null);
      setPendingDataKey(null);
      setShowOperationSelector(false);
    }
  };

  const handleCancel = () => {
    setPendingNodePosition(null);
    setPendingDataKey(null);
    setShowDatasetSelector(false);
    setShowOperationSelector(false);
  };

  const onNodesDelete = useCallback((nodes: any[]) => {
    nodes.forEach(node => {
      deleteNode(node.id);
    });
  }, [deleteNode]);

  return (
    <div className="w-full h-full relative">
      <ReactFlowProvider>
        <div className="reactflow-wrapper h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={reactFlowNodes}
            edges={storeEdges}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodesDelete={onNodesDelete}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#94a3b8', strokeWidth: 2 }
            }}
          >
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                if (node.type === 'dataNode') return '#3b82f6';
                return '#8b5cf6';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
          </ReactFlow>
        </div>
      </ReactFlowProvider>

      {/* Dataset Selector Modal */}
      {showDatasetSelector && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Dataset</h3>
            <p className="text-sm text-gray-600 mb-4">Which dataset should this transform operate on?</p>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {datasets.map((dataset) => (
                <button
                  key={dataset.id}
                  onClick={() => handleDatasetSelect(dataset.dataKey)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="font-medium text-gray-900">{dataset.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {dataset.rowCount.toLocaleString()} rows • {dataset.columns.length} columns
                  </div>
                </button>
              ))}
            </div>
            
            <button
              onClick={handleCancel}
              className="mt-4 w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Operation Selector Modal */}
      {showOperationSelector && (
        <TransformOperationSelector
          onSelect={handleOperationSelect}
          onCancel={handleCancel}
        />
      )}

      {/* Helper Text */}
      {storeNodes.length === 0 && datasets.length > 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="bg-white bg-opacity-90 rounded-lg p-6 shadow-lg max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Started</h3>
            <p className="text-sm text-gray-600">
              Drag a <span className="font-semibold text-indigo-600">Transform</span> node from the sidebar to start building your data pipeline.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Connect nodes together to create a transformation flow
            </p>
          </div>
        </div>
      )}

      {datasets.length === 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="bg-white bg-opacity-90 rounded-lg p-6 shadow-lg max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Yet</h3>
            <p className="text-sm text-gray-600">
              Click <span className="font-semibold text-blue-600">Upload Data</span> in the header to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};


export default WorkflowEditor;
