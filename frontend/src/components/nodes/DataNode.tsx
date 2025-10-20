import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Database, Eye } from 'lucide-react';
// Define types locally to avoid import issues
interface Column {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  nullable: boolean;
}

interface Dataset {
  id: string;
  name: string;
  columns: Column[];
  rowCount: number;
  preview: Record<string, any>[];
}

interface DataNodeData {
  dataset: Dataset;
}

export const DataNode: React.FC<NodeProps<DataNodeData>> = ({ data, selected }) => {
  return (
    <div className={`
      bg-white border-2 rounded-lg shadow-lg p-4 min-w-[200px]
      ${selected ? 'border-blue-500' : 'border-gray-200'}
    `}>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
      
      <div className="flex items-center space-x-2 mb-2">
        <Database className="h-5 w-5 text-blue-500" />
        <span className="font-medium text-gray-900">Data Source</span>
      </div>
      
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-700">{data.dataset.name}</p>
        <p className="text-xs text-gray-500">
          {data.dataset.rowCount.toLocaleString()} rows • {data.dataset.columns.length} columns
        </p>
      </div>
      
      <div className="mt-3 flex justify-between items-center">
        <button className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800">
          <Eye className="h-3 w-3" />
          <span>Preview</span>
        </button>
      </div>
    </div>
  );
};
