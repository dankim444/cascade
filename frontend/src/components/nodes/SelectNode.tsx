import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Columns, CheckSquare, Square } from 'lucide-react';
// Define types locally to avoid import issues
interface Column {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  nullable: boolean;
}

interface SelectNodeData {
  config: {
    columns: string[];
  };
  availableColumns: Column[];
}

export const SelectNode: React.FC<NodeProps<SelectNodeData>> = ({ data, selected, id }) => {
  const [config, setConfig] = useState(data.config || {
    columns: data.availableColumns.map(col => col.name)
  });

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    // In a real app, this would update the store
  };

  const toggleColumn = (columnName: string) => {
    const newColumns = config.columns.includes(columnName)
      ? config.columns.filter(col => col !== columnName)
      : [...config.columns, columnName];
    handleConfigChange('columns', newColumns);
  };

  const selectAll = () => {
    handleConfigChange('columns', data.availableColumns.map(col => col.name));
  };

  const selectNone = () => {
    handleConfigChange('columns', []);
  };

  return (
    <div className={`
      bg-white border-2 rounded-lg shadow-lg p-4 min-w-[250px]
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
        <Columns className="h-5 w-5 text-purple-500" />
        <span className="font-medium text-gray-900">Select Columns</span>
      </div>
      
      <div className="space-y-3">
        {/* Selection Controls */}
        <div className="flex space-x-2">
          <button
            onClick={selectAll}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Select None
          </button>
        </div>
        
        {/* Column List */}
        <div className="max-h-32 overflow-y-auto space-y-1">
          {data.availableColumns.map((column) => (
            <label
              key={column.name}
              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
            >
              <button
                onClick={() => toggleColumn(column.name)}
                className="flex-shrink-0"
              >
                {config.columns.includes(column.name) ? (
                  <CheckSquare className="h-4 w-4 text-blue-500" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
              </button>
              <span className="text-sm text-gray-700 flex-1">{column.name}</span>
              <span className="text-xs text-gray-500">{column.type}</span>
            </label>
          ))}
        </div>
        
        {/* Selected Count */}
        <div className="text-xs text-gray-500 text-center">
          {config.columns.length} of {data.availableColumns.length} columns selected
        </div>
      </div>
    </div>
  );
};
