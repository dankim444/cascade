import React from 'react';
import { useWorkflowStore } from '../store/useWorkflowStore';

export const DebugPanel: React.FC = () => {
  const { nodes, datasets, dataConnections } = useWorkflowStore();

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg p-4 max-w-md shadow-xl z-50">
      <h3 className="font-bold text-sm mb-2">Debug Info</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <span className="font-semibold">Datasets:</span> {datasets.length}
          {datasets.map(ds => (
            <div key={ds.id} className="ml-2 text-gray-600">
              • {ds.name} ({ds.columns.length} cols)
            </div>
          ))}
        </div>
        
        <div>
          <span className="font-semibold">Data Connections:</span> {dataConnections.length}
          {dataConnections.map(dc => (
            <div key={dc.dataKey} className="ml-2 text-gray-600">
              • {dc.dataKey}
            </div>
          ))}
        </div>
        
        <div>
          <span className="font-semibold">Nodes:</span> {nodes.length}
          {nodes.map(node => (
            <div key={node.id} className="ml-2 text-gray-600">
              • {node.transform.operation} on {node.data}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-500 italic">
        If nodes list is empty, nodes aren't being created.
        <br />
        If datasets is 0, upload data first.
      </div>
    </div>
  );
};

