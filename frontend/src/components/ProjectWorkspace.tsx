import React, { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Plus, Save, Database, Trash2, X, 
  GitBranch, BarChart3, Layers, ChevronDown, Edit2, FileText, Share2, Users, User
} from 'lucide-react';
import { PipelineCanvasWithProvider } from './PipelineCanvas';
import { NodeConfigPanel } from './NodeConfigPanel';
import { DataUpload } from './DataUpload';
import { ResultsViewer } from './ResultsViewer';
import { NodeDataPreview } from './NodeDataPreview';
import { MLResultsDisplay } from './MLResultsDisplay';
import { GraphsLayout } from './GraphsLayout';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { projectAPI } from '../services/projectAPI';
import { datasetAPI, pipelineAPI } from '../services/api';
import type { Node as FlowNode } from 'reactflow';
import type { ProjectDetails, ProjectShare } from '../types';

interface PipelineInfo {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectWorkspaceProps {
  projectId: string;
}

interface SavedGraphInfo {
  id: string;
  name: string;
  dataKey: string;
  createdAt: string;
}

type Tab = 'overview' | 'pipeline' | 'visualizations';

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId }) => {
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
    setPipelineContext,
    getNodeResult,
    setDatasets,
    setDataConnections,
  } = useWorkflowStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
  const [currentPipelineId, setCurrentPipelineId] = useState<string | null>(null);
  const [currentPipelineName, setCurrentPipelineName] = useState<string>('Untitled Pipeline');
  const [isSaving, setIsSaving] = useState(false);
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([]);
  const [savedGraphs, setSavedGraphs] = useState<SavedGraphInfo[]>([]);
  const [showPipelineManager, setShowPipelineManager] = useState(false);
  const [showNewPipelineModal, setShowNewPipelineModal] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [editingPipelineName, setEditingPipelineName] = useState(false);
  
  // Sharing state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit' | 'admin'>('view');
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const [projectShares, setProjectShares] = useState<ProjectShare[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Permission helpers
  const canEdit = project?.isOwner !== false || project?.permission === 'edit' || project?.permission === 'admin';
  const canManageShares = project?.isOwner !== false || project?.permission === 'admin';

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      try {
        setIsLoading(true);
        
        // Clear existing state first
        setFlowNodes([]);
        setFlowEdges([]);
        setDatasets([]);
        setDataConnections([]);
        
        // Load project details
        const projectData = await projectAPI.getById(projectId);
        setProject(projectData);
        
        // Load datasets for this project
        const projectDatasets = await datasetAPI.getAll(projectId);
        const datasetsWithKeys = projectDatasets.map((ds: any) => ({
          ...ds,
          dataKey: ds.dataKey || `data_${ds.id}`,
          preview: ds.preview || [],
        }));
        setDatasets(datasetsWithKeys);
        
        // Set data connections
        const dataConnections = datasetsWithKeys.map((ds: any) => ({
          dataKey: ds.dataKey,
          sqlConnection: `data/${ds.dataKey}.db`,
          schema: { columns: ds.columns },
          rowCount: ds.rowCount,
          lastAccessed: new Date(),
        }));
        setDataConnections(dataConnections);
        
        // Load pipelines for this project
        const loadedPipelines: any[] = await pipelineAPI.getAll(projectId);
        const pipelineInfos: PipelineInfo[] = loadedPipelines.map((p: any) => ({
          id: p.id,
          name: p.name || 'Untitled Pipeline',
          description: p.description,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));
        setPipelines(pipelineInfos);
        
        // Load saved graphs/visualizations from project data
        if (projectData.graphs) {
          const graphInfos: SavedGraphInfo[] = projectData.graphs.map((g: any) => ({
            id: g.id,
            name: g.name,
            dataKey: g.dataKey,
            createdAt: g.createdAt,
          }));
          setSavedGraphs(graphInfos);
        }
        
        // Don't auto-load pipeline - user will select from overview
      } catch (error) {
        console.error('Failed to load project:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProject();
  }, [projectId]);

  // Function to refresh saved graphs (called after saving a graph in GraphsLayout)
  const refreshSavedGraphs = async () => {
    try {
      const projectData = await projectAPI.getById(projectId);
      if (projectData.graphs) {
        const graphInfos: SavedGraphInfo[] = projectData.graphs.map((g: any) => ({
          id: g.id,
          name: g.name,
          dataKey: g.dataKey,
          createdAt: g.createdAt,
        }));
        setSavedGraphs(graphInfos);
      }
    } catch (error) {
      console.error('Failed to refresh saved graphs:', error);
    }
  };

  // Sharing functions
  const openShareModal = async () => {
    setShowShareModal(true);
    setShareEmail('');
    setSharePermission('view');
    setShareError('');
    
    if (project?.isOwner !== false) {
      try {
        setLoadingShares(true);
        const shares = await projectAPI.getShares(projectId);
        setProjectShares(shares);
      } catch (error) {
        console.error('Failed to load shares:', error);
        setProjectShares([]);
      } finally {
        setLoadingShares(false);
      }
    }
  };

  const handleShareProject = async () => {
    if (!shareEmail.trim()) return;
    
    setShareError('');
    setIsSharing(true);
    
    try {
      await projectAPI.share(projectId, {
        email: shareEmail.trim(),
        permission: sharePermission,
      });
      
      // Refresh shares
      const shares = await projectAPI.getShares(projectId);
      setProjectShares(shares);
      setShareEmail('');
      setSharePermission('view');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to share project';
      setShareError(message);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      await projectAPI.removeShare(projectId, shareId);
      setProjectShares(projectShares.filter(s => s.id !== shareId));
    } catch (error) {
      console.error('Failed to remove share:', error);
      alert('Failed to remove share. Please try again.');
    }
  };

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
        dataKey,
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
        dataKey,
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

    setShowNodePreview(true);
    setNodePreviewLoading(true);
    setNodePreviewData(null);
    
    try {
      if (node.type === 'dataNode') {
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
      const result = await executePipeline(currentPipelineId || undefined, projectId);
      const hasMLResults = result.executionResults?.some((r: any) => r.ml_results);
      
      // Check if output dataset was saved
      if (result.outputDataset) {
        // Refresh datasets to include the new/updated output dataset
        const projectDatasets = await datasetAPI.getAll(projectId);
        const datasetsWithKeys = projectDatasets.map((ds: any) => ({
          ...ds,
          dataKey: ds.dataKey || `data_${ds.id}`,
          preview: ds.preview || [],
        }));
        setDatasets(datasetsWithKeys);
        
        // Show success message
        alert(`Pipeline output saved as dataset: ${result.outputDataset.name}`);
      }
      
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

  const handleExecuteFromNode = async (nodeId: string) => {
    try {
      const result = await executeToNode(nodeId, currentPipelineId || undefined, projectId);
      const hasMLResults = result.executionResults?.some((r: any) => r.ml_results);
      
      // Check if output dataset was saved
      if (result.outputDataset) {
        // Refresh datasets to include the new/updated output dataset
        const projectDatasets = await datasetAPI.getAll(projectId);
        const datasetsWithKeys = projectDatasets.map((ds: any) => ({
          ...ds,
          dataKey: ds.dataKey || `data_${ds.id}`,
          preview: ds.preview || [],
        }));
        setDatasets(datasetsWithKeys);
        
        // Show success message
        alert(`Pipeline output saved as dataset: ${result.outputDataset.name}`);
      }
      
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

  const handleSavePipeline = async () => {
    try {
      setIsSaving(true);
      const pipeline = {
        id: currentPipelineId || `pipeline-${Date.now()}`,
        name: currentPipelineName,
        projectId: projectId,
        flowNodes,
        flowEdges,
        datasets,
      };
      
      const saved = await pipelineAPI.save(pipeline);
      setCurrentPipelineId(saved.id);
      setPipelineContext(saved.id, projectId);
      
      // Update pipelines list
      setPipelines(prev => {
        const existing = prev.find(p => p.id === saved.id);
        if (existing) {
          return prev.map(p => p.id === saved.id ? { ...p, name: currentPipelineName, updatedAt: new Date().toISOString() } : p);
        }
        return [...prev, { id: saved.id, name: currentPipelineName, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      });
      
      localStorage.setItem(`cascade-pipeline-${projectId}`, JSON.stringify(pipeline));
    } catch (error: any) {
      console.error('Failed to save pipeline:', error);
      alert('Failed to save pipeline: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewPipeline = () => {
    if (!newPipelineName.trim()) return;
    
    // Clear current pipeline
    setFlowNodes([]);
    setFlowEdges([]);
    setCurrentPipelineId(null);
    setCurrentPipelineName(newPipelineName.trim());
    setNewPipelineName('');
    setShowNewPipelineModal(false);
    setActiveTab('pipeline');
  };

  const handleOpenPipeline = async (pipelineId: string) => {
    try {
      const pipelineData = await pipelineAPI.getById(pipelineId);
      if (pipelineData && pipelineData.definition) {
        const def = pipelineData.definition;
        setFlowNodes(def.flowNodes || []);
        setFlowEdges(def.flowEdges || []);
        setCurrentPipelineId(pipelineData.id);
        setPipelineContext(pipelineData.id, projectId);
        setCurrentPipelineName(pipelineData.name || 'Untitled Pipeline');
      }
      setActiveTab('pipeline');
    } catch (error) {
      console.error('Failed to load pipeline:', error);
    }
  };

  const handleCreateNewPipelineFromOverview = () => {
    setFlowNodes([]);
    setFlowEdges([]);
    setCurrentPipelineId(null);
    setCurrentPipelineName('Untitled Pipeline');
    setActiveTab('pipeline');
    setShowNewPipelineModal(true);
  };

  const handleSwitchPipeline = async (pipelineId: string) => {
    try {
      // Save current pipeline first if it has nodes
      if (flowNodes.length > 0 && currentPipelineId) {
        await handleSavePipeline();
      }
      
      // Load the selected pipeline
      const pipelineData = await pipelineAPI.getById(pipelineId);
      if (pipelineData && pipelineData.definition) {
        const def = pipelineData.definition;
        setFlowNodes(def.flowNodes || []);
        setFlowEdges(def.flowEdges || []);
        setCurrentPipelineId(pipelineData.id);
        setPipelineContext(pipelineData.id, projectId);
        setCurrentPipelineName(pipelineData.name || 'Untitled Pipeline');
      }
      setShowPipelineManager(false);
    } catch (error) {
      console.error('Failed to load pipeline:', error);
    }
  };

  const handleDeletePipeline = async (pipelineId: string, pipelineName: string) => {
    if (!confirm(`Delete pipeline "${pipelineName}"? This cannot be undone.`)) return;
    
    try {
      await pipelineAPI.delete(pipelineId);
      setPipelines(prev => prev.filter(p => p.id !== pipelineId));
      
      // If we deleted the current pipeline, clear the canvas or switch to another
      if (currentPipelineId === pipelineId) {
        const remaining = pipelines.filter(p => p.id !== pipelineId);
        if (remaining.length > 0) {
          await handleSwitchPipeline(remaining[0].id);
        } else {
          setFlowNodes([]);
          setFlowEdges([]);
          setCurrentPipelineId(null);
          setPipelineContext(null, null);
          setCurrentPipelineName('Untitled Pipeline');
        }
      }
    } catch (error) {
      console.error('Failed to delete pipeline:', error);
    }
  };

  const handleDeleteDataset = async (datasetId: string) => {
    try {
      setDeletingDatasetId(datasetId);
      const dataset = datasets.find(ds => ds.id === datasetId);
      
      await datasetAPI.delete(datasetId);
      
      const updatedDatasets = datasets.filter(ds => ds.id !== datasetId);
      setDatasets(updatedDatasets);
      
      if (dataset) {
        const updatedConnections = useWorkflowStore.getState().dataConnections.filter(
          conn => conn.dataKey !== dataset.dataKey
        );
        setDataConnections(updatedConnections);
        
        const nodesToRemove = flowNodes.filter(
          node => node.type === 'dataNode' && node.data.dataKey === dataset.dataKey
        );
        nodesToRemove.forEach(node => deleteFlowNode(node.id));
      }
      
      setShowDatasetManager(false);
    } catch (error: any) {
      console.error('Failed to delete dataset:', error);
      alert('Failed to delete dataset: ' + (error.message || 'Unknown error'));
    } finally {
      setDeletingDatasetId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 z-20 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: Logo, Back, Project Name */}
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-base">C</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">Cascade</h1>
              </div>
            </div>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            <button
              onClick={() => navigate(`/projects${location.search}`)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Projects</span>
            </button>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Layers className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{project?.name}</h2>
                {project?.description && (
                  <p className="text-xs text-gray-500 truncate max-w-xs">{project.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Center: Tab Navigation */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <GitBranch className="h-4 w-4" />
              <span>Pipeline</span>
            </button>
            <button
              onClick={() => setActiveTab('visualizations')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'visualizations'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Visualizations</span>
            </button>
          </div>

          {/* Right: Share button and project info */}
          <div className="flex items-center space-x-3">
            {/* Shared indicator */}
            {project?.isOwner === false && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm">
                <Users className="h-4 w-4" />
                <span>Shared by {project.ownerEmail}</span>
                <span className="px-1.5 py-0.5 bg-purple-200 rounded text-xs capitalize">
                  {project.permission}
                </span>
              </div>
            )}
            
            {/* Share button (only for owners or admins) */}
            {canManageShares && (
              <button
                onClick={openShareModal}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium"
              >
                <Share2 className="h-4 w-4" />
                <span className="text-sm">Share</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Secondary Toolbar - Pipeline specific */}
      {activeTab === 'pipeline' && (
        <div className="bg-gray-100 border-b border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between">
            {/* Left: Pipeline selector */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <button
                  onClick={() => setShowPipelineManager(!showPipelineManager)}
                  className="flex items-center space-x-2 px-3 py-2 bg-white text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
                >
                  <FileText className="h-4 w-4 text-indigo-600" />
                  {editingPipelineName && canEdit ? (
                    <input
                      type="text"
                      value={currentPipelineName}
                      onChange={(e) => setCurrentPipelineName(e.target.value)}
                      onBlur={() => setEditingPipelineName(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingPipelineName(false);
                        if (e.key === 'Escape') setEditingPipelineName(false);
                      }}
                      className="bg-transparent border-none text-sm font-medium text-gray-900 focus:outline-none w-40"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm font-medium max-w-[200px] truncate">{currentPipelineName}</span>
                  )}
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>

                {showPipelineManager && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 text-sm">Pipelines</h3>
                      {canEdit && (
                        <button
                          onClick={() => {
                            setShowPipelineManager(false);
                            setShowNewPipelineModal(true);
                          }}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          <span>New</span>
                        </button>
                      )}
                    </div>
                    <div className="p-2">
                      {pipelines.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-gray-400 text-center">
                          No saved pipelines yet
                        </div>
                      ) : (
                        pipelines.map((pipeline) => (
                          <div
                            key={pipeline.id}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                              currentPipelineId === pipeline.id
                                ? 'bg-indigo-50 border border-indigo-200'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handleSwitchPipeline(pipeline.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium text-sm truncate ${
                                currentPipelineId === pipeline.id ? 'text-indigo-700' : 'text-gray-900'
                              }`}>
                                {pipeline.name}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                Updated {new Date(pipeline.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                            {canEdit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePipeline(pipeline.id, pipeline.name);
                                }}
                                className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Rename Pipeline Button - only show if can edit */}
              {canEdit && (
                <button
                  onClick={() => setEditingPipelineName(true)}
                  className="p-2 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors border border-gray-300"
                  title="Rename pipeline"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
              
              {/* View-only indicator */}
              {!canEdit && (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-200">
                  <span>View only</span>
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-2">
              {/* Dataset Manager */}
              <div className="relative">
                <button
                  onClick={() => setShowDatasetManager(!showDatasetManager)}
                  className="flex items-center space-x-2 px-3 py-2 bg-white text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
                >
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">
                    {datasets.length} {datasets.length === 1 ? 'Dataset' : 'Datasets'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>
                
                {showDatasetManager && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Project Datasets</h3>
                      <button
                        onClick={() => setShowDatasetManager(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-2">
                      {datasets.length === 0 ? (
                        <div className="px-3 py-6 text-sm text-gray-400 text-center">
                          No datasets in this project yet
                        </div>
                      ) : (
                        datasets.map((ds) => (
                          <div
                            key={ds.id}
                            className="group flex items-center justify-between px-3 py-3 rounded-lg hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">{ds.name}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {ds.rowCount} rows • {ds.columns.length} columns
                              </div>
                            </div>
                            {canEdit && (
                              <button
                                onClick={() => {
                                  if (confirm(`Delete "${ds.name}"? This cannot be undone.`)) {
                                    handleDeleteDataset(ds.id);
                                  }
                                }}
                                disabled={deletingDatasetId === ds.id}
                                className="ml-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {deletingDatasetId === ds.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Data - only show if can edit */}
              {canEdit && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-white text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">Upload</span>
                </button>
              )}

              {/* Add Node - only show if can edit */}
              {canEdit && (
                <div className="relative">
                  <button
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Add Node</span>
                  </button>

                  {showAddMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                      <div className="p-2">
                        <div className="text-xs font-semibold text-gray-400 uppercase px-3 py-2">
                          Data Sources
                        </div>
                        {datasets.map((ds) => (
                          <button
                            key={ds.id}
                            onClick={() => handleAddDataNode(ds)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm group"
                          >
                            <div className="font-medium text-gray-900 group-hover:text-blue-600">{ds.name}</div>
                            <div className="text-xs text-gray-500">
                              {ds.rowCount} rows • {ds.columns.length} cols
                            </div>
                          </button>
                        ))}
                        {datasets.length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-400">
                            Upload a dataset first
                          </div>
                        )}

                        <div className="border-t border-gray-100 my-2" />

                        <div className="text-xs font-semibold text-gray-400 uppercase px-3 py-2">
                          Transformations
                        </div>
                        {['select', 'filter', 'groupby', 'join', 'sort', 'rename', 'calculate'].map((op) => (
                          <button
                            key={op}
                            onClick={() => handleAddTransformNode(op)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-sm text-gray-700 hover:text-indigo-600 capitalize"
                            disabled={datasets.length === 0}
                          >
                            {op.replace('_', ' ')}
                          </button>
                        ))}
                        
                        <div className="border-t border-gray-100 my-2" />
                        
                        <div className="text-xs font-semibold text-gray-400 uppercase px-3 py-2">
                          Machine Learning
                        </div>
                        {['ml_regression', 'ml_classification', 'ml_clustering'].map((op) => (
                          <button
                            key={op}
                            onClick={() => handleAddMLNode(op)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-50 text-sm text-gray-700 hover:text-purple-600 capitalize"
                            disabled={datasets.length === 0}
                          >
                            {op.replace('ml_', '').replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Save Pipeline - only show if can edit */}
              {canEdit && (
                <button
                  onClick={handleSavePipeline}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={flowNodes.length === 0 || isSaving}
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">Save</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto bg-gray-50">
            <div className="max-w-6xl mx-auto px-6 py-8">
              {/* Project Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                      <Database className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">{datasets.length}</p>
                      <p className="text-sm text-gray-500">Datasets</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                      <GitBranch className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">{pipelines.length}</p>
                      <p className="text-sm text-gray-500">Pipelines</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                      <BarChart3 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">{savedGraphs.length}</p>
                      <p className="text-sm text-gray-500">Visualizations</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pipelines Section */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-3">
                    <GitBranch className="h-5 w-5 text-indigo-600" />
                    <span>Pipelines</span>
                  </h2>
                  {canEdit && (
                    <button
                      onClick={handleCreateNewPipelineFromOverview}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span>New Pipeline</span>
                    </button>
                  )}
                </div>
                
                {pipelines.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 border-dashed p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
                      <GitBranch className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No pipelines yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                      {canEdit 
                        ? 'Create your first pipeline to start transforming and analyzing your data'
                        : 'No pipelines have been created in this project yet'}
                    </p>
                    {canEdit && (
                      <button
                        onClick={handleCreateNewPipelineFromOverview}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm font-medium"
                      >
                        Create Your First Pipeline
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pipelines.map((pipeline) => (
                      <div
                        key={pipeline.id}
                        onClick={() => handleOpenPipeline(pipeline.id)}
                        className="group bg-white rounded-xl border border-gray-200 hover:border-indigo-300 p-5 cursor-pointer transition-all hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                            <FileText className="h-5 w-5 text-indigo-600" />
                          </div>
                          {canEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePipeline(pipeline.id, pipeline.name);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                          {pipeline.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Updated {new Date(pipeline.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visualizations Section */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-3">
                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                    <span>Visualizations</span>
                  </h2>
                  {canEdit && (
                    <button
                      onClick={() => setActiveTab('visualizations')}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Visualization</span>
                    </button>
                  )}
                </div>
                
                {savedGraphs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 border-dashed p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
                      <BarChart3 className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No visualizations yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                      {canEdit 
                        ? 'Create charts and graphs to visualize your data insights'
                        : 'No visualizations have been created in this project yet'}
                    </p>
                    {canEdit && (
                      <button
                        onClick={() => setActiveTab('visualizations')}
                        className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-sm font-medium"
                      >
                        Create Your First Visualization
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedGraphs.map((graph) => (
                      <div
                        key={graph.id}
                        onClick={() => setActiveTab('visualizations')}
                        className="group bg-white rounded-xl border border-gray-200 hover:border-emerald-300 p-5 cursor-pointer transition-all hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                            <BarChart3 className="h-5 w-5 text-emerald-600" />
                          </div>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">
                          {graph.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Created {new Date(graph.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Datasets Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-3">
                    <Database className="h-5 w-5 text-blue-600" />
                    <span>Datasets</span>
                  </h2>
                  {canEdit && (
                    <button
                      onClick={() => setShowUpload(true)}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm text-sm font-medium"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload Dataset</span>
                    </button>
                  )}
                </div>
                
                {datasets.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 border-dashed p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
                      <Database className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No datasets yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                      {canEdit 
                        ? 'Upload your first dataset to start building pipelines and visualizations'
                        : 'No datasets have been uploaded to this project yet'}
                    </p>
                    {canEdit && (
                      <button
                        onClick={() => setShowUpload(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm font-medium"
                      >
                        Upload Your First Dataset
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {datasets.map((dataset) => (
                      <div
                        key={dataset.id}
                        className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 p-5 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                            <Database className="h-5 w-5 text-blue-600" />
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${dataset.name}"? This cannot be undone.`)) {
                                  handleDeleteDataset(dataset.id);
                                }
                              }}
                              disabled={deletingDatasetId === dataset.id}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            >
                              {deletingDatasetId === dataset.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{dataset.name}</h3>
                        <p className="text-xs text-gray-500">
                          {dataset.rowCount.toLocaleString()} rows • {dataset.columns.length} columns
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="h-full flex">
            {/* Pipeline Canvas */}
            <div className="flex-1 relative bg-gray-100">
              {flowNodes.length === 0 && datasets.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 bg-white rounded-2xl flex items-center justify-center border border-gray-200 shadow-sm">
                      <Upload className="h-10 w-10 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Start Building Your Pipeline
                    </h2>
                    <p className="text-gray-500 mb-6">
                      Upload a dataset to begin creating transformation and ML pipelines
                    </p>
                    <button
                      onClick={() => setShowUpload(true)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm font-medium"
                    >
                      Upload Your First Dataset
                    </button>
                  </div>
                </div>
              ) : flowNodes.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 bg-white rounded-2xl flex items-center justify-center border border-gray-200 shadow-sm">
                      <Plus className="h-10 w-10 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your First Node</h2>
                    <p className="text-gray-500 mb-6">
                      Click "Add Node" to add data sources and transformations
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
        )}

        {activeTab === 'visualizations' && (
          <GraphsLayout projectId={projectId} onGraphSaved={refreshSavedGraphs} canEdit={canEdit} />
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Upload Dataset</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DataUpload
              projectId={projectId}
              onUploadComplete={() => {
                setShowUpload(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Results Viewer */}
      {showResults && executionResult && (
        <ResultsViewer 
          result={executionResult} 
          onClose={() => setShowResults(false)}
          projectId={projectId}
          pipelineId={currentPipelineId || undefined}
          onDatasetSaved={async () => {
            // Refresh datasets after saving
            const projectDatasets = await datasetAPI.getAll(projectId);
            const datasetsWithKeys = projectDatasets.map((ds: any) => ({
              ...ds,
              dataKey: ds.dataKey || `data_${ds.id}`,
              preview: ds.preview || [],
            }));
            setDatasets(datasetsWithKeys);
          }}
        />
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

      {/* New Pipeline Modal */}
      {showNewPipelineModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">Create New Pipeline</h3>
              <p className="text-sm text-gray-500 mt-1">Start a new data transformation pipeline</p>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pipeline Name
              </label>
              <input
                type="text"
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                placeholder="My Pipeline"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPipelineName.trim()) {
                    handleCreateNewPipeline();
                  }
                }}
              />
            </div>
            
            <div className="p-6 border-t border-gray-100 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNewPipelineModal(false);
                  setNewPipelineName('');
                }}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewPipeline}
                disabled={!newPipelineName.trim()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Create Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Project Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Share Project
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Invite others to collaborate on "{project?.name}"
                </p>
              </div>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareEmail('');
                  setShareError('');
                  setProjectShares([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Share form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => {
                      setShareEmail(e.target.value);
                      setShareError('');
                    }}
                    placeholder="colleague@example.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permission Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['view', 'edit', 'admin'] as const).map((perm) => (
                      <button
                        key={perm}
                        onClick={() => setSharePermission(perm)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          sharePermission === perm
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {perm === 'view' && 'View Only'}
                        {perm === 'edit' && 'Can Edit'}
                        {perm === 'admin' && 'Admin'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {sharePermission === 'view' && 'Can view project contents but cannot make changes'}
                    {sharePermission === 'edit' && 'Can view and edit datasets, pipelines, and visualizations'}
                    {sharePermission === 'admin' && 'Full access including managing who the project is shared with'}
                  </p>
                </div>
                
                {shareError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {shareError}
                  </div>
                )}
                
                <button
                  onClick={handleShareProject}
                  disabled={!shareEmail.trim() || isSharing}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
                >
                  {isSharing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Sharing...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      <span>Share Project</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Existing shares */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  People with access
                </h4>
                
                {loadingShares ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-600 border-t-transparent"></div>
                  </div>
                ) : projectShares.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    This project hasn't been shared with anyone yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {projectShares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {share.sharedWithEmail}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {share.permission} access
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveShare(share.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove access"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

