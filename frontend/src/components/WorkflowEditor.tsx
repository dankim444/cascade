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
} from 'reactflow';
// ReactFlow styles are imported in index.css

import { DataNode } from './nodes/DataNode';
import { TransformNode } from './nodes/TransformNode';
import { useWorkflowStore } from '../store/useWorkflowStore';
import type { Node, Transformation, Dataset } from '../types';

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

  const { 
    nodes: storeNodes, 
    edges: storeEdges, 
    datasets, 
    addNode, 
    addEdge, 
    updateNode, 
    dataConnections 
  } = useWorkflowStore();

  // Convert store nodes to ReactFlow format
  const nodes = storeNodes.map(node => ({
    id: node.id,
    type: 'transformNode', // All nodes are transform nodes now
    position: node.position,
    data: {
      node,
      onUpdate: (nodeId: string, transform: Transformation) => {
        updateNode(nodeId, { transform });
      }
    }
  }));

  const edges = storeEdges;

  const onConnect = useCallback(
    (params: Connection) => {
      addEdge(params);
    },
    [addEdge]
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

      // Create a new transform node
      const nodeId = `transform-${Date.now()}`;
      const defaultTransform: Transformation = {
        operation: 'select',
        params: [JSON.stringify([])]
      };
      
      const newNode: Node = {
        id: nodeId,
        transform: defaultTransform,
        data: datasets[0]?.dataKey || 'default',
        position
      };

      addNode(newNode);
    },
    [reactFlowInstance, addNode, datasets]
  );

  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <div className="reactflow-wrapper h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </div>
  );
};


export default WorkflowEditor;
