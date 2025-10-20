import React from 'react';
import { Database, Settings, Filter, Columns, BarChart3, GitBranch } from 'lucide-react';

interface NodePaletteProps {
  onDragStart?: (event: React.DragEvent, nodeType: string) => void;
}

const nodeTypes = [
  {
    type: 'dataNode',
    label: 'Data Source',
    icon: Database,
    description: 'Upload or select a dataset',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 hover:bg-blue-100'
  },
  {
    type: 'transformNode',
    label: 'Transform',
    icon: Settings,
    description: 'Apply data transformations (select, filter, groupby, join)',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100'
  }
];

export const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart }) => {
  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    onDragStart?.(event, nodeType);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nodes</h2>
        <div className="space-y-2">
          {nodeTypes.map((node) => {
            const Icon = node.icon;
            return (
              <div
                key={node.type}
                className={`
                  ${node.bgColor} border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing
                  transition-colors duration-200
                `}
                draggable
                onDragStart={(e) => handleDragStart(e, node.type)}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-5 w-5 ${node.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {node.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {node.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="font-medium mb-1">How to use:</p>
          <ul className="space-y-1">
            <li>• Drag nodes to the canvas</li>
            <li>• Connect nodes with edges</li>
            <li>• Click nodes to configure</li>
            <li>• Start with a Data Source</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
