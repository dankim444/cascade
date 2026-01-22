import React, { useState, useEffect } from 'react';
import { X, Settings, Plus } from 'lucide-react';
import type { Node as FlowNode } from 'reactflow';
import type { Dataset } from '../types';
import { useWorkflowStore } from '../store/useWorkflowStore';

interface NodeConfigPanelProps {
  selectedNode: FlowNode | null;
  datasets: Dataset[];
  onUpdateNode: (nodeId: string, updates: any) => void;
  onClose: () => void;
  isLocked?: boolean;
  lockedByName?: string;
  isReadOnly?: boolean;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  selectedNode,
  datasets,
  onUpdateNode,
  onClose,
  isLocked = false,
  lockedByName,
  isReadOnly = false,
}) => {
  const [config, setConfig] = useState<any>({});
  const [label, setLabel] = useState('');
  const { flowEdges, getNodeResult } = useWorkflowStore();

  useEffect(() => {
    if (selectedNode) {
      setConfig(selectedNode.data.config || {});
      setLabel(selectedNode.data.label || '');
    }
  }, [selectedNode]);

  if (!selectedNode) return null;

  const isDataNode = selectedNode.type === 'dataNode';
  const operation = selectedNode.data.operation;

  const handleSave = () => {
    if (isLocked || isReadOnly) return;
    onUpdateNode(selectedNode.id, {
      label,
      config,
    });
    onClose();
  };

  // Get available columns from the parent node's output schema or the input dataset
  const getAvailableColumns = (): string[] => {
    // First, try to find the parent node from edges
    const parentEdge = flowEdges.find(e => e.target === selectedNode.id);
    
    if (parentEdge) {
      // Check if parent has execution results with output schema
      const parentResult = getNodeResult(parentEdge.source);
      if (parentResult?.outputSchema && parentResult.outputSchema.length > 0) {
        // Use the parent's output schema (includes aggregated columns from groupby, etc.)
        return parentResult.outputSchema.map((col: any) => col.name);
      }
    }
    
    // Fallback: Get columns from the original dataset
    const dataKey = selectedNode.data.dataKey;
    if (dataKey) {
      const dataset = datasets.find(d => d.dataKey === dataKey);
      return dataset?.columns.map(c => c.name) || [];
    }
    
    return [];
  };

  const availableColumns = getAvailableColumns();

  const isDisabled = isLocked || isReadOnly;

  return (
    <div className="absolute top-0 right-0 w-96 h-full bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            {isDataNode ? 'Data Source' : 'Transform Configuration'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {(isLocked || isReadOnly) && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-3 py-2">
            {isReadOnly && 'Pipeline is executing. Editing is temporarily disabled.'}
            {!isReadOnly && isLocked && `${lockedByName || 'Another user'} is editing this node.`}
          </div>
        )}
        {/* Node Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Node Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Enter a descriptive label..."
            disabled={isDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        {/* Data Node - Read Only */}
        {isDataNode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Dataset Information</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div><strong>Data Key:</strong> {selectedNode.data.dataKey}</div>
              {selectedNode.data.rowCount && (
                <div><strong>Rows:</strong> {selectedNode.data.rowCount.toLocaleString()}</div>
              )}
              {selectedNode.data.columnCount && (
                <div><strong>Columns:</strong> {selectedNode.data.columnCount}</div>
              )}
            </div>
          </div>
        )}

        {/* Transform Node Configuration */}
        {!isDataNode && operation && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700">
                Operation: <span className="text-blue-600 capitalize">{operation}</span>
              </div>
            </div>

            {operation === 'select' && (
              <SelectConfigForm
                config={config}
                setConfig={setConfig}
                availableColumns={availableColumns}
              />
            )}

            {operation === 'filter' && (
              <FilterConfigForm
                config={config}
                setConfig={setConfig}
                availableColumns={availableColumns}
              />
            )}

            {operation === 'groupby' && (
              <GroupByConfigForm
                config={config}
                setConfig={setConfig}
                availableColumns={availableColumns}
              />
            )}

            {operation === 'join' && (
              <JoinConfigForm
                config={config}
                setConfig={setConfig}
                availableColumns={availableColumns}
                datasets={datasets}
              />
            )}

            {operation === 'sort' && (
              <SortConfigForm
                config={config}
                setConfig={setConfig}
                availableColumns={availableColumns}
              />
            )}

            {operation === 'rename' && (
              <RenameConfigForm
                config={config}
                setConfig={setConfig}
                availableColumns={availableColumns}
              />
            )}

            {operation === 'calculate' && (
              <CalculateConfigForm
                config={config}
                setConfig={setConfig}
                availableColumns={availableColumns}
              />
            )}

            {operation === 'ml_regression' && (
              <MLRegressionConfigForm
                config={config}
                setConfig={setConfig}
                availableColumns={availableColumns}
              />
            )}

            {operation === 'ml_classification' && (
              <MLClassificationConfigForm
                config={config}
                setConfig={setConfig}
                availableColumns={availableColumns}
              />
            )}

            {operation === 'ml_clustering' && (
              <MLClusteringConfigForm
                config={config}
                setConfig={setConfig}
                availableColumns={availableColumns}
              />
            )}
          </div>
        )}

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isDisabled}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

// Configuration Form Components
const SelectConfigForm: React.FC<{
  config: any;
  setConfig: (c: any) => void;
  availableColumns: string[];
}> = ({ config, setConfig, availableColumns }) => {
  const columns = config.columns || [];

  const toggleColumn = (col: string) => {
    const newColumns = columns.includes(col)
      ? columns.filter((c: string) => c !== col)
      : [...columns, col];
    setConfig({ ...config, columns: newColumns });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Columns
      </label>
      <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
        {availableColumns.map((col) => (
          <label key={col} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={columns.includes(col)}
              onChange={() => toggleColumn(col)}
              className="rounded text-blue-600"
            />
            <span className="text-sm">{col}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Leave empty to select all columns
      </p>
    </div>
  );
};

const FilterConfigForm: React.FC<{
  config: any;
  setConfig: (c: any) => void;
  availableColumns: string[];
}> = ({ config, setConfig, availableColumns }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
        <select
          value={config.column || ''}
          onChange={(e) => setConfig({ ...config, column: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select column...</option>
          {availableColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
        <select
          value={config.operator || 'equals'}
          onChange={(e) => setConfig({ ...config, operator: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="equals">Equals (=)</option>
          <option value="not_equals">Not Equals (≠)</option>
          <option value="greater_than">Greater Than (&gt;)</option>
          <option value="less_than">Less Than (&lt;)</option>
          <option value="contains">Contains</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
        <input
          type="text"
          value={config.value || ''}
          onChange={(e) => setConfig({ ...config, value: e.target.value })}
          placeholder="Enter value..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
    </div>
  );
};

const GroupByConfigForm: React.FC<{
  config: any;
  setConfig: (c: any) => void;
  availableColumns: string[];
}> = ({ config, setConfig, availableColumns }) => {
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
      aggregations: [...aggregations, { column: '', operation: 'sum', alias: '' }],
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
      aggregations: aggregations.filter((_: any, i: number) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Group By Columns
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
          {availableColumns.map((col) => (
            <label key={col} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={groupColumns.includes(col)}
                onChange={() => toggleGroupColumn(col)}
                className="rounded text-green-600"
              />
              <span className="text-sm">{col}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Aggregations
        </label>
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
          className="w-full py-2 text-sm text-green-700 border border-green-300 rounded hover:bg-green-50 flex items-center justify-center space-x-1"
        >
          <Plus className="h-4 w-4" />
          <span>Add Aggregation</span>
        </button>
      </div>
    </div>
  );
};

const JoinConfigForm: React.FC<{
  config: any;
  setConfig: (c: any) => void;
  availableColumns: string[];
  datasets: Dataset[];
}> = ({ config, setConfig, availableColumns, datasets }) => {
  // Support both rightTable (manual selection) and rightDataKey (from graph edges)
  const rightTableKey = config.rightTable || config.rightDataKey;
  const rightDataset = datasets.find((ds) => ds.dataKey === rightTableKey);
  const rightColumns = rightDataset?.columns.map((c) => c.name) || [];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Join Type</label>
        <select
          value={config.joinType || 'inner'}
          onChange={(e) => setConfig({ ...config, joinType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="inner">Inner Join</option>
          <option value="left">Left Join</option>
          <option value="right">Right Join</option>
          <option value="outer">Outer Join</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Right Table
        </label>
        {config.rightDataKey ? (
          <div className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-sm">
            <span className="text-green-700">✓ Connected via graph edge</span>
            {rightDataset && (
              <span className="block text-xs text-green-600 mt-1">
                Table: {rightDataset.name}
              </span>
            )}
          </div>
        ) : (
          <>
            <select
              value={config.rightTable || ''}
              onChange={(e) => setConfig({ ...config, rightTable: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select dataset or connect via right input handle...</option>
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.dataKey}>
                  {ds.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              💡 Tip: Connect a second dataset to the right input handle (bottom)
            </p>
          </>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Left Column
        </label>
        <select
          value={config.leftColumn || ''}
          onChange={(e) => setConfig({ ...config, leftColumn: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select column...</option>
          {availableColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Right Column
        </label>
        <select
          value={config.rightColumn || ''}
          onChange={(e) => setConfig({ ...config, rightColumn: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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

const SortConfigForm: React.FC<{
  config: any;
  setConfig: (c: any) => void;
  availableColumns: string[];
}> = ({ config, setConfig, availableColumns }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
        <select
          value={config.column || ''}
          onChange={(e) => setConfig({ ...config, column: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select column...</option>
          {availableColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
        <select
          value={config.ascending !== false ? 'asc' : 'desc'}
          onChange={(e) => setConfig({ ...config, ascending: e.target.value === 'asc' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="asc">Ascending (A → Z, 0 → 9)</option>
          <option value="desc">Descending (Z → A, 9 → 0)</option>
        </select>
      </div>
    </div>
  );
};

const RenameConfigForm: React.FC<{
  config: any;
  setConfig: (c: any) => void;
  availableColumns: string[];
}> = ({ config, setConfig, availableColumns }) => {
  const renameMap = config || {};

  const addRename = () => {
    const firstUnused = availableColumns.find((col) => !renameMap[col]);
    if (firstUnused) {
      setConfig({ ...renameMap, [firstUnused]: '' });
    }
  };

  const updateRename = (oldName: string, newName: string) => {
    const newMap = { ...renameMap };
    if (newName === '') {
      delete newMap[oldName];
    } else {
      newMap[oldName] = newName;
    }
    setConfig(newMap);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Column Renames</label>
      {Object.entries(renameMap).map(([oldName, newName]) => (
        <div key={oldName} className="flex items-center space-x-2">
          <input
            type="text"
            value={oldName}
            disabled
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
          />
          <span className="text-gray-500">→</span>
          <input
            type="text"
            value={newName as string}
            onChange={(e) => updateRename(oldName, e.target.value)}
            placeholder="New name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      ))}
      <button
        onClick={addRename}
        className="w-full py-2 text-sm text-blue-700 border border-blue-300 rounded hover:bg-blue-50 flex items-center justify-center space-x-1"
      >
        <Plus className="h-4 w-4" />
        <span>Add Rename</span>
      </button>
    </div>
  );
};

const CalculateConfigForm: React.FC<{
  config: any;
  setConfig: (c: any) => void;
  availableColumns: string[];
}> = ({ config, setConfig, availableColumns }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          New Column Name
        </label>
        <input
          type="text"
          value={config.newColumn || ''}
          onChange={(e) => setConfig({ ...config, newColumn: e.target.value })}
          placeholder="calculated_column"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expression
        </label>
        <textarea
          value={config.expression || ''}
          onChange={(e) => setConfig({ ...config, expression: e.target.value })}
          placeholder="e.g., column_a + column_b * 2"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Available columns: {availableColumns.join(', ')}
        </p>
      </div>
    </div>
  );
};

// ML Configuration Forms
const MLRegressionConfigForm: React.FC<{
  config: any;
  setConfig: (c: any) => void;
  availableColumns: string[];
}> = ({ config, setConfig, availableColumns }) => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(config.featureColumns || []);

  const toggleFeature = (col: string) => {
    const newFeatures = selectedFeatures.includes(col)
      ? selectedFeatures.filter(c => c !== col)
      : [...selectedFeatures, col];
    setSelectedFeatures(newFeatures);
    setConfig({ ...config, featureColumns: newFeatures });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Model Type
        </label>
        <select
          value={config.modelType || 'linear'}
          onChange={(e) => setConfig({ ...config, modelType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="linear">Linear Regression</option>
          <option value="decision_tree">Decision Tree</option>
          <option value="random_forest">Random Forest</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Feature Columns (Select multiple)
        </label>
        <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
          {availableColumns.map((col) => (
            <label key={col} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFeatures.includes(col)}
                onChange={() => toggleFeature(col)}
                className="rounded text-blue-600"
              />
              <span className="text-sm">{col}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Selected: {selectedFeatures.length} features
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Column (What to predict)
        </label>
        <select
          value={config.targetColumn || ''}
          onChange={(e) => setConfig({ ...config, targetColumn: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select target column</option>
          {availableColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Test Size (0.1 - 0.5)
        </label>
        <input
          type="number"
          min="0.1"
          max="0.5"
          step="0.05"
          value={config.testSize || 0.2}
          onChange={(e) => setConfig({ ...config, testSize: parseFloat(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          Percentage of data used for testing
        </p>
      </div>
    </div>
  );
};

const MLClassificationConfigForm: React.FC<{
  config: any;
  setConfig: (c: any) => void;
  availableColumns: string[];
}> = ({ config, setConfig, availableColumns }) => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(config.featureColumns || []);

  const toggleFeature = (col: string) => {
    const newFeatures = selectedFeatures.includes(col)
      ? selectedFeatures.filter(c => c !== col)
      : [...selectedFeatures, col];
    setSelectedFeatures(newFeatures);
    setConfig({ ...config, featureColumns: newFeatures });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Model Type
        </label>
        <select
          value={config.modelType || 'logistic'}
          onChange={(e) => setConfig({ ...config, modelType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="logistic">Logistic Regression</option>
          <option value="decision_tree">Decision Tree</option>
          <option value="random_forest">Random Forest</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Feature Columns (Select multiple)
        </label>
        <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
          {availableColumns.map((col) => (
            <label key={col} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFeatures.includes(col)}
                onChange={() => toggleFeature(col)}
                className="rounded text-blue-600"
              />
              <span className="text-sm">{col}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Selected: {selectedFeatures.length} features
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Column (Class to predict)
        </label>
        <select
          value={config.targetColumn || ''}
          onChange={(e) => setConfig({ ...config, targetColumn: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select target column</option>
          {availableColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Test Size (0.1 - 0.5)
        </label>
        <input
          type="number"
          min="0.1"
          max="0.5"
          step="0.05"
          value={config.testSize || 0.2}
          onChange={(e) => setConfig({ ...config, testSize: parseFloat(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          Percentage of data used for testing
        </p>
      </div>
    </div>
  );
};

const MLClusteringConfigForm: React.FC<{
  config: any;
  setConfig: (c: any) => void;
  availableColumns: string[];
}> = ({ config, setConfig, availableColumns }) => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(config.featureColumns || []);

  const toggleFeature = (col: string) => {
    const newFeatures = selectedFeatures.includes(col)
      ? selectedFeatures.filter(c => c !== col)
      : [...selectedFeatures, col];
    setSelectedFeatures(newFeatures);
    setConfig({ ...config, featureColumns: newFeatures });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Feature Columns (Select multiple)
        </label>
        <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
          {availableColumns.map((col) => (
            <label key={col} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFeatures.includes(col)}
                onChange={() => toggleFeature(col)}
                className="rounded text-blue-600"
              />
              <span className="text-sm">{col}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Selected: {selectedFeatures.length} features
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Number of Clusters
        </label>
        <input
          type="number"
          min="2"
          max="10"
          value={config.nClusters || 3}
          onChange={(e) => setConfig({ ...config, nClusters: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          Number of groups to create (2-10)
        </p>
      </div>
    </div>
  );
};

