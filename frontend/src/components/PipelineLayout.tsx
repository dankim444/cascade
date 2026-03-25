import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Plus, Save, Database, LogOut, User, Trash2, X } from 'lucide-react';
import { PipelineCanvasWithProvider } from './PipelineCanvas';
import { NodeConfigPanel } from './NodeConfigPanel';
import { DataUpload } from './DataUpload';
import { ResultsViewer } from './ResultsViewer';
import { NodeDataPreview } from './NodeDataPreview';
import { MLResultsDisplay } from './MLResultsDisplay';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useAuthStore } from '../store/useAuthStore';
import { datasetAPI, pipelineAPI, formatPipelineValidationError } from '../services/api';
import type { Node as FlowNode } from 'reactflow';
import { CascadeMark } from './CascadeLogo';

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
    setDatasets,
    setDataConnections,
  } = useWorkflowStore();
  
  const { user, logout } = useAuthStore();

  const [showUpload, setShowUpload] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [selectedFlowNode, setSelectedFlowNode] = useState<FlowNode | null>(null);
  const [showNodePreview, setShowNodePreview] = useState(false);
  const [nodePreviewData, setNodePreviewData] = useState<any>(null);
  const [nodePreviewLoading, setNodePreviewLoading] = useState(false);
  const [showDatasetManager, setShowDatasetManager] = useState(false);
  const [deletingDatasetId, setDeletingDatasetId] = useState<string | null>(null);
  const [showMLResults, setShowMLResults] = useState(false);
  const [mlResultsData, setMLResultsData] = useState<any>(null);

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

  const handleAddMLNode = (operation: string) => {
    const operationLabels: Record<string, string> = {
      ml_regression: 'Regression Model',
      ml_classification: 'Classification Model',
      ml_clustering: 'Clustering Model',
    };

    const mlTypes: Record<string, 'regression' | 'classification' | 'clustering'> = {
      ml_regression: 'regression',
      ml_classification: 'classification',
      ml_clustering: 'clustering',
    };

    // Find a suitable data source for this ML node
    const dataNode = flowNodes.find(n => n.type === 'dataNode');
    const dataKey = dataNode?.data.dataKey || datasets[0]?.dataKey;

    const newNode: FlowNode = {
      id: `ml-${operation}-${Date.now()}`,
      type: 'mlNode',
      position: { x: 300, y: 50 + flowNodes.length * 120 },
      data: {
        label: operationLabels[operation] || operation,
        operation,
        mlType: mlTypes[operation],
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
    // Check if this is an ML node with results
    if (node.type === 'mlNode') {
      const result = getNodeResult(node.id);
      if (result && result.ml_results) {
        setMLResultsData({
          mlType: node.data.mlType,
          results: result.ml_results,
          data: result.outputData || [],
        });
        setShowMLResults(true);
        return;
      }
    }

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
      } else if (node.type === 'transformNode' || node.type === 'mlNode') {
        // For transform/ML nodes, check if we have executed results
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
      
      // Check if any node in the execution has ML results
      const hasMLResults = result.executionResults?.some((r: any) => r.ml_results);
      
      // Only show generic results viewer if no ML results (ML results shown on node)
      if (!hasMLResults) {
        setExecutionResult(result);
        setShowResults(true);
      }
      // If ML results exist, they're already displayed on the node - no popup needed
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
      
      // Check if this execution has ML results
      const hasMLResults = result.executionResults?.some((r: any) => r.ml_results);
      
      // Only show generic results viewer if no ML results
      if (!hasMLResults) {
        setExecutionResult(result);
        setShowResults(true);
      }
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

  // Pipeline ID (to update existing instead of creating new)
  const [currentPipelineId, setCurrentPipelineId] = useState<string | null>(null);

  // Load datasets and pipelines from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load datasets
        const apiDatasets = await datasetAPI.getAll();
        
        // Clear and replace all datasets to avoid duplicates
        const datasetsWithKeys = apiDatasets.map((ds: any) => ({
          ...ds,
          dataKey: ds.dataKey || `data_${ds.id}`,
          preview: ds.preview || [],
        }));
        
        // Set all datasets at once (replaces existing)
        setDatasets(datasetsWithKeys);
        
        // Also update data connections
        const dataConnections = datasetsWithKeys.map((ds: any) => ({
          dataKey: ds.dataKey,
          sqlConnection: `data/${ds.dataKey}.db`,
          schema: { columns: ds.columns },
          rowCount: ds.rowCount,
          lastAccessed: new Date(),
        }));
        setDataConnections(dataConnections);
        
        // Load pipelines (invalid ones are already deleted by backend when datasets are deleted)
        const pipelines: any[] = await pipelineAPI.getAll();
        if (pipelines && pipelines.length > 0) {
          // Load the most recently updated pipeline
          const latestPipeline = pipelines.sort((a: any, b: any) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          
          if (latestPipeline && latestPipeline.definition) {
            const def = latestPipeline.definition;
            // Restore the pipeline state
            if (def.flowNodes) setFlowNodes(def.flowNodes);
            if (def.flowEdges) setFlowEdges(def.flowEdges);
            setCurrentPipelineId(latestPipeline.id);
            console.log('Loaded pipeline:', latestPipeline.name);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []); // Only run on mount

  const handleSavePipeline = async () => {
    try {
      const pipeline = {
        id: currentPipelineId || `pipeline-${Date.now()}`,
        name: 'My Pipeline',
        flowNodes,
        flowEdges,
        datasets,
      };
      
      // Save to API
      const saved = await pipelineAPI.save(pipeline);
      setCurrentPipelineId(saved.id);
      console.log('Pipeline saved:', saved);
      
      // Also save to localStorage as backup
      localStorage.setItem('cascade-pipeline', JSON.stringify(pipeline));
      
      alert('Pipeline saved successfully!');
    } catch (error: any) {
      console.error('Failed to save pipeline:', error);
      const detail = error.response?.data?.detail;
      alert(formatPipelineValidationError(detail) || error.message || 'Unknown error');
    }
  };

  const handleDeleteDataset = async (datasetId: string) => {
    try {
      setDeletingDatasetId(datasetId);
      
      // Find the dataset before removing it (need dataKey for cleanup)
      const dataset = datasets.find(ds => ds.id === datasetId);
      
      // Delete from API (this will also delete from S3 and associated pipelines)
      const deleteResult = await datasetAPI.delete(datasetId);
      
      // Remove from local state
      const updatedDatasets = datasets.filter(ds => ds.id !== datasetId);
      setDatasets(updatedDatasets);
      
      if (dataset) {
        // Update data connections - remove connections for this dataset
        const updatedConnections = useWorkflowStore.getState().dataConnections.filter(
          conn => conn.dataKey !== dataset.dataKey
        );
        setDataConnections(updatedConnections);
        
        // Remove any data nodes that reference this dataset
        const nodesToRemove = flowNodes.filter(
          node => node.type === 'dataNode' && node.data.dataKey === dataset.dataKey
        );
        nodesToRemove.forEach(node => deleteFlowNode(node.id));
        
        // If pipelines were deleted and current pipeline references this dataset, clear it
        if (deleteResult?.pipelinesDeleted > 0) {
          const hasDeletedDataset = flowNodes.some(node => 
            node.type === 'dataNode' && node.data.dataKey === dataset.dataKey
          );
          
          if (hasDeletedDataset) {
            // Clear the pipeline since it referenced the deleted dataset
            setFlowNodes([]);
            setFlowEdges([]);
            setCurrentPipelineId(null);
            console.log('Pipeline cleared because it referenced deleted dataset');
          }
        }
      }
      
      console.log('Dataset deleted successfully', deleteResult);
      
      // Close dataset manager if open
      setShowDatasetManager(false);
    } catch (error: any) {
      console.error('Failed to delete dataset:', error);
      alert('Failed to delete dataset: ' + (error.message || 'Unknown error'));
    } finally {
      setDeletingDatasetId(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <CascadeMark className="w-10 h-10 shrink-0 shadow-md" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cascade Pipeline</h1>
            <p className="text-sm text-gray-500">Visual Data Transformation</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* User Info */}
          {user && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">{user.email}</span>
            </div>
          )}
          
          {/* Logout Button */}
          <button
            onClick={() => {
              logout();
              window.location.reload();
            }}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Logout</span>
          </button>
          {/* Dataset Count / Manager */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDatasetManager(!showDatasetManager)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              title="Manage datasets"
            >
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {datasets.length} {datasets.length === 1 ? 'Dataset' : 'Datasets'}
              </span>
            </button>
            
            {/* Dataset Manager Dropdown */}
            {showDatasetManager && (
              <div className="absolute right-4 top-16 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Your Datasets</h3>
                  <button
                    onClick={() => setShowDatasetManager(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-2">
                  {datasets.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      No datasets uploaded yet
                    </div>
                  ) : (
                    datasets.map((ds) => (
                      <div
                        key={ds.id}
                        className="group flex items-center justify-between px-3 py-3 rounded hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{ds.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {ds.rowCount} rows • {ds.columns.length} columns
                          </div>
                          {(ds as any).uploadedAt && (
                            <div className="text-xs text-gray-400 mt-1">
                              Uploaded {new Date((ds as any).uploadedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${ds.name}"?\n\nThis will permanently delete the dataset and all its data from S3. This action cannot be undone.`)) {
                              handleDeleteDataset(ds.id);
                            }
                          }}
                          disabled={deletingDatasetId === ds.id}
                          className="ml-3 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete dataset"
                        >
                          {deletingDatasetId === ds.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
                    <div
                      key={ds.id}
                      className="group flex items-center justify-between px-3 py-2 rounded hover:bg-blue-50"
                    >
                      <button
                        onClick={() => handleAddDataNode(ds)}
                        className="flex-1 text-left text-sm"
                      >
                        <div className="font-medium">{ds.name}</div>
                        <div className="text-xs text-gray-500">
                          {ds.rowCount} rows • {ds.columns.length} cols
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${ds.name}"? This action cannot be undone.`)) {
                            handleDeleteDataset(ds.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-opacity"
                        title="Delete dataset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
                  
                  <div className="border-t border-gray-200 my-2" />
                  
                  <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">
                    Machine Learning
                  </div>
                  {['ml_regression', 'ml_classification', 'ml_clustering'].map(
                    (op) => (
                      <button
                        key={op}
                        onClick={() => handleAddMLNode(op)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-indigo-50 text-sm capitalize"
                        disabled={datasets.length === 0}
                      >
                        {op.replace('ml_', '').replace('_', ' ')}
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

      {/* ML Results Display */}
      {showMLResults && mlResultsData && (
        <MLResultsDisplay
          mlType={mlResultsData.mlType}
          results={mlResultsData.results}
          data={mlResultsData.data}
          onClose={() => setShowMLResults(false)}
        />
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

