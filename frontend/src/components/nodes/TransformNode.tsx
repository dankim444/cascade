import React, { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Settings, Filter, Columns, BarChart3, GitMerge, X, ChevronDown } from 'lucide-react';
import type { Node, Transformation, Dataset } from '../../types';
import { useWorkflowStore } from '../../store/useWorkflowStore';

interface TransformNodeData {
  node: Node;
  onUpdate: (nodeId: string, transform: Transformation) => void;
  availableColumns?: string[];
}

export const TransformNode: React.FC<NodeProps<TransformNodeData>> = ({ data, selected, id }) => {
  const { node, onUpdate } = data;
  const [transform, setTransform] = useState<Transformation>(node.transform);
  const [isExpanded, setIsExpanded] = useState(true);
  const { datasets, dataConnections } = useWorkflowStore();

  // Get available columns from the dataset
  const availableColumns = React.useMemo(() => {
    const dataConnection = dataConnections.find(dc => dc.dataKey === node.data);
    if (dataConnection) {
      return dataConnection.schema.columns.map(col => col.name);
    }
    
    // Fallback to dataset columns
    const dataset = datasets.find(ds => ds.dataKey === node.data);
    if (dataset) {
      return dataset.columns.map(col => col.name);
    }
    
    return [];
  }, [node.data, dataConnections, datasets]);

  const handleTransformChange = (newTransform: Transformation) => {
    setTransform(newTransform);
    onUpdate(node.id, newTransform);
  };

  const getOperationIcon = () => {
    switch (transform.operation) {
      case 'filter': return <Filter className="h-4 w-4" />;
      case 'select': return <Columns className="h-4 w-4" />;
      case 'groupby': return <BarChart3 className="h-4 w-4" />;
      case 'join': return <GitMerge className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getOperationColor = () => {
    switch (transform.operation) {
      case 'filter': return 'bg-purple-500';
      case 'select': return 'bg-blue-500';
      case 'groupby': return 'bg-green-500';
      case 'join': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`
      bg-white border-2 rounded-lg shadow-lg min-w-[280px] max-w-[400px]
      ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
      
      {/* Header */}
      <div 
        className={`${getOperationColor()} text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {getOperationIcon()}
          <span className="font-semibold text-sm uppercase tracking-wide">
            {transform.operation}
          </span>
        </div>
        <ChevronDown 
          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </div>
      
      {/* Content */}
      {isExpanded && (
        <div className="p-4 nodrag">
          {/* Dataset indicator */}
          <div className="mb-3 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
            Source: <span className="font-medium">{node.data}</span>
          </div>
          
          {/* Transform Configuration */}
          <TransformConfig 
            transform={transform} 
            onChange={handleTransformChange}
            availableColumns={availableColumns}
            datasets={datasets}
          />
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </div>
  );
};

// Main configuration component that routes to specific transform configs
interface TransformConfigProps {
  transform: Transformation;
  onChange: (transform: Transformation) => void;
  availableColumns: string[];
  datasets: Dataset[];
}

const TransformConfig: React.FC<TransformConfigProps> = ({ transform, onChange, availableColumns, datasets }) => {
  switch (transform.operation) {
    case 'select':
      return <SelectConfig transform={transform} onChange={onChange} availableColumns={availableColumns} />;
    case 'filter':
      return <FilterConfig transform={transform} onChange={onChange} availableColumns={availableColumns} />;
    case 'groupby':
      return <GroupByConfig transform={transform} onChange={onChange} availableColumns={availableColumns} />;
    case 'join':
      return <JoinConfig transform={transform} onChange={onChange} availableColumns={availableColumns} datasets={datasets} />;
    case 'sort':
      return <SortConfig transform={transform} onChange={onChange} availableColumns={availableColumns} />;
    default:
      return <div className="text-sm text-gray-500">Configure {transform.operation}</div>;
  }
};

// Select Configuration Component
const SelectConfig: React.FC<{
  transform: Transformation;
  onChange: (transform: Transformation) => void;
  availableColumns: string[];
}> = ({ transform, onChange, availableColumns }) => {
  const [columns, setColumns] = useState<string[]>(
    transform.params.length > 0 ? JSON.parse(transform.params[0]) : []
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const handleToggleColumn = (column: string) => {
    const newColumns = columns.includes(column)
      ? columns.filter(c => c !== column)
      : [...columns, column];
    
    setColumns(newColumns);
    onChange({
      ...transform,
      params: [JSON.stringify(newColumns)]
    });
  };

  return (
    <div className="space-y-2" onMouseDown={(e) => e.stopPropagation()}>
      <label className="text-sm font-medium text-gray-700">Select Columns:</label>
      
      {/* Selected columns */}
      <div className="flex flex-wrap gap-2 mb-2">
        {columns.map((col) => (
          <div key={col} className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
            <span>{col}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleColumn(col);
              }}
              className="hover:bg-blue-200 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {columns.length === 0 && (
          <span className="text-xs text-gray-400 italic">No columns selected (will select all)</span>
        )}
      </div>
      
      {/* Available columns dropdown */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          className="w-full text-left px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
        >
          Add column...
        </button>
        
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {availableColumns.length > 0 ? (
              availableColumns.map((col) => (
                <div
                  key={col}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleColumn(col);
                    setShowDropdown(false);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                    columns.includes(col) ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{col}</span>
                    {columns.includes(col) && <span className="text-xs">✓</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-400">No columns available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Filter Configuration Component
const FilterConfig: React.FC<{
  transform: Transformation;
  onChange: (transform: Transformation) => void;
  availableColumns: string[];
}> = ({ transform, onChange, availableColumns }) => {
  const [config, setConfig] = useState(() => {
    if (transform.params.length > 0) {
      return JSON.parse(transform.params[0]);
    }
    return { column: '', operator: 'equals', value: '' };
  });

  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
    onChange({
      ...transform,
      params: [JSON.stringify(newConfig)]
    });
  };

  return (
    <div className="space-y-3" onMouseDown={(e) => e.stopPropagation()}>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Column:</label>
        <select
          value={config.column}
          onChange={(e) => handleConfigChange({ ...config, column: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select column...</option>
          {availableColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Operator:</label>
        <select
          value={config.operator}
          onChange={(e) => handleConfigChange({ ...config, operator: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="equals">Equals (=)</option>
          <option value="not_equals">Not Equals (≠)</option>
          <option value="greater_than">Greater Than (&gt;)</option>
          <option value="less_than">Less Than (&lt;)</option>
          <option value="contains">Contains</option>
        </select>
      </div>
      
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Value:</label>
        <input
          type="text"
          value={config.value}
          onChange={(e) => handleConfigChange({ ...config, value: e.target.value })}
          placeholder="Enter filter value"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

// GroupBy Configuration Component
const GroupByConfig: React.FC<{
  transform: Transformation;
  onChange: (transform: Transformation) => void;
  availableColumns: string[];
}> = ({ transform, onChange, availableColumns }) => {
  const [config, setConfig] = useState(() => {
    if (transform.params.length > 0) {
      return JSON.parse(transform.params[0]);
    }
    return { groupColumns: [], aggregations: [] };
  });

  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
    onChange({
      ...transform,
      params: [JSON.stringify(newConfig)]
    });
  };

  const addAggregation = () => {
    const newAggregations = [...config.aggregations, {
      column: '',
      operation: 'sum',
      alias: ''
    }];
    handleConfigChange({ ...config, aggregations: newAggregations });
  };

  const updateAggregation = (index: number, field: string, value: any) => {
    const newAggregations = [...config.aggregations];
    newAggregations[index] = { ...newAggregations[index], [field]: value };
    handleConfigChange({ ...config, aggregations: newAggregations });
  };

  const removeAggregation = (index: number) => {
    const newAggregations = config.aggregations.filter((_: any, i: number) => i !== index);
    handleConfigChange({ ...config, aggregations: newAggregations });
  };

  const toggleGroupColumn = (column: string) => {
    const newGroupColumns = config.groupColumns.includes(column)
      ? config.groupColumns.filter((c: string) => c !== column)
      : [...config.groupColumns, column];
    handleConfigChange({ ...config, groupColumns: newGroupColumns });
  };

  return (
    <div className="space-y-4" onMouseDown={(e) => e.stopPropagation()}>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Group By Columns:</label>
        <div className="space-y-1">
          {availableColumns.map((col) => (
            <label key={col} className="flex items-center space-x-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={config.groupColumns.includes(col)}
                onChange={() => toggleGroupColumn(col)}
                className="rounded text-green-600 focus:ring-green-500"
              />
              <span>{col}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Aggregations:</label>
        {config.aggregations.map((agg: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 mb-2 p-2 bg-gray-50 rounded">
            <select
              value={agg.column}
              onChange={(e) => updateAggregation(index, 'column', e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="">Column...</option>
              {availableColumns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            <select
              value={agg.operation}
              onChange={(e) => updateAggregation(index, 'operation', e.target.value)}
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
              onChange={(e) => updateAggregation(index, 'alias', e.target.value)}
              placeholder="Alias"
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
            />
            <button
              onClick={() => removeAggregation(index)}
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

// Join Configuration Component
const JoinConfig: React.FC<{
  transform: Transformation;
  onChange: (transform: Transformation) => void;
  availableColumns: string[];
  datasets: Dataset[];
}> = ({ transform, onChange, availableColumns, datasets }) => {
  const [config, setConfig] = useState(() => {
    if (transform.params.length > 0) {
      return JSON.parse(transform.params[0]);
    }
    return { joinType: 'inner', leftColumn: '', rightColumn: '', rightTable: '' };
  });

  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
    onChange({
      ...transform,
      params: [JSON.stringify(newConfig)]
    });
  };

  const rightDataset = datasets.find(ds => ds.dataKey === config.rightTable);
  const rightColumns = rightDataset ? rightDataset.columns.map(c => c.name) : [];

  return (
    <div className="space-y-3" onMouseDown={(e) => e.stopPropagation()}>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Join Type:</label>
        <select
          value={config.joinType}
          onChange={(e) => handleConfigChange({ ...config, joinType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="inner">Inner Join</option>
          <option value="left">Left Join</option>
          <option value="right">Right Join</option>
          <option value="outer">Outer Join</option>
        </select>
      </div>
      
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Right Table:</label>
        <select
          value={config.rightTable}
          onChange={(e) => handleConfigChange({ ...config, rightTable: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Select dataset...</option>
          {datasets.map((ds) => (
            <option key={ds.dataKey} value={ds.dataKey}>{ds.name}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Left Column:</label>
        <select
          value={config.leftColumn}
          onChange={(e) => handleConfigChange({ ...config, leftColumn: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Select column...</option>
          {availableColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Right Column:</label>
        <select
          value={config.rightColumn}
          onChange={(e) => handleConfigChange({ ...config, rightColumn: e.target.value })}
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

// Sort Configuration Component
const SortConfig: React.FC<{
  transform: Transformation;
  onChange: (transform: Transformation) => void;
  availableColumns: string[];
}> = ({ transform, onChange, availableColumns }) => {
  const [config, setConfig] = useState(() => {
    if (transform.params.length > 0) {
      return JSON.parse(transform.params[0]);
    }
    return { column: '', ascending: true };
  });

  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
    onChange({
      ...transform,
      params: [JSON.stringify(newConfig)]
    });
  };

  return (
    <div className="space-y-3" onMouseDown={(e) => e.stopPropagation()}>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Sort By Column:</label>
        <select
          value={config.column}
          onChange={(e) => handleConfigChange({ ...config, column: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Select column...</option>
          {availableColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Order:</label>
        <select
          value={config.ascending ? 'asc' : 'desc'}
          onChange={(e) => handleConfigChange({ ...config, ascending: e.target.value === 'asc' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="asc">Ascending (A → Z, 0 → 9)</option>
          <option value="desc">Descending (Z → A, 9 → 0)</option>
        </select>
      </div>
    </div>
  );
};
