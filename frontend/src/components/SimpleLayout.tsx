import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { TransformPanel } from './TransformPanel';
import { DataUpload } from './DataUpload';
import { ResultsViewer } from './ResultsViewer';
import { useWorkflowStore } from '../store/useWorkflowStore';
import type { TransformOperation } from '../types';

export const SimpleLayout: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  
  const { datasets } = useWorkflowStore();

  const handleUploadComplete = () => {
    setShowUpload(false);
  };

  const handleExecute = async (datasetId: string, operation: TransformOperation, config: any) => {
    try {
      console.log('Executing:', { datasetId, operation, config });
      
      const dataset = datasets.find(d => d.id === datasetId);
      if (!dataset) throw new Error('Dataset not found');

      // Build the transformation request
      const transformation = {
        operation,
        params: [JSON.stringify(config)]
      };

      // Build data connections - include ALL datasets for join operations
      const dataConnections = datasets.map(ds => ({
        dataKey: ds.dataKey,
        sqlConnection: `data/${ds.dataKey}.db`,
        schema: { columns: ds.columns },
        rowCount: ds.rowCount
      }));

      const requestBody = {
        nodes: [{
          id: 'single-transform',
          transform: transformation,
          data: dataset.dataKey,
          parent: undefined,
          child: undefined
        }],
        dataConnections: dataConnections
      };

      console.log('Sending request:', requestBody);

      const response = await fetch('http://localhost:8000/api/transformations/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Result:', result);
      
      setExecutionResult(result);
      setShowResults(true);

    } catch (error: any) {
      console.error('Execution error:', error);
      setExecutionResult({
        status: 'error',
        error: error.message || 'Unknown error',
        detail: error.toString()
      });
      setShowResults(true);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Cascade</h1>
          <span className="text-sm text-gray-500">Simple Data Transformations</span>
        </div>
        
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Data</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transform Panel */}
        <TransformPanel 
          datasets={datasets} 
          onExecute={handleExecute}
        />
        
        {/* Main Area */}
        <div className="flex-1 flex items-center justify-center p-8">
          {datasets.length === 0 ? (
            <div className="text-center max-w-md">
              <div className="bg-blue-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Upload className="h-12 w-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h2>
              <p className="text-gray-600 mb-6">
                Upload a CSV file to begin transforming your data
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Upload Your First Dataset
              </button>
            </div>
          ) : (
            <div className="text-center max-w-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Transform</h2>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600 mb-1">1</div>
                    <p className="text-sm text-gray-700">Select your dataset from the left panel</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-600 mb-1">2</div>
                    <p className="text-sm text-gray-700">Choose an operation (filter, select, etc.)</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-600 mb-1">3</div>
                    <p className="text-sm text-gray-700">Configure and run the transformation</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Loaded Datasets:</h3>
                  <div className="space-y-2">
                    {datasets.map((ds) => (
                      <div key={ds.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                        <span className="font-medium text-gray-900">{ds.name}</span>
                        <span className="text-gray-500">{ds.rowCount.toLocaleString()} rows • {ds.columns.length} columns</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <DataUpload onUploadComplete={handleUploadComplete} />
          </div>
        </div>
      )}

      {/* Results Viewer */}
      {showResults && executionResult && (
        <ResultsViewer
          result={executionResult}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
};

