import React, { useState } from 'react';
import { Menu, X, Upload, Play, Save } from 'lucide-react';
import { NodePalette } from './NodePalette';
import { DataUpload } from './DataUpload';
import WorkflowEditor from './WorkflowEditor';
import { useWorkflowStore } from '../store/useWorkflowStore';

export const Layout: React.FC = () => {
  const [showPalette, setShowPalette] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { datasets, savePipeline, executePipeline } = useWorkflowStore();

  const handleUploadComplete = () => {
    setShowUpload(false);
  };

  const handleRunPipeline = async () => {
    try {
      console.log('Running pipeline...');
      const result = await executePipeline();
      console.log('Pipeline result:', result);
      
      if (result.status === 'success') {
        alert(`Pipeline executed successfully! Output: ${result.outputRows} rows`);
      } else {
        alert(`Pipeline failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Pipeline execution error:', error);
      alert('Pipeline execution failed. Check console for details.');
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
            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Play className="h-4 w-4" />
            <span>Run Pipeline</span>
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
    </div>
  );
};
