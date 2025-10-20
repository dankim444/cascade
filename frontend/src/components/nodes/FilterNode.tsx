import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Filter, ChevronDown } from 'lucide-react';
// Define types locally to avoid import issues
interface Column {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  nullable: boolean;
}

interface FilterNodeData {
  config: {
    column: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: string | number;
  };
  columns: Column[];
}

export const FilterNode: React.FC<NodeProps<FilterNodeData>> = ({ data, selected, id }) => {
  const [config, setConfig] = useState(data.config || {
    column: data.columns[0]?.name || '',
    operator: 'equals' as const,
    value: ''
  });

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    // In a real app, this would update the store
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
        <Filter className="h-5 w-5 text-green-500" />
        <span className="font-medium text-gray-900">Filter Rows</span>
      </div>
      
      <div className="space-y-3">
        {/* Column Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Column
          </label>
          <select
            value={config.column}
            onChange={(e) => handleConfigChange('column', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {data.columns.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name} ({col.type})
              </option>
            ))}
          </select>
        </div>
        
        {/* Operator Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Condition
          </label>
          <select
            value={config.operator}
            onChange={(e) => handleConfigChange('operator', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="equals">Equals</option>
            <option value="not_equals">Not equals</option>
            <option value="greater_than">Greater than</option>
            <option value="less_than">Less than</option>
            <option value="contains">Contains</option>
          </select>
        </div>
        
        {/* Value Input */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Value
          </label>
          <input
            type={data.columns.find(c => c.name === config.column)?.type === 'number' ? 'number' : 'text'}
            value={config.value}
            onChange={(e) => {
              const value = data.columns.find(c => c.name === config.column)?.type === 'number' 
                ? Number(e.target.value) 
                : e.target.value;
              handleConfigChange('value', value);
            }}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter value..."
          />
        </div>
      </div>
    </div>
  );
};
