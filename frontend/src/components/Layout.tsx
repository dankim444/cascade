import React, { useState } from 'react';
import { Menu, X, Upload, Play, Save } from 'lucide-react';
import { NodePalette } from './NodePalette';
import { DataUpload } from './DataUpload';
import WorkflowEditor from './WorkflowEditor';
import { DebugPanel } from './DebugPanel';
import { ResultsViewer } from './ResultsViewer';
import { useWorkflowStore } from '../store/useWorkflowStore';

export const Layout: React.FC = () => {
  const [showPalette, setShowPalette] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const { datasets, nodes, savePipeline, executePipeline } = useWorkflowStore();

  const handleUploadComplete = () => {
    setShowUpload(false);
  };

  const handleRunPipeline = async () => {
    if (nodes.length === 0) {
      alert('Please add some transform nodes to your pipeline first.');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    
    try {
      console.log('Running pipeline...');
      const result = await executePipeline();
      console.log('Pipeline result:', result);
      
      setExecutionResult(result);
      setShowResults(true); // Show results viewer instead of alert
      
    } catch (error: any) {
      console.error('Pipeline execution error:', error);
      setExecutionResult({ 
        status: 'error', 
        error: error.message || 'Unknown error',
        detail: error.toString()
      });
      setShowResults(true); // Show error in results viewer
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">Cascade</h1>
          <span className="text-sm text-gray-500">No-Code Data Platform</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Data</span>
          </button>
          
          <button
            onClick={handleRunPipeline}
            disabled={isExecuting || nodes.length === 0}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              isExecuting || nodes.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {isExecuting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Run Pipeline</span>
              </>
            )}
          </button>
          
          <button
            onClick={savePipeline}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showPalette && (
          <div className="flex-shrink-0">
            <NodePalette />
          </div>
        )}
        
        {/* Workflow Editor */}
        <div className="flex-1 relative">
          <WorkflowEditor />
          
          {/* Toggle Palette Button */}
          <button
            onClick={() => setShowPalette(!showPalette)}
            className="absolute top-4 left-4 z-10 p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            {showPalette ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Data Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Upload Dataset</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <DataUpload onUploadComplete={handleUploadComplete} />
            
            {datasets.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Loaded Datasets:</h3>
                <div className="space-y-1">
                  {datasets.map((dataset) => (
                    <div key={dataset.id} className="text-sm text-gray-600">
                      {dataset.name} ({dataset.rowCount} rows)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Viewer Modal */}
      {showResults && executionResult && (
        <ResultsViewer
          result={executionResult}
          onClose={() => setShowResults(false)}
        />
      )}

      {/* Debug Panel - Remove this in production */}
      <DebugPanel />
    </div>
  );
};
