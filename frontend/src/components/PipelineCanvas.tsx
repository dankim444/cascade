import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  Panel,
  ReactFlowProvider,
  MarkerType,
  ConnectionLineType,
  ConnectionMode,
  type Connection,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DataNode } from './nodes/DataNode';
import { TransformNode } from './nodes/TransformNode';
import { VisualizationNode } from './nodes/VisualizationNode';
import { MLNode } from './nodes/MLNode';
import { Play, Trash2, Eye } from 'lucide-react';

const nodeTypes = {
  dataNode: DataNode,
  transformNode: TransformNode,
  visualizationNode: VisualizationNode,
  mlNode: MLNode,
};

interface PipelineCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeSelect?: (node: Node | null) => void;
  onNodeDoubleClick?: (node: Node) => void;
  onExecutePipeline?: () => void;
  onExecuteFromNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  isReadOnly?: boolean;
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onNodeDoubleClick,
  onExecutePipeline,
  onExecuteFromNode,
  onDeleteNode,
  isReadOnly = false,
}) => {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Node[]>(initialNodes);
  const edgesRef = useRef<Edge[]>(initialEdges);

  React.useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  React.useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Update parent when nodes change
  const handleNodesChange = useCallback(
    (changes: any) => {
      if (isReadOnly) return;
      const updated = applyNodeChanges(changes, nodesRef.current);
      setNodes(updated);
      onNodesChange?.(updated);
    },
    [isReadOnly, onNodesChange, setNodes]
  );

  // Update parent when edges change
  const handleEdgesChange = useCallback(
    (changes: any) => {
      if (isReadOnly) return;
      const updated = applyEdgeChanges(changes, edgesRef.current);
      setEdges(updated);
      onEdgesChange?.(updated);
    },
    [isReadOnly, onEdgesChange, setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (isReadOnly) return;
      // Validate connection
      if (!params.source || !params.target) {
        console.warn('Invalid connection: missing source or target');
        return;
      }

      // Prevent self-connections
      if (params.source === params.target) {
        console.warn('Cannot connect node to itself');
        return;
      }

      // Check if connection already exists
      const existingConnection = edgesRef.current.find(
        (edge) =>
          edge.source === params.source &&
          edge.target === params.target
      );

      if (existingConnection) {
        console.warn('Connection already exists');
        return;
      }

      console.log('Creating connection:', params);

      const newEdge: Edge = {
        id: `edge-${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      
      const nextEdges = [...edgesRef.current, newEdge];
      setEdges(nextEdges);
      onEdgesChange?.(nextEdges);
    },
    [isReadOnly, setEdges, onEdgesChange]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
      onNodeSelect?.(node);
    },
    [onNodeSelect]
  );

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeDoubleClick?.(node);
    },
    [onNodeDoubleClick]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const handleDeleteSelected = useCallback(() => {
    if (isReadOnly) return;
    if (selectedNode) {
      onDeleteNode?.(selectedNode.id);
      setSelectedNode(null);
      onNodeSelect?.(null);
    }
  }, [isReadOnly, selectedNode, onDeleteNode, onNodeSelect]);

  const handleExecuteFromSelected = useCallback(() => {
    if (selectedNode) {
      onExecuteFromNode?.(selectedNode.id);
    }
  }, [selectedNode, onExecuteFromNode]);

  // Validate if a connection is allowed
  const isValidConnection = useCallback(
    (connection: Connection) => {
      // Prevent self-connections
      if (connection.source === connection.target) {
        return false;
      }

      // Check if connection already exists
      const exists = edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target
      );

      return !exists;
    },
    [edges]
  );

  // Sync with external changes and add arrows to edges
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    // Add arrow markers to all edges
    const edgesWithArrows = initialEdges.map(edge => {
      if (edge.markerEnd) {
        return edge;
      }
      return {
        ...edge,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      } as Edge;
    });
    setEdges(edgesWithArrows);
  }, [initialEdges, setEdges]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 3 }}
        snapToGrid={true}
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        }}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={30}
        isValidConnection={isValidConnection}
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'dataNode') return '#3b82f6';
            return '#8b5cf6';
          }}
          className="!bg-white !border-2 !border-gray-300"
        />

        {/* Custom Panel for Actions */}
        <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-3 space-y-2">
          <button
            onClick={onExecutePipeline}
            disabled={isReadOnly}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            title="Execute entire pipeline"
          >
            <Play className="h-4 w-4" />
            <span>Run Pipeline</span>
          </button>

          {selectedNode && (
            <>
              <button
                onClick={handleExecuteFromSelected}
                disabled={isReadOnly}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                title="Execute pipeline up to this node"
              >
                <Eye className="h-4 w-4" />
                <span>View Output</span>
              </button>

              <button
                onClick={handleDeleteSelected}
                disabled={isReadOnly}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                title="Delete selected node"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </>
          )}
        </Panel>

        {/* Info Panel */}
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-3">
          <div className="text-sm">
            <div className="font-semibold text-gray-900 mb-1">Pipeline Editor</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• Click nodes to configure</div>
              <div>• Double-click to preview data</div>
              <div>• Drag to connect nodes</div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// Wrapper with ReactFlowProvider
export const PipelineCanvasWithProvider: React.FC<PipelineCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <PipelineCanvas {...props} />
    </ReactFlowProvider>
  );
};

