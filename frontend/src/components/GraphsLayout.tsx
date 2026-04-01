import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { FullGraphConfigPanel } from './FullGraphConfigPanel';
import { GraphViewer } from './GraphViewer';
import { DataUpload } from './DataUpload';
import { graphAPI } from '../services/graphAPI';
import { datasetAPI } from '../services/api';
import { useWorkflowStore } from '../store/useWorkflowStore';
import type { GraphConfig, GraphResponse, SavedGraph } from '../services/graphAPI';

interface GraphsLayoutProps {
  projectId?: string;
  onGraphSaved?: () => void;
  canEdit?: boolean;
  liveRefreshToken?: number;
  openSavedGraphId?: string | null;
  openSavedGraphNonce?: number;
  onOpenSavedGraphHandled?: () => void;
}

export const GraphsLayout: React.FC<GraphsLayoutProps> = ({
  projectId,
  onGraphSaved,
  canEdit: _canEdit,
  liveRefreshToken,
  openSavedGraphId,
  openSavedGraphNonce,
  onOpenSavedGraphHandled,
}) => {
  const canEdit = _canEdit ?? true;
  const { datasets, setDatasets } = useWorkflowStore();
  const [selectedDataKey, setSelectedDataKey] = useState<string>('');
  const [showGraphConfig, setShowGraphConfig] = useState(false);
  const [currentGraph, setCurrentGraph] = useState<GraphResponse | null>(null);
  const [activeSavedGraph, setActiveSavedGraph] = useState<SavedGraph | null>(null);
  const [savedGraphs, setSavedGraphs] = useState<SavedGraph[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const loadRequestIdRef = useRef(0);
  const handledOpenNonceRef = useRef<number | null>(null);

  // Datasets are now available directly from the Zustand store
  // No need for useEffect to load them

  const loadSavedGraphs = useCallback(async () => {
    try {
      const graphs = await graphAPI.getSavedGraphs(projectId);
      setSavedGraphs(graphs);
    } catch (error) {
      console.error('Error loading saved graphs:', error);
      // Fallback to localStorage for migration
      const saved = localStorage.getItem('savedGraphs');
      if (saved) {
        try {
          const localGraphs = JSON.parse(saved);
          setSavedGraphs(localGraphs);
          // TODO: Migrate local graphs to backend
        } catch (e) {
          console.error('Error parsing local saved graphs:', e);
        }
      }
    }
  }, [projectId]);

  // Initial load
  useEffect(() => {
    loadSavedGraphs();
  }, [loadSavedGraphs]);

  // Refresh when parent notifies us of a collaboration update
  useEffect(() => {
    if (typeof liveRefreshToken === 'number') {
      loadSavedGraphs();
    }
  }, [liveRefreshToken, loadSavedGraphs]);

  const handleGenerateGraph = async (config: GraphConfig) => {
    if (!selectedDataKey) return;

    setIsGenerating(true);
    try {
      const response = await graphAPI.generate({
        data_key: selectedDataKey,
        config
      });
      setCurrentGraph(response);
      setActiveSavedGraph(null);
      setShowGraphConfig(false);
    } catch (error) {
      console.error('Error generating graph:', error);
      alert('Failed to generate graph. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGraph = async (name: string) => {
    if (!canEdit) {
      alert('You have view-only access to this project. You need edit or admin permission to save visualizations.');
      return;
    }
    if (!currentGraph || !selectedDataKey) return;

    try {
      const saveResult = await graphAPI.saveGraph({
        name,
        config: currentGraph.config,
        data_key: selectedDataKey,
        project_id: projectId
      });
      
      // Refresh saved graphs list
      await loadSavedGraphs();
      
      // Notify parent component that a graph was saved
      if (onGraphSaved) {
        onGraphSaved();
      }

      setActiveSavedGraph({
        id: saveResult.id,
        name,
        config: currentGraph.config,
        data_key: selectedDataKey,
        project_id: projectId,
        created_at: new Date().toISOString(),
      });
      
      alert('Graph saved successfully!');
    } catch (error) {
      console.error('Error saving graph:', error);
      alert('Failed to save graph. Please try again.');
    }
  };

  const handleLoadSavedGraph = async (savedGraph: SavedGraph) => {
    const requestId = ++loadRequestIdRef.current;
    setSelectedDataKey(savedGraph.data_key);
    
    setIsGenerating(true);
    try {
      const response = await graphAPI.generate({
        data_key: savedGraph.data_key,
        config: savedGraph.config
      });
      if (requestId !== loadRequestIdRef.current) return;
      setCurrentGraph(response);
      setActiveSavedGraph(savedGraph);
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error('Error loading saved graph:', error);
      const message = error instanceof Error ? error.message : 'Failed to load saved graph.';
      alert(message);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const handleDeleteSavedGraph = async (graphId: string) => {
    const confirmed = window.confirm('Delete this saved graph? This action cannot be undone.');
    if (!confirmed) return;
    try {
      await graphAPI.deleteSavedGraph(graphId);
      
      // Refresh saved graphs list
      await loadSavedGraphs();

      if (activeSavedGraph?.id === graphId) {
        setCurrentGraph(null);
        setActiveSavedGraph(null);
      }

      // Notify parent component so tab badge count stays in sync
      if (onGraphSaved) {
        onGraphSaved();
      }
    } catch (error) {
      console.error('Error deleting saved graph:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete graph. Please try again.';
      alert(message);
    }
  };

  const handleRenameSavedGraph = async () => {
    if (!activeSavedGraph) return;
    const nextNameRaw = prompt('Rename graph', activeSavedGraph.name);
    if (nextNameRaw === null) return;
    const nextName = nextNameRaw.trim();
    if (!nextName || nextName === activeSavedGraph.name) return;

    try {
      await graphAPI.updateSavedGraph(activeSavedGraph.id, {
        name: nextName,
        config: activeSavedGraph.config,
        data_key: activeSavedGraph.data_key,
        project_id: activeSavedGraph.project_id,
      });

      setActiveSavedGraph((prev) => (prev ? { ...prev, name: nextName } : prev));
      setSavedGraphs((prev) => prev.map((graph) => (
        graph.id === activeSavedGraph.id ? { ...graph, name: nextName } : graph
      )));

      if (onGraphSaved) {
        onGraphSaved();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename graph.';
      alert(message);
    }
  };

  useEffect(() => {
    if (!openSavedGraphId) return;
    if (typeof openSavedGraphNonce !== 'number') return;
    if (handledOpenNonceRef.current === openSavedGraphNonce) return;

    const targetGraph = savedGraphs.find((graph) => graph.id === openSavedGraphId);
    if (!targetGraph) return;

    handledOpenNonceRef.current = openSavedGraphNonce;
    onOpenSavedGraphHandled?.();
    void handleLoadSavedGraph(targetGraph);
  }, [openSavedGraphId, openSavedGraphNonce, savedGraphs, onOpenSavedGraphHandled]);

  const refreshDatasets = useCallback(async () => {
    const latestDatasets = await datasetAPI.getAll(projectId);
    const normalized = latestDatasets.map((ds) => ({
      ...ds,
      dataKey: ds.dataKey || `data_${ds.id}`,
      preview: ds.preview || [],
    }));
    setDatasets(normalized);
  }, [projectId, setDatasets]);

  const openGraphConfig = useCallback(() => {
    if (!canEdit) {
      alert('You have view-only access to this project. You need edit or admin permission to create visualizations.');
      return;
    }
    if (!selectedDataKey) {
      alert('Select a dataset first.');
      return;
    }
    setShowGraphConfig(true);
    setCurrentGraph(null);
    setActiveSavedGraph(null);
  }, [canEdit, selectedDataKey]);

  useEffect(() => {
    if (!selectedDataKey && datasets.length > 0) {
      setSelectedDataKey(datasets[0].dataKey);
    }
  }, [datasets, selectedDataKey]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-700" htmlFor="visualization-dataset-select">
            Dataset
          </label>
          <select
            id="visualization-dataset-select"
            value={selectedDataKey}
            onChange={(e) => setSelectedDataKey(e.target.value)}
            disabled={datasets.length === 0}
            className="min-w-[280px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60"
          >
            {datasets.length === 0 && <option value="">No datasets</option>}
            {datasets.map((dataset) => (
              <option key={dataset.dataKey} value={dataset.dataKey}>
                {dataset.name}
              </option>
            ))}
          </select>
          {canEdit && (
            <button
              type="button"
              onClick={openGraphConfig}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Create Graph
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <Upload className="h-4 w-4" />
              Upload Dataset
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white overflow-y-auto">
        {isGenerating && !currentGraph ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              <p className="text-sm font-medium text-gray-700">Loading graph...</p>
              <p className="text-xs text-gray-500 mt-1">This can take a few seconds for larger datasets.</p>
            </div>
          </div>
        ) : currentGraph ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {activeSavedGraph?.name || currentGraph.config.title || `${currentGraph.config.graph_type.charAt(0).toUpperCase() + currentGraph.config.graph_type.slice(1)} Chart`}
                  </h2>
                  <p className="text-sm text-gray-500 capitalize">
                    {currentGraph.config.graph_type.replace('_', ' ')} • {currentGraph.config.theme.replace('_', ' ')}
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  {activeSavedGraph && (
                    <button
                      onClick={() => {
                        loadRequestIdRef.current += 1;
                        setIsGenerating(false);
                        setCurrentGraph(null);
                        setActiveSavedGraph(null);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Back to Graphs
                    </button>
                  )}
                  {canEdit && !activeSavedGraph && (
                    <button
                      onClick={() => {
                        const name = prompt('Enter a name for this graph:');
                        if (name) handleSaveGraph(name);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Save</span>
                    </button>
                  )}
                  {!activeSavedGraph && (
                    <button
                      onClick={() => setCurrentGraph(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  )}
                  {canEdit && activeSavedGraph && (
                    <>
                      <button
                        onClick={handleRenameSavedGraph}
                        className="p-2 text-gray-500 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                        title="Rename graph"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m-1-1v2m7.071 2.929a2 2 0 010 2.828l-8.486 8.486a2 2 0 01-.878.515l-3.08.88a.5.5 0 01-.617-.617l.88-3.08a2 2 0 01.515-.878l8.486-8.486a2 2 0 012.828 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSavedGraph(activeSavedGraph.id)}
                        className="p-2 text-gray-500 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                        title="Delete graph"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Graph Display */}
            <div className="flex-1 p-6 bg-gray-50 overflow-auto">
              <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <GraphViewer graph={currentGraph} embedded={true} />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {savedGraphs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 py-20">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Create your first graph
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Select a dataset and create a visualization.
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={openGraphConfig}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    >
                      Create Graph
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedGraphs.map((graph) => (
                  <div
                    key={graph.id}
                    onClick={() => handleLoadSavedGraph(graph)}
                    className="group cursor-pointer bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{graph.name}</h3>
                        <p className="text-xs text-gray-500 capitalize mt-1">
                          {graph.config.graph_type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(graph.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteSavedGraph(graph.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-indigo-700 hover:bg-indigo-100 rounded transition-colors"
                          title="Delete graph"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Graph Configuration Modal */}
      {showGraphConfig && selectedDataKey && (
        <FullGraphConfigPanel
          dataKey={selectedDataKey}
          onGenerate={handleGenerateGraph}
          onClose={() => setShowGraphConfig(false)}
          isGenerating={isGenerating}
        />
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Upload Dataset</h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DataUpload
              projectId={projectId}
              onUploadComplete={async () => {
                await refreshDatasets();
                setShowUploadModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
