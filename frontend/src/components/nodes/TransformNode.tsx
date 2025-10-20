import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { Node, Transformation } from '../../types';

interface TransformNodeData {
  node: Node;
  onUpdate: (nodeId: string, transform: Transformation) => void;
}

export const TransformNode: React.FC<NodeProps<TransformNodeData>> = ({ data, selected, id }) => {
  const { node, onUpdate } = data;
  const [transform, setTransform] = useState<Transformation>(node.transform);

  const handleTransformChange = (newTransform: Transformation) => {
    setTransform(newTransform);
    onUpdate(node.id, newTransform);
  };

  const renderTransformConfig = () => {
    switch (transform.operation) {
      case 'select':
        return <SelectConfig transform={transform} onChange={handleTransformChange} />;
      case 'filter':
        return <FilterConfig transform={transform} onChange={handleTransformChange} />;
      case 'groupby':
        return <GroupByConfig transform={transform} onChange={handleTransformChange} />;
      case 'join':
        return <JoinConfig transform={transform} onChange={handleTransformChange} />;
      default:
        return <div>Unknown operation: {transform.operation}</div>;
    }
  };

  return (
    <div className={`transform-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      
      <div className="node-header">
        <h3>{transform.operation.toUpperCase()}</h3>
        <div className="data-key">Data: {node.data}</div>
      </div>
      
      <div className="node-content">
        {renderTransformConfig()}
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Select Configuration Component
const SelectConfig: React.FC<{
  transform: Transformation;
  onChange: (transform: Transformation) => void;
}> = ({ transform, onChange }) => {
  const [columns, setColumns] = useState<string[]>(
    transform.params.length > 0 ? JSON.parse(transform.params[0]) : []
  );

  const handleColumnsChange = (newColumns: string[]) => {
    setColumns(newColumns);
    onChange({
      ...transform,
      params: [JSON.stringify(newColumns)]
    });
  };

  return (
    <div className="select-config">
      <label>Select Columns:</label>
      <div className="columns-list">
        {columns.map((col, index) => (
          <div key={index} className="column-item">
            <input
              type="text"
              value={col}
              onChange={(e) => {
                const newColumns = [...columns];
                newColumns[index] = e.target.value;
                handleColumnsChange(newColumns);
              }}
              placeholder="Column name"
            />
            <button
              onClick={() => {
                const newColumns = columns.filter((_, i) => i !== index);
                handleColumnsChange(newColumns);
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          onClick={() => handleColumnsChange([...columns, ''])}
        >
          Add Column
        </button>
      </div>
    </div>
  );
};

// Filter Configuration Component
const FilterConfig: React.FC<{
  transform: Transformation;
  onChange: (transform: Transformation) => void;
}> = ({ transform, onChange }) => {
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
    <div className="filter-config">
      <div className="config-row">
        <label>Column:</label>
        <input
          type="text"
          value={config.column}
          onChange={(e) => handleConfigChange({ ...config, column: e.target.value })}
          placeholder="Column name"
        />
      </div>
      
      <div className="config-row">
        <label>Operator:</label>
        <select
          value={config.operator}
          onChange={(e) => handleConfigChange({ ...config, operator: e.target.value })}
        >
          <option value="equals">Equals</option>
          <option value="not_equals">Not Equals</option>
          <option value="greater_than">Greater Than</option>
          <option value="less_than">Less Than</option>
          <option value="contains">Contains</option>
        </select>
      </div>
      
      <div className="config-row">
        <label>Value:</label>
        <input
          type="text"
          value={config.value}
          onChange={(e) => handleConfigChange({ ...config, value: e.target.value })}
          placeholder="Filter value"
        />
      </div>
    </div>
  );
};

// GroupBy Configuration Component
const GroupByConfig: React.FC<{
  transform: Transformation;
  onChange: (transform: Transformation) => void;
}> = ({ transform, onChange }) => {
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
    const newAggregations = config.aggregations.filter((_, i) => i !== index);
    handleConfigChange({ ...config, aggregations: newAggregations });
  };

  return (
    <div className="groupby-config">
      <div className="config-section">
        <label>Group Columns:</label>
        <div className="columns-list">
          {config.groupColumns.map((col: string, index: number) => (
            <div key={index} className="column-item">
              <input
                type="text"
                value={col}
                onChange={(e) => {
                  const newColumns = [...config.groupColumns];
                  newColumns[index] = e.target.value;
                  handleConfigChange({ ...config, groupColumns: newColumns });
                }}
                placeholder="Column name"
              />
              <button onClick={() => {
                const newColumns = config.groupColumns.filter((_, i) => i !== index);
                handleConfigChange({ ...config, groupColumns: newColumns });
              }}>
                Remove
              </button>
            </div>
          ))}
          <button onClick={() => {
            handleConfigChange({ ...config, groupColumns: [...config.groupColumns, ''] });
          }}>
            Add Column
          </button>
        </div>
      </div>
      
      <div className="config-section">
        <label>Aggregations:</label>
        {config.aggregations.map((agg: any, index: number) => (
          <div key={index} className="aggregation-item">
            <input
              type="text"
              value={agg.column}
              onChange={(e) => updateAggregation(index, 'column', e.target.value)}
              placeholder="Column"
            />
            <select
              value={agg.operation}
              onChange={(e) => updateAggregation(index, 'operation', e.target.value)}
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
            />
            <button onClick={() => removeAggregation(index)}>Remove</button>
          </div>
        ))}
        <button onClick={addAggregation}>Add Aggregation</button>
      </div>
    </div>
  );
};

// Join Configuration Component
const JoinConfig: React.FC<{
  transform: Transformation;
  onChange: (transform: Transformation) => void;
}> = ({ transform, onChange }) => {
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

  return (
    <div className="join-config">
      <div className="config-row">
        <label>Join Type:</label>
        <select
          value={config.joinType}
          onChange={(e) => handleConfigChange({ ...config, joinType: e.target.value })}
        >
          <option value="inner">Inner Join</option>
          <option value="left">Left Join</option>
          <option value="right">Right Join</option>
          <option value="outer">Outer Join</option>
        </select>
      </div>
      
      <div className="config-row">
        <label>Left Column:</label>
        <input
          type="text"
          value={config.leftColumn}
          onChange={(e) => handleConfigChange({ ...config, leftColumn: e.target.value })}
          placeholder="Left table column"
        />
      </div>
      
      <div className="config-row">
        <label>Right Column:</label>
        <input
          type="text"
          value={config.rightColumn}
          onChange={(e) => handleConfigChange({ ...config, rightColumn: e.target.value })}
          placeholder="Right table column"
        />
      </div>
      
      <div className="config-row">
        <label>Right Table:</label>
        <input
          type="text"
          value={config.rightTable}
          onChange={(e) => handleConfigChange({ ...config, rightTable: e.target.value })}
          placeholder="Right table data key"
        />
      </div>
    </div>
  );
};
