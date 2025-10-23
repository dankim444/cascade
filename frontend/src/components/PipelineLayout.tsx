import React, { useState, useCallback } from 'react';
import { Upload, Plus, Save, Database } from 'lucide-react';
import { PipelineCanvasWithProvider } from './PipelineCanvas';
import { NodeConfigPanel } from './NodeConfigPanel';
import { DataUpload } from './DataUpload';
import { ResultsViewer } from './ResultsViewer';
import { NodeDataPreview } from './NodeDataPreview';
import { useWorkflowStore } from '../store/useWorkflowStore';
import type { Node as FlowNode } from 'reactflow';

export const PipelineLayout: React.FC = () => {
  const {
    flowNodes,
    flowEdges,
    datasets,
    setFlowNodes,
    setFlowEdges,
    addFlowNode,
    updateFlowNode,
    deleteFlowNode,
    setSelectedNode,
    executeToNode,
    executePipeline,
    getNodeResult,
  } = useWorkflowStore();

  const [showUpload, setShowUpload] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [selectedFlowNode, setSelectedFlowNode] = useState<FlowNode | null>(null);
  const [showNodePreview, setShowNodePreview] = useState(false);
  const [nodePreviewData, setNodePreviewData] = useState<any>(null);
  const [nodePreviewLoading, setNodePreviewLoading] = useState(false);

  const handleAddDataNode = (dataset: any) => {
    const newNode: FlowNode = {
      id: `data-${dataset.id}-${Date.now()}`,
      type: 'dataNode',
      position: { x: 50, y: 50 + flowNodes.length * 120 },
      data: {
        label: dataset.name,
        dataKey: dataset.dataKey,
        rowCount: dataset.rowCount,
        columnCount: dataset.columns.length,
      },
    };
    addFlowNode(newNode);
    setShowAddMenu(false);
  };

  const handleAddTransformNode = (operation: string) => {
    const operationLabels: Record<string, string> = {
      select: 'Select Columns',
      filter: 'Filter Rows',
      groupby: 'Group By',
      join: 'Join Tables',
      sort: 'Sort Data',
      rename: 'Rename Columns',
      calculate: 'Calculate Column',
    };

    // Find a suitable data source for this transform
    const dataNode = flowNodes.find(n => n.type === 'dataNode');
    const dataKey = dataNode?.data.dataKey || datasets[0]?.dataKey;

    const newNode: FlowNode = {
      id: `transform-${operation}-${Date.now()}`,
      type: 'transformNode',
      position: { x: 300, y: 50 + flowNodes.length * 120 },
      data: {
        label: operationLabels[operation] || operation,
        operation,
        config: {},
        status: 'pending',
        dataKey, // Reference to input data
      },
    };
    addFlowNode(newNode);
    setShowAddMenu(false);
  };

  const handleNodeSelect = useCallback((node: FlowNode | null) => {
    setSelectedFlowNode(node);
    setSelectedNode(node?.id || null);
  }, [setSelectedNode]);

  const handleNodeDoubleClick = useCallback(async (node: FlowNode) => {
    // Show data preview for double-clicked node
    setShowNodePreview(true);
    setNodePreviewLoading(true);
    setNodePreviewData(null);
    
    try {
      if (node.type === 'dataNode') {
        // For data nodes, show the source data
        const dataset = datasets.find(d => d.dataKey === node.data.dataKey);
        if (dataset) {
          setNodePreviewData({
            nodeId: node.id,
            nodeName: node.data.label || 'Data Source',
            data: dataset.preview || [],
            rowCount: dataset.rowCount,
            schema: dataset.columns,
          });
        }
      } else if (node.type === 'transformNode') {
        // For transform nodes, check if we have executed results
        const result = getNodeResult(node.id);
        if (result && result.outputData) {
          setNodePreviewData({
            nodeId: node.id,
            nodeName: node.data.label || node.data.operation,
            data: result.outputData,
            rowCount: result.outputRows,
            schema: result.outputSchema,
          });
        } else {
          // No data yet - need to execute
          setNodePreviewData({
            nodeId: node.id,
            nodeName: node.data.label || node.data.operation,
            data: null,
            error: 'No data available. Execute the pipeline to this node to see results.',
          });
        }
      }
    } catch (error: any) {
      setNodePreviewData({
        nodeId: node.id,
        nodeName: node.data.label || 'Node',
        data: null,
        error: error.message,
      });
    } finally {
      setNodePreviewLoading(false);
    }
  }, [datasets, getNodeResult]);

  const handleUpdateNode = useCallback((nodeId: string, updates: any) => {
    updateFlowNode(nodeId, updates);
    setSelectedFlowNode(null);
    setSelectedNode(null);
  }, [updateFlowNode, setSelectedNode]);

  const handleExecutePipeline = async () => {
    try {
      const result = await executePipeline();
      setExecutionResult(result);
      setShowResults(true);
    } catch (error: any) {
      setExecutionResult({
        status: 'error',
        error: error.message,
      });
      setShowResults(true);
    }
  };

  const handleExecuteFromNode = async (nodeId: string) => {
    try {
      const result = await executeToNode(nodeId);
      setExecutionResult(result);
      setShowResults(true);
    } catch (error: any) {
      setExecutionResult({
        status: 'error',
        error: error.message,
      });
      setShowResults(true);
    }
  };

  const handleDeleteNode = useCallback((nodeId: string) => {
    deleteFlowNode(nodeId);
  }, [deleteFlowNode]);

  const handleSavePipeline = () => {
    const pipeline = {
      flowNodes,
      flowEdges,
      datasets,
    };
    
    const blob = new Blob([JSON.stringify(pipeline, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Cascade Pipeline</h1>
          <span className="text-sm text-gray-500">Visual Data Transformation</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Dataset Count */}
          <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
            <Database className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {datasets.length} {datasets.length === 1 ? 'Dataset' : 'Datasets'}
            </span>
          </div>

          {/* Upload Data */}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Data</span>
          </button>

          {/* Add Node */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Node</span>
            </button>

            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">
                    Data Sources
                  </div>
                  {datasets.map((ds) => (
                    <button
                      key={ds.id}
                      onClick={() => handleAddDataNode(ds)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 text-sm"
                    >
                      <div className="font-medium">{ds.name}</div>
                      <div className="text-xs text-gray-500">
                        {ds.rowCount} rows • {ds.columns.length} cols
                      </div>
                    </button>
                  ))}
                  {datasets.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No datasets uploaded yet
                    </div>
                  )}

                  <div className="border-t border-gray-200 my-2" />

                  <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">
                    Transformations
                  </div>
                  {['select', 'filter', 'groupby', 'join', 'sort', 'rename', 'calculate'].map(
                    (op) => (
                      <button
                        key={op}
                        onClick={() => handleAddTransformNode(op)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-purple-50 text-sm capitalize"
                        disabled={datasets.length === 0}
                      >
                        {op.replace('_', ' ')}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Save Pipeline */}
          <button
            onClick={handleSavePipeline}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
            disabled={flowNodes.length === 0}
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Pipeline Canvas */}
        <div className="flex-1 relative">
          {flowNodes.length === 0 && datasets.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="bg-blue-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Upload className="h-12 w-12 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Get Started with Your Pipeline
                </h2>
                <p className="text-gray-600 mb-6">
                  Upload a dataset and start building your transformation pipeline
                </p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Upload Your First Dataset
                </button>
              </div>
            </div>
          ) : flowNodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="bg-green-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Plus className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your First Node</h2>
                <p className="text-gray-600 mb-6">
                  Click "Add Node" to add data sources and transformations to your pipeline
                </p>
              </div>
            </div>
          ) : (
            <PipelineCanvasWithProvider
              initialNodes={flowNodes}
              initialEdges={flowEdges}
              onNodesChange={setFlowNodes}
              onEdgesChange={setFlowEdges}
              onNodeSelect={handleNodeSelect}
              onNodeDoubleClick={handleNodeDoubleClick}
              onExecutePipeline={handleExecutePipeline}
              onExecuteFromNode={handleExecuteFromNode}
              onDeleteNode={handleDeleteNode}
            />
          )}
        </div>

        {/* Configuration Panel */}
        {selectedFlowNode && (
          <NodeConfigPanel
            selectedNode={selectedFlowNode}
            datasets={datasets}
            onUpdateNode={handleUpdateNode}
            onClose={() => {
              setSelectedFlowNode(null);
              setSelectedNode(null);
            }}
          />
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Upload Dataset</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <DataUpload
              onUploadComplete={() => {
                setShowUpload(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Results Viewer */}
      {showResults && executionResult && (
        <ResultsViewer result={executionResult} onClose={() => setShowResults(false)} />
      )}

      {/* Node Data Preview */}
      {showNodePreview && nodePreviewData && (
        <NodeDataPreview
          nodeId={nodePreviewData.nodeId}
          nodeName={nodePreviewData.nodeName}
          data={nodePreviewData.data}
          rowCount={nodePreviewData.rowCount}
          schema={nodePreviewData.schema}
          isLoading={nodePreviewLoading}
          error={nodePreviewData.error}
          onClose={() => setShowNodePreview(false)}
          onRefresh={
            nodePreviewData.nodeId
              ? async () => {
                  setNodePreviewLoading(true);
                  try {
                    await executeToNode(nodePreviewData.nodeId);
                    // Refresh the preview data
                    const result = getNodeResult(nodePreviewData.nodeId);
                    if (result) {
                      setNodePreviewData({
                        ...nodePreviewData,
                        data: result.outputData,
                        rowCount: result.outputRows,
                        schema: result.outputSchema,
                        error: undefined,
                      });
                    }
                  } catch (error: any) {
                    setNodePreviewData({
                      ...nodePreviewData,
                      error: error.message,
                    });
                  } finally {
                    setNodePreviewLoading(false);
                  }
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

