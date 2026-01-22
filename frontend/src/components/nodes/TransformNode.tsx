import React from 'react';
import { Handle, Position } from 'reactflow';
import { 
  Filter, 
  Columns, 
  BarChart3, 
  GitMerge, 
  ArrowUpDown, 
  Type, 
  Calculator,
  Zap,
  Lock
} from 'lucide-react';

interface TransformNodeProps {
  data: {
    label: string;
    operation: string;
    config?: any;
    status?: 'pending' | 'running' | 'success' | 'error';
    outputRows?: number;
    lockedBy?: string;
  };
  selected?: boolean;
}

const getOperationIcon = (operation: string) => {
  switch (operation) {
    case 'filter':
      return Filter;
    case 'select':
      return Columns;
    case 'groupby':
      return BarChart3;
    case 'join':
      return GitMerge;
    case 'sort':
      return ArrowUpDown;
    case 'rename':
      return Type;
    case 'calculate':
      return Calculator;
    default:
      return Zap;
  }
};

const getOperationColor = (operation: string) => {
  switch (operation) {
    case 'filter':
      return 'from-purple-500 to-purple-600';
    case 'select':
      return 'from-blue-500 to-blue-600';
    case 'groupby':
      return 'from-green-500 to-green-600';
    case 'join':
      return 'from-orange-500 to-orange-600';
    case 'sort':
      return 'from-pink-500 to-pink-600';
    case 'rename':
      return 'from-indigo-500 to-indigo-600';
    case 'calculate':
      return 'from-yellow-500 to-yellow-600';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'running':
      return 'border-yellow-500 shadow-yellow-200';
    case 'success':
      return 'border-green-500 shadow-green-200';
    case 'error':
      return 'border-red-500 shadow-red-200';
    default:
      return 'border-gray-300';
  }
};

export const TransformNode: React.FC<TransformNodeProps> = ({ data, selected }) => {
  const Icon = getOperationIcon(data.operation);
  const colorClass = getOperationColor(data.operation);
  const statusClass = getStatusColor(data.status);
  const isJoinNode = data.operation === 'join';

  return (
    <div
      className={`bg-white border-2 rounded-lg shadow-lg min-w-[200px] transition-all ${
        selected ? 'border-blue-500 shadow-xl' : statusClass
      }`}
    >
      {/* Input Handles - Join nodes have TWO inputs */}
      {isJoinNode ? (
        <>
          {/* Left Input (Primary/Left table) */}
          <Handle
            type="target"
            position={Position.Left}
            id="input-left"
            className="!w-4 !h-4 !bg-orange-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
            style={{
              left: -8,
              top: '35%',
            }}
            title="Connect left table for join"
            isConnectable={true}
          />
          {/* Right Input (Secondary/Right table) */}
          <Handle
            type="target"
            position={Position.Left}
            id="input-right"
            className="!w-4 !h-4 !bg-orange-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
            style={{
              left: -8,
              top: '65%',
            }}
            title="Connect right table for join"
            isConnectable={true}
          />
        </>
      ) : (
        /* Single Input for other operations */
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="!w-4 !h-4 !bg-gray-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
          style={{
            left: -8,
          }}
          title="Connect from a data source or another transformation"
          isConnectable={true}
        />
      )}

      {/* Node Header */}
      <div className={`bg-gradient-to-r ${colorClass} text-white px-4 py-2 rounded-t-md flex items-center justify-between`}>
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4" />
          <span className="font-semibold text-sm capitalize">{data.operation}</span>
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
        <div className="text-sm text-gray-700 mb-2">{data.label}</div>
        {data.lockedBy && (
          <div className="text-[11px] text-gray-500">Locked by {data.lockedBy}</div>
        )}
        
        {/* Status indicator */}
        {data.status && data.status !== 'pending' && (
          <div className="flex items-center space-x-2 mt-2">
            {data.status === 'running' && (
              <div className="flex items-center space-x-1 text-xs text-yellow-600">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-yellow-600 border-t-transparent"></div>
                <span>Running...</span>
              </div>
            )}
            {data.status === 'success' && (
              <div className="text-xs text-green-600">
                ✓ Complete {data.outputRows !== undefined && `(${data.outputRows.toLocaleString()} rows)`}
              </div>
            )}
            {data.status === 'error' && (
              <div className="text-xs text-red-600">✗ Error</div>
            )}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-4 !h-4 !bg-gray-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{
          right: -8,
        }}
        title="Drag to connect to another transformation"
        isConnectable={true}
      />
    </div>
  );
};

