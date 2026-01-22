import React from 'react';
import { Handle, Position } from 'reactflow';
import { Database, Lock } from 'lucide-react';

interface DataNodeProps {
  data: {
    label: string;
    dataKey: string;
    rowCount?: number;
    columnCount?: number;
    lockedBy?: string;
  };
  selected?: boolean;
}

export const DataNode: React.FC<DataNodeProps> = ({ data, selected }) => {
  return (
    <div
      className={`bg-white border-2 rounded-lg shadow-lg min-w-[200px] transition-all ${
        selected ? 'border-blue-500 shadow-xl' : 'border-gray-300'
      }`}
    >
      {/* Node Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-t-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="h-4 w-4" />
          <span className="font-semibold text-sm">Data Source</span>
        </div>
        {data.lockedBy && (
          <div className="flex items-center space-x-1 text-xs bg-white/20 px-2 py-0.5 rounded">
            <Lock className="h-3 w-3" />
            <span>Locked</span>
          </div>
        )}
      </div>

      {/* Node Content */}
      <div className="px-4 py-3">
        <div className="font-medium text-gray-900 mb-2 text-sm">{data.label}</div>
        {data.lockedBy && (
          <div className="text-[11px] text-gray-500">Locked by {data.lockedBy}</div>
        )}
        {data.rowCount !== undefined && (
          <div className="text-xs text-gray-600 space-y-1">
            <div>Rows: {data.rowCount.toLocaleString()}</div>
            {data.columnCount !== undefined && (
              <div>Columns: {data.columnCount}</div>
            )}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{
          right: -8,
        }}
        title="Drag to connect to a transformation"
        isConnectable={true}
      />
    </div>
  );
};

