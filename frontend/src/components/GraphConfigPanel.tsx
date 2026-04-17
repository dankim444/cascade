import React, { useState, useEffect } from 'react';
import { graphAPI } from '../services/graphAPI';
import type { GraphConfig, GraphType, Column } from '../services/graphAPI';

interface GraphConfigPanelProps {
  dataKey: string;
  onGenerate: (config: GraphConfig) => void;
  onClose: () => void;
  isGenerating: boolean;
}

export const GraphConfigPanel: React.FC<GraphConfigPanelProps> = ({
  dataKey,
  onGenerate,
  onClose,
  isGenerating
}) => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [numericColumns, setNumericColumns] = useState<string[]>([]);
  const [graphTypes, setGraphTypes] = useState<GraphType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<GraphConfig>({
    graph_type: 'bar',
    width: 800,
    height: 600,
    theme: 'plotly_white'
  });

  useEffect(() => {
    fetchData();
  }, [dataKey]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch columns
      const columnsResponse = await graphAPI.getColumns(dataKey);
      setColumns(columnsResponse.columns);
      setNumericColumns(columnsResponse.numeric_columns);
      
      // Fetch graph types
      const typesResponse = await graphAPI.getGraphTypes();
      setGraphTypes(typesResponse.graph_types);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedGraphType = graphTypes.find(t => t.type === config.graph_type);

  const getColumnOptions = (fieldType: 'x' | 'y' | 'color' | 'size') => {
    // For numeric fields, prefer numeric columns
    if (fieldType === 'y' || fieldType === 'size') {
      return numericColumns;
    }
    // For other fields, show all columns
    return columns.map(c => c.name);
  };

  type FieldEntry = GraphType['fields'][string];

  const renderField = (fieldName: string, fieldConfig: FieldEntry) => {
    const fieldType = fieldName.includes('y') || fieldName.includes('size') ? 'y' :
                     fieldName.includes('color') ? 'color' : 'x';

    const options = getColumnOptions(fieldType);
    const value = (config as unknown as Record<string, unknown>)[fieldName] || '';

    return (
      <div key={fieldName}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {fieldConfig.label} {fieldConfig.required && <span className="text-red-500">*</span>}
        </label>
        {fieldConfig.help ? (
          <p className="text-xs text-gray-500 mb-2">{fieldConfig.help}</p>
        ) : null}
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) =>
            setConfig({ ...config, [fieldName]: e.target.value || undefined } as GraphConfig)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select column...</option>
          {options.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const isConfigValid = () => {
    if (!selectedGraphType) return false;

    return Object.entries(selectedGraphType.fields).every(([fieldName, fieldConfig]) => {
      if (!fieldConfig.required) return true;
      const value = (config as unknown as Record<string, unknown>)[fieldName];
      return typeof value === 'string' && value.trim() !== '';
    });
  };

  const handleGenerate = () => {
    if (isConfigValid()) {
      onGenerate(config);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-red-600">
            <h3 className="font-medium mb-2">Error</h3>
            <p className="text-sm mb-4">{error}</p>
            <div className="flex space-x-3">
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Configure Graph
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Graph Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Graph Type
              </label>
              <select
                value={config.graph_type}
                onChange={(e) => setConfig({ ...config, graph_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {graphTypes.map((type) => (
                  <option key={type.type} value={type.type}>
                    {type.name}
                  </option>
                ))}
              </select>
              {selectedGraphType?.description && (
                <p className="mt-2 text-sm text-gray-500">
                  {selectedGraphType.description}
                </p>
              )}
            </div>

            {/* Dynamic Field Rendering */}
            {selectedGraphType && Object.keys(selectedGraphType.fields).length > 0 && (
              <div className="space-y-4">
                {Object.entries(selectedGraphType.fields)
                  .filter(([, fieldConfig]) => fieldConfig.required)
                  .map(([fieldName, fieldConfig]) => renderField(fieldName, fieldConfig))}
                {Object.entries(selectedGraphType.fields).some(
                  ([, fieldConfig]) => !fieldConfig.required
                ) && (
                  <>
                    <h5 className="font-medium text-gray-700 text-sm">Optional fields</h5>
                    {Object.entries(selectedGraphType.fields)
                      .filter(([, fieldConfig]) => !fieldConfig.required)
                      .map(([fieldName, fieldConfig]) => renderField(fieldName, fieldConfig))}
                  </>
                )}
              </div>
            )}

            {/* Graph Styling */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={config.title || ''}
                  onChange={(e) => setConfig({ ...config, title: e.target.value || undefined })}
                  placeholder="Enter graph title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select
                  value={config.theme}
                  onChange={(e) => setConfig({ ...config, theme: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="plotly_white">Clean White</option>
                  <option value="plotly">Default</option>
                  <option value="plotly_dark">Dark</option>
                  <option value="ggplot2">ggplot2</option>
                  <option value="seaborn">Seaborn</option>
                  <option value="simple_white">Simple White</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width
                  </label>
                  <input
                    type="number"
                    value={config.width}
                    onChange={(e) => setConfig({ ...config, width: parseInt(e.target.value) || 800 })}
                    min="400"
                    max="1600"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height
                  </label>
                  <input
                    type="number"
                    value={config.height}
                    onChange={(e) => setConfig({ ...config, height: parseInt(e.target.value) || 600 })}
                    min="300"
                    max="1200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!isConfigValid() || isGenerating}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isConfigValid() && !isGenerating
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </div>
            ) : (
              'Generate Graph'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
