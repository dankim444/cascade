import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../store/useWorkflowStore';
import type { GraphConfig } from '../services/graphAPI';

interface SimpleGraphConfigPanelProps {
  dataKey: string;
  onGenerate: (config: GraphConfig) => void;
  onClose: () => void;
  isGenerating: boolean;
}

export const SimpleGraphConfigPanel: React.FC<SimpleGraphConfigPanelProps> = ({
  dataKey,
  onGenerate,
  onClose,
  isGenerating
}) => {
  const { datasets } = useWorkflowStore();
  const [graphType, setGraphType] = useState('bar');
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');
  const [zColumn, setZColumn] = useState('');

  // Get the current dataset and its columns
  const currentDataset = datasets.find(d => d.dataKey === dataKey);
  const columns = currentDataset?.columns || [];
  const numericColumns = columns.filter((col) => {
    const t = String(col.type || '').toLowerCase();
    return t.includes('number') || t.includes('int') || t.includes('float') || t.includes('double');
  });
  
  // Set default columns when dataset changes
  useEffect(() => {
    if (columns.length > 0) {
      setXColumn(columns[0].name);
      if (columns.length > 1) {
        setYColumn(columns[1].name);
      }
    }
  }, [columns]);

  const handleGenerate = () => {
    console.log('Generate button clicked!'); // Debug log
    console.log('Selected columns:', { xColumn, yColumn }); // Debug log
    
    const config: GraphConfig = {
      graph_type: graphType,
      x_column: xColumn,
      y_column: graphType === 'histogram' ? undefined : yColumn,
      z_column:
        graphType === 'scatter' && zColumn
          ? zColumn
          : undefined,
      width: 800,
      height: 600,
      theme: 'plotly_white',
    };
    onGenerate(config);
  };

  const handleClose = () => {
    console.log('Close button clicked!'); // Debug log
    onClose();
  };

  const handleGraphTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('Graph type changed to:', e.target.value); // Debug log
    setGraphType(e.target.value);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        // Close modal if clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Configure Graph
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dataset: {currentDataset?.filename || currentDataset?.name || dataKey.replace('data_', '').substring(0, 8)}
              </label>
              <p className="text-sm text-gray-500">
                {columns.length} columns • {currentDataset?.rowCount?.toLocaleString() || 0} rows
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Graph Type
              </label>
              <select
                value={graphType}
                onChange={handleGraphTypeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="scatter">Scatter Plot</option>
                <option value="pie">Pie Chart</option>
                <option value="histogram">Histogram</option>
              </select>
            </div>

            {columns.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    X-Axis Column
                  </label>
                  <select
                    value={xColumn}
                    onChange={(e) => setXColumn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {columns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name} ({col.type})
                      </option>
                    ))}
                  </select>
                </div>

                {graphType !== 'histogram' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Y-Axis Column
                    </label>
                    <select
                      value={yColumn}
                      onChange={(e) => setYColumn(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {columns.map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name} ({col.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {graphType === 'scatter' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Z-Axis Column (optional, 3D)
                    </label>
                    <select
                      value={zColumn}
                      onChange={(e) => setZColumn(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">None (2D scatter)</option>
                      {(numericColumns.length > 0 ? numericColumns : columns).map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name} ({col.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {columns.length === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  No columns found for this dataset. Please check the dataset in the Pipeline tab.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !xColumn || (graphType !== 'histogram' && !yColumn)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isGenerating || !xColumn || (graphType !== 'histogram' && !yColumn)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isGenerating ? 'Generating...' : 'Generate Graph'}
          </button>
        </div>
      </div>
    </div>
  );
};
