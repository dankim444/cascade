import React, { useState, useEffect, useCallback } from 'react';
import { Edit2 } from 'lucide-react';
import { FullGraphConfigPanel } from './FullGraphConfigPanel';
import { GraphViewer } from './GraphViewer';
import { graphAPI } from '../services/graphAPI';
import { datasetAPI } from '../services/api';
import { useWorkflowStore } from '../store/useWorkflowStore';
import type { GraphConfig, GraphResponse, SavedGraph } from '../services/graphAPI';

interface GraphsLayoutProps {
  projectId?: string;
  onGraphSaved?: () => void;
  canEdit?: boolean;
  liveRefreshToken?: number;
}

export const GraphsLayout: React.FC<GraphsLayoutProps> = ({
  projectId,
  onGraphSaved,
  canEdit: _canEdit,
  liveRefreshToken,
}) => {
  const canEdit = _canEdit ?? true;
  const { datasets, setDatasets } = useWorkflowStore();
  const [selectedDataKey, setSelectedDataKey] = useState<string>('');
  const [showGraphConfig, setShowGraphConfig] = useState(false);
  const [currentGraph, setCurrentGraph] = useState<GraphResponse | null>(null);
  const [savedGraphs, setSavedGraphs] = useState<SavedGraph[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [renamingDatasetId, setRenamingDatasetId] = useState<string | null>(null);

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

  const handleDatasetSelect = (dataKey: string) => {
    if (!canEdit) {
      alert('You have view-only access to this project. You need edit or admin permission to create visualizations.');
      return;
    }
    setSelectedDataKey(dataKey);
    setShowGraphConfig(true);
    setCurrentGraph(null);
  };

  const handleGenerateGraph = async (config: GraphConfig) => {
    if (!selectedDataKey) return;

    setIsGenerating(true);
    try {
      const response = await graphAPI.generate({
        data_key: selectedDataKey,
        config
      });
      setCurrentGraph(response);
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
      await graphAPI.saveGraph({
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
      
      alert('Graph saved successfully!');
    } catch (error) {
      console.error('Error saving graph:', error);
      alert('Failed to save graph. Please try again.');
    }
  };

  const handleLoadSavedGraph = async (savedGraph: SavedGraph) => {
    setSelectedDataKey(savedGraph.data_key);
    
    setIsGenerating(true);
    try {
      const response = await graphAPI.generate({
        data_key: savedGraph.data_key,
        config: savedGraph.config
      });
      setCurrentGraph(response);
    } catch (error) {
      console.error('Error loading saved graph:', error);
      const message = error instanceof Error ? error.message : 'Failed to load saved graph.';
      alert(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteSavedGraph = async (graphId: string) => {
    try {
      await graphAPI.deleteSavedGraph(graphId);
      
      // Refresh saved graphs list
      await loadSavedGraphs();

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

  const handleRenameDataset = async (datasetId: string, currentName: string) => {
    if (!canEdit) return;
    const nextNameRaw = prompt('Rename dataset', currentName);
    if (nextNameRaw === null) return;
    const nextName = nextNameRaw.trim();
    if (!nextName || nextName === currentName) return;
    try {
      setRenamingDatasetId(datasetId);
      const updated = await datasetAPI.rename(datasetId, nextName);
      setDatasets(datasets.map((ds) => (ds.id === datasetId ? { ...ds, name: updated.name } : ds)));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to rename dataset';
      alert(message);
    } finally {
      setRenamingDatasetId(null);
    }
  };

  return (
    <div className="h-full flex bg-gray-50">
      {/* Left Panel - Dataset Selection and Saved Graphs */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Dataset Selection */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Dataset
          </h2>
          
          {datasets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No datasets available</p>
              <p className="text-sm">
                Upload data in the Pipeline tab first
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {datasets.map((dataset) => (
                <div
                  key={dataset.dataKey}
                  className={`group rounded-lg border transition-colors ${
                    selectedDataKey === dataset.dataKey
                      ? 'border-indigo-500 bg-white'
                      : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => handleDatasetSelect(dataset.dataKey)}
                      disabled={!canEdit}
                      className={`flex-1 text-left px-4 py-3 transition-colors ${
                        !canEdit ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className={`font-medium ${selectedDataKey === dataset.dataKey ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {dataset.name || dataset.dataKey.replace('data_', '')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {dataset.rowCount ? `${dataset.rowCount.toLocaleString()} rows` : 'Dataset'} • {dataset.columns?.length || 0} columns
                      </div>
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRenameDataset(dataset.id, dataset.name)}
                        disabled={renamingDatasetId === dataset.id}
                        className="m-2 p-1.5 text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 hover:text-indigo-700 hover:bg-indigo-100 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Rename dataset"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Graphs */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Saved Graphs
          </h2>
          
          {savedGraphs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No saved graphs</p>
              <p className="text-sm">
                Create and save graphs to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedGraphs.map((graph) => (
                <div
                  key={graph.id}
                  className="group p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {graph.name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {graph.config.graph_type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(graph.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleLoadSavedGraph(graph)}
                        className="p-1.5 text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 hover:text-indigo-700 hover:bg-indigo-100 rounded transition-colors"
                        title="Load graph"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSavedGraph(graph.id)}
                        className="p-1.5 text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 hover:text-indigo-700 hover:bg-indigo-100 rounded transition-colors"
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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white">
        {currentGraph ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentGraph.config.title || `${currentGraph.config.graph_type.charAt(0).toUpperCase() + currentGraph.config.graph_type.slice(1)} Chart`}
                  </h2>
                  <p className="text-sm text-gray-500 capitalize">
                    {currentGraph.config.graph_type.replace('_', ' ')} • {currentGraph.config.theme.replace('_', ' ')}
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  {canEdit && (
                    <button
                      onClick={() => {
                        const name = prompt('Enter a name for this graph:');
                        if (name) handleSaveGraph(name);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Save</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setCurrentGraph(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Close
                  </button>
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
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Create Your First Graph
              </h3>
              <p className="text-gray-500 mb-4">
                Select a dataset and configure your visualization
              </p>
              {!selectedDataKey && (
                <p className="text-sm text-gray-400">
                  Choose a dataset from the left panel to get started
                </p>
              )}
            </div>
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
    </div>
  );
};
