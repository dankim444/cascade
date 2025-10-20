import React, { useState } from 'react';
import { Filter, Columns, BarChart3, GitMerge, ArrowUpDown, X, Play } from 'lucide-react';
import type { Dataset, TransformOperation, Transformation } from '../types';
import { useWorkflowStore } from '../store/useWorkflowStore';

interface TransformPanelProps {
  datasets: Dataset[];
  onExecute: (datasetId: string, operation: TransformOperation, config: any) => Promise<void>;
}

export const TransformPanel: React.FC<TransformPanelProps> = ({ datasets, onExecute }) => {
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedOperation, setSelectedOperation] = useState<TransformOperation | ''>('');
  const [config, setConfig] = useState<any>({});
  const [isExecuting, setIsExecuting] = useState(false);

  const operations = [
    { value: 'select' as const, label: 'Select Columns', icon: Columns, color: 'bg-blue-500' },
    { value: 'filter' as const, label: 'Filter Rows', icon: Filter, color: 'bg-purple-500' },
    { value: 'groupby' as const, label: 'Group By', icon: BarChart3, color: 'bg-green-500' },
    { value: 'join' as const, label: 'Join Tables', icon: GitMerge, color: 'bg-orange-500' },
    { value: 'sort' as const, label: 'Sort', icon: ArrowUpDown, color: 'bg-pink-500' },
  ];

  const selectedDatasetObj = datasets.find(d => d.id === selectedDataset);
  const availableColumns = selectedDatasetObj?.columns.map(c => c.name) || [];

  const handleExecute = async () => {
    if (!selectedDataset || !selectedOperation) return;
    
    setIsExecuting(true);
    try {
      await onExecute(selectedDataset, selectedOperation, config);
    } finally {
      setIsExecuting(false);
    }
  };

  const resetConfig = () => {
    switch (selectedOperation) {
      case 'select':
        setConfig({ columns: [] });
        break;
      case 'filter':
        setConfig({ column: '', operator: 'equals', value: '' });
        break;
      case 'groupby':
        setConfig({ groupColumns: [], aggregations: [] });
        break;
      case 'join':
        setConfig({ joinType: 'inner', leftColumn: '', rightColumn: '', rightTable: '' });
        break;
      case 'sort':
        setConfig({ column: '', ascending: true });
        break;
      default:
        setConfig({});
    }
  };

  return (
    <div className="bg-white border-r border-gray-200 w-96 h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-900">Transform Data</h2>
        <p className="text-xs text-gray-600 mt-1">Select dataset, choose operation, and run</p>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Step 1: Select Dataset */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            1. Select Dataset
          </label>
          <select
            value={selectedDataset}
            onChange={(e) => {
              setSelectedDataset(e.target.value);
              setConfig({});
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a dataset...</option>
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name} ({ds.rowCount} rows, {ds.columns.length} cols)
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Select Operation */}
        {selectedDataset && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              2. Choose Operation
            </label>
            <div className="space-y-2">
              {operations.map((op) => {
                const Icon = op.icon;
                return (
                  <button
                    key={op.value}
                    onClick={() => {
                      setSelectedOperation(op.value);
                      resetConfig();
                    }}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedOperation === op.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`${op.color} text-white p-2 rounded`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-gray-900">{op.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Configure Operation */}
        {selectedDataset && selectedOperation && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              3. Configure {operations.find(o => o.value === selectedOperation)?.label}
            </label>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {selectedOperation === 'select' && (
                <SelectConfig config={config} setConfig={setConfig} availableColumns={availableColumns} />
              )}
              {selectedOperation === 'filter' && (
                <FilterConfig config={config} setConfig={setConfig} availableColumns={availableColumns} />
              )}
              {selectedOperation === 'groupby' && (
                <GroupByConfig config={config} setConfig={setConfig} availableColumns={availableColumns} />
              )}
              {selectedOperation === 'join' && (
                <JoinConfig config={config} setConfig={setConfig} availableColumns={availableColumns} datasets={datasets} />
              )}
              {selectedOperation === 'sort' && (
                <SortConfig config={config} setConfig={setConfig} availableColumns={availableColumns} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Execute Button */}
      {selectedDataset && selectedOperation && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              isExecuting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {isExecuting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                <span>Run Transformation</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// Config Components
const SelectConfig: React.FC<{ config: any; setConfig: (c: any) => void; availableColumns: string[] }> = ({ 
  config, setConfig, availableColumns 
}) => {
  const columns = config.columns || [];
  
  const toggleColumn = (col: string) => {
    const newColumns = columns.includes(col)
      ? columns.filter((c: string) => c !== col)
      : [...columns, col];
    setConfig({ ...config, columns: newColumns });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 mb-2">Select columns to keep (leave empty to select all):</p>
      {availableColumns.map((col) => (
        <label key={col} className="flex items-center space-x-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={columns.includes(col)}
            onChange={() => toggleColumn(col)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>{col}</span>
        </label>
      ))}
    </div>
  );
};

const FilterConfig: React.FC<{ config: any; setConfig: (c: any) => void; availableColumns: string[] }> = ({ 
  config, setConfig, availableColumns 
}) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Column:</label>
        <select
          value={config.column || ''}
          onChange={(e) => setConfig({ ...config, column: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Select column...</option>
          {availableColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operator:</label>
        <select
          value={config.operator || 'equals'}
          onChange={(e) => setConfig({ ...config, operator: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="equals">Equals (=)</option>
          <option value="not_equals">Not Equals (≠)</option>
          <option value="greater_than">Greater Than (&gt;)</option>
          <option value="less_than">Less Than (&lt;)</option>
          <option value="contains">Contains</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Value:</label>
        <input
          type="text"
          value={config.value || ''}
          onChange={(e) => setConfig({ ...config, value: e.target.value })}
          placeholder="Enter value..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>
    </div>
  );
};

const GroupByConfig: React.FC<{ config: any; setConfig: (c: any) => void; availableColumns: string[] }> = ({ 
  config, setConfig, availableColumns 
}) => {
  const groupColumns = config.groupColumns || [];
  const aggregations = config.aggregations || [];

  const toggleGroupColumn = (col: string) => {
    const newCols = groupColumns.includes(col)
      ? groupColumns.filter((c: string) => c !== col)
      : [...groupColumns, col];
    setConfig({ ...config, groupColumns: newCols });
  };

  const addAggregation = () => {
    setConfig({
      ...config,
      aggregations: [...aggregations, { column: '', operation: 'sum', alias: '' }]
    });
  };

  const updateAggregation = (index: number, field: string, value: any) => {
    const newAggs = [...aggregations];
    newAggs[index] = { ...newAggs[index], [field]: value };
    setConfig({ ...config, aggregations: newAggs });
  };

  const removeAggregation = (index: number) => {
    setConfig({
      ...config,
      aggregations: aggregations.filter((_: any, i: number) => i !== index)
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Group By:</label>
        {availableColumns.map((col) => (
          <label key={col} className="flex items-center space-x-2 text-sm cursor-pointer mb-1">
            <input
              type="checkbox"
              checked={groupColumns.includes(col)}
              onChange={() => toggleGroupColumn(col)}
              className="rounded text-green-600 focus:ring-green-500"
            />
            <span>{col}</span>
          </label>
        ))}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Aggregations:</label>
        {aggregations.map((agg: any, idx: number) => (
          <div key={idx} className="flex items-center space-x-2 mb-2">
            <select
              value={agg.column}
              onChange={(e) => updateAggregation(idx, 'column', e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="">Column...</option>
              {availableColumns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            <select
              value={agg.operation}
              onChange={(e) => updateAggregation(idx, 'operation', e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="sum">Sum</option>
              <option value="mean">Mean</option>
              <option value="count">Count</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
            <input
              type="text"
              value={agg.alias}
              onChange={(e) => updateAggregation(idx, 'alias', e.target.value)}
              placeholder="Alias"
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
            />
            <button
              onClick={() => removeAggregation(idx)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          onClick={addAggregation}
          className="w-full py-2 text-sm text-green-700 border border-green-300 rounded hover:bg-green-50"
        >
          + Add Aggregation
        </button>
      </div>
    </div>
  );
};

const JoinConfig: React.FC<{ config: any; setConfig: (c: any) => void; availableColumns: string[]; datasets: Dataset[] }> = ({ 
  config, setConfig, availableColumns, datasets 
}) => {
  const rightDataset = datasets.find(ds => ds.id === config.rightTable);
  const rightColumns = rightDataset?.columns.map(c => c.name) || [];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Join Type:</label>
        <select
          value={config.joinType || 'inner'}
          onChange={(e) => setConfig({ ...config, joinType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="inner">Inner Join</option>
          <option value="left">Left Join</option>
          <option value="right">Right Join</option>
          <option value="outer">Outer Join</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Right Table:</label>
        <select
          value={config.rightTable || ''}
          onChange={(e) => setConfig({ ...config, rightTable: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Select dataset...</option>
          {datasets.map((ds) => (
            <option key={ds.id} value={ds.dataKey}>{ds.name}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Left Column:</label>
        <select
          value={config.leftColumn || ''}
          onChange={(e) => setConfig({ ...config, leftColumn: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Select column...</option>
          {availableColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Right Column:</label>
        <select
          value={config.rightColumn || ''}
          onChange={(e) => setConfig({ ...config, rightColumn: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          disabled={!config.rightTable}
        >
          <option value="">Select column...</option>
          {rightColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

const SortConfig: React.FC<{ config: any; setConfig: (c: any) => void; availableColumns: string[] }> = ({ 
  config, setConfig, availableColumns 
}) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Column:</label>
        <select
          value={config.column || ''}
          onChange={(e) => setConfig({ ...config, column: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Select column...</option>
          {availableColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Order:</label>
        <select
          value={config.ascending ? 'asc' : 'desc'}
          onChange={(e) => setConfig({ ...config, ascending: e.target.value === 'asc' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="asc">Ascending (A → Z, 0 → 9)</option>
          <option value="desc">Descending (Z → A, 9 → 0)</option>
        </select>
      </div>
    </div>
  );
};

