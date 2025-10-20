import React from 'react';
import { Filter, Columns, BarChart3, GitMerge, ArrowUpDown, X } from 'lucide-react';
import type { TransformOperation } from '../types';

interface TransformOperationSelectorProps {
  onSelect: (operation: TransformOperation) => void;
  onCancel: () => void;
}

const operations: Array<{
  operation: TransformOperation;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    operation: 'select',
    label: 'Select Columns',
    description: 'Choose specific columns to keep in your dataset',
    icon: Columns,
    color: 'bg-blue-500'
  },
  {
    operation: 'filter',
    label: 'Filter Rows',
    description: 'Keep only rows that match certain conditions',
    icon: Filter,
    color: 'bg-purple-500'
  },
  {
    operation: 'groupby',
    label: 'Group By & Aggregate',
    description: 'Group data and calculate aggregations (sum, mean, count, etc.)',
    icon: BarChart3,
    color: 'bg-green-500'
  },
  {
    operation: 'join',
    label: 'Join Tables',
    description: 'Combine two datasets based on a common column',
    icon: GitMerge,
    color: 'bg-orange-500'
  },
  {
    operation: 'sort',
    label: 'Sort',
    description: 'Sort rows by a column in ascending or descending order',
    icon: ArrowUpDown,
    color: 'bg-pink-500'
  }
];

export const TransformOperationSelector: React.FC<TransformOperationSelectorProps> = ({ onSelect, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Select Transform Operation</h3>
            <p className="text-sm text-gray-600 mt-1">Choose what transformation to apply to your data</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {operations.map((op) => {
            const Icon = op.icon;
            return (
              <button
                key={op.operation}
                onClick={() => onSelect(op.operation)}
                className="flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
              >
                <div className={`${op.color} text-white p-2 rounded-lg mr-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{op.label}</h4>
                  <p className="text-sm text-gray-600">{op.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        
        <button
          onClick={onCancel}
          className="mt-6 w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

