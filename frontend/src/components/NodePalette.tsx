import React from 'react';
import { Database, Settings, Filter, Columns, BarChart3, GitMerge, ArrowUpDown, Calculator } from 'lucide-react';
import { useWorkflowStore } from '../store/useWorkflowStore';

interface NodePaletteProps {
  onDragStart?: (event: React.DragEvent, nodeType: string) => void;
}

const transformOperations = [
  {
    operation: 'select',
    label: 'Select Columns',
    icon: Columns,
    description: 'Choose which columns to keep',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-200'
  },
  {
    operation: 'filter',
    label: 'Filter Rows',
    icon: Filter,
    description: 'Filter data based on conditions',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    borderColor: 'border-purple-200'
  },
  {
    operation: 'groupby',
    label: 'Group By',
    icon: BarChart3,
    description: 'Group and aggregate data',
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    borderColor: 'border-green-200'
  },
  {
    operation: 'join',
    label: 'Join Tables',
    icon: GitMerge,
    description: 'Combine multiple datasets',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    borderColor: 'border-orange-200'
  },
  {
    operation: 'sort',
    label: 'Sort',
    icon: ArrowUpDown,
    description: 'Sort data by column',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 hover:bg-pink-100',
    borderColor: 'border-pink-200'
  }
];

export const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart }) => {
  const { datasets } = useWorkflowStore();

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    onDragStart?.(event, nodeType);
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Transform Operations</h2>
        <p className="text-xs text-gray-500 mb-4">Drag to canvas to add</p>
        
        {/* Loaded Datasets Info */}
        {datasets.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {datasets.length} Dataset{datasets.length !== 1 ? 's' : ''} Loaded
              </span>
            </div>
            <div className="space-y-1">
              {datasets.map((ds) => (
                <div key={ds.id} className="text-xs text-blue-700 truncate" title={ds.name}>
                  • {ds.name} ({ds.rowCount} rows)
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Transform Operations */}
        <div className="space-y-2">
          {transformOperations.map((op) => {
            const Icon = op.icon;
            const isDisabled = datasets.length === 0;
            
            return (
              <div
                key={op.operation}
                className={`
                  ${op.bgColor} ${op.borderColor} border-2 rounded-lg p-3 transition-all duration-200
                  ${isDisabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-grab active:cursor-grabbing hover:shadow-md'
                  }
                `}
                draggable={!isDisabled}
                onDragStart={(e) => !isDisabled && handleDragStart(e, 'transformNode')}
                title={isDisabled ? 'Upload a dataset first' : ''}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 ${op.color} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {op.label}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {op.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <p className="font-semibold mb-2 text-gray-900">Quick Guide:</p>
          <ul className="space-y-1.5">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              <span>Upload a dataset from the header</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              <span>Drag transform operations to canvas</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              <span>Configure each node by clicking it</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">4.</span>
              <span>Connect nodes to create pipeline</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">5.</span>
              <span>Click "Run Pipeline" to execute</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
