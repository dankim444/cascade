import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { BarChart3, Plus, Trash2 } from 'lucide-react';
// Define types locally to avoid import issues
interface Column {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  nullable: boolean;
}

interface GroupByNodeData {
  config: {
    groupColumns: string[];
    aggregations: Array<{
      column: string;
      operation: 'sum' | 'mean' | 'count' | 'min' | 'max';
      alias?: string;
    }>;
  };
  availableColumns: Column[];
}

export const GroupByNode: React.FC<NodeProps<GroupByNodeData>> = ({ data, selected, id }) => {
  const [config, setConfig] = useState(data.config || {
    groupColumns: [],
    aggregations: []
  });

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    // In a real app, this would update the store
  };

  const addAggregation = () => {
    const newAggregation = {
      column: data.availableColumns[0]?.name || '',
      operation: 'sum' as const,
      alias: ''
    };
    handleConfigChange('aggregations', [...config.aggregations, newAggregation]);
  };

  const updateAggregation = (index: number, field: string, value: any) => {
    const newAggregations = [...config.aggregations];
    newAggregations[index] = { ...newAggregations[index], [field]: value };
    handleConfigChange('aggregations', newAggregations);
  };

  const removeAggregation = (index: number) => {
    const newAggregations = config.aggregations.filter((_, i) => i !== index);
    handleConfigChange('aggregations', newAggregations);
  };

  const toggleGroupColumn = (columnName: string) => {
    const newGroupColumns = config.groupColumns.includes(columnName)
      ? config.groupColumns.filter(col => col !== columnName)
      : [...config.groupColumns, columnName];
    handleConfigChange('groupColumns', newGroupColumns);
  };

  return (
    <div className={`
      bg-white border-2 rounded-lg shadow-lg p-4 min-w-[280px]
      ${selected ? 'border-blue-500' : 'border-gray-200'}
    `}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
      
      <div className="flex items-center space-x-2 mb-3">
        <BarChart3 className="h-5 w-5 text-orange-500" />
        <span className="font-medium text-gray-900">Group & Aggregate</span>
      </div>
      
      <div className="space-y-4">
        {/* Group By Columns */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Group by columns
          </label>
          <div className="max-h-20 overflow-y-auto space-y-1">
            {data.availableColumns.map((column) => (
              <label
                key={column.name}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={config.groupColumns.includes(column.name)}
                  onChange={() => toggleGroupColumn(column.name)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 flex-1">{column.name}</span>
                <span className="text-xs text-gray-500">{column.type}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Aggregations */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">
              Aggregations
            </label>
            <button
              onClick={addAggregation}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              <Plus className="h-3 w-3" />
              <span>Add</span>
            </button>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {config.aggregations.map((agg, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <select
                  value={agg.column}
                  onChange={(e) => updateAggregation(index, 'column', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {data.availableColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))}
                </select>
                
                <select
                  value={agg.operation}
                  onChange={(e) => updateAggregation(index, 'operation', e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="sum">Sum</option>
                  <option value="mean">Mean</option>
                  <option value="count">Count</option>
                  <option value="min">Min</option>
                  <option value="max">Max</option>
                </select>
                
                <button
                  onClick={() => removeAggregation(index)}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
