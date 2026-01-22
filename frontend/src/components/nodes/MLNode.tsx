import React from 'react';
import { Handle, Position } from 'reactflow';
import { 
  Brain,
  TrendingUp,
  Target,
  Layers,
  Lock
} from 'lucide-react';

interface MLNodeProps {
  data: {
    label: string;
    mlType?: 'regression' | 'classification' | 'clustering';
    modelType?: string;
    featureColumns?: string[];
    targetColumn?: string;
    status?: 'pending' | 'running' | 'success' | 'error';
    config?: any;
    mlResults?: any; // ML training results
    lockedBy?: string;
  };
  selected?: boolean;
}

const getMLIcon = (mlType?: string) => {
  switch (mlType) {
    case 'regression':
      return TrendingUp;
    case 'classification':
      return Target;
    case 'clustering':
      return Layers;
    default:
      return Brain;
  }
};

const getMLLabel = (mlType?: string) => {
  switch (mlType) {
    case 'regression':
      return 'Regression';
    case 'classification':
      return 'Classification';
    case 'clustering':
      return 'Clustering';
    default:
      return 'Machine Learning';
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

export const MLNode: React.FC<MLNodeProps> = ({ data, selected }) => {
  const Icon = getMLIcon(data.mlType);
  const mlLabel = getMLLabel(data.mlType);
  const statusClass = getStatusColor(data.status);

  return (
    <div
      className={`bg-white border-2 rounded-lg shadow-lg transition-all relative ${
        data.mlResults ? 'min-w-[240px]' : 'min-w-[200px]'
      } ${
        selected ? 'border-blue-500 shadow-xl' : statusClass
      }`}
    >
      {data.lockedBy && (
        <div className="absolute inset-0 bg-gray-200/40 rounded-lg pointer-events-none"></div>
      )}
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-4 !h-4 !bg-indigo-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{
          left: -8,
        }}
        title="Connect from a data source or transformation"
        isConnectable={true}
      />

      {/* Node Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2 rounded-t-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4" />
          <span className="font-semibold text-sm">{mlLabel}</span>
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
        <div className="text-sm text-gray-700 mb-2 font-medium">{data.label}</div>
        {data.lockedBy && (
          <div className="text-[11px] text-gray-500">Locked by {data.lockedBy}</div>
        )}
        
        {/* ML configuration preview */}
        {data.modelType && !data.mlResults && (
          <div className="text-xs text-gray-500 space-y-1 mt-2">
            <div className="flex items-center space-x-1">
              <span className="font-medium">Model:</span>
              <span className="truncate capitalize">{data.modelType.replace('_', ' ')}</span>
            </div>
            {data.featureColumns && data.featureColumns.length > 0 && (
              <div className="flex items-center space-x-1">
                <span className="font-medium">Features:</span>
                <span className="truncate">{data.featureColumns.length} columns</span>
              </div>
            )}
            {data.targetColumn && (
              <div className="flex items-center space-x-1">
                <span className="font-medium">Target:</span>
                <span className="truncate">{data.targetColumn}</span>
              </div>
            )}
          </div>
        )}
        
        {/* ML Results Display on Node */}
        {data.mlResults && data.status === 'success' && (
          <div className="mt-3 space-y-2">
            {/* Regression Results */}
            {data.mlType === 'regression' && (
              <div className="space-y-1.5">
                <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                  <div className="text-[10px] text-gray-500 uppercase font-medium">R² Score</div>
                  <div className="text-lg font-bold text-blue-700">
                    {data.mlResults.metrics.r2_score?.toFixed(3) || 'N/A'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-green-50 border border-green-200 rounded px-2 py-1">
                    <div className="text-[9px] text-gray-500 uppercase">RMSE</div>
                    <div className="text-sm font-bold text-green-700">
                      {data.mlResults.metrics.rmse?.toFixed(2) || 'N/A'}
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded px-2 py-1">
                    <div className="text-[9px] text-gray-500 uppercase">MSE</div>
                    <div className="text-sm font-bold text-purple-700">
                      {data.mlResults.metrics.mse?.toFixed(2) || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-between">
                  <span>Train: {data.mlResults.train_size}</span>
                  <span>Test: {data.mlResults.test_size}</span>
                </div>
              </div>
            )}
            
            {/* Classification Results */}
            {data.mlType === 'classification' && (
              <div className="space-y-1.5">
                <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5">
                  <div className="text-[10px] text-gray-500 uppercase font-medium">Accuracy</div>
                  <div className="text-2xl font-bold text-green-700">
                    {((data.mlResults.metrics.accuracy || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                {data.mlResults.classes && (
                  <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">
                    <div className="text-[9px] text-gray-500 uppercase mb-1">Classes</div>
                    <div className="flex flex-wrap gap-1">
                      {data.mlResults.classes.slice(0, 4).map((cls: string, idx: number) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-white border border-gray-300 rounded">
                          {String(cls).substring(0, 8)}
                        </span>
                      ))}
                      {data.mlResults.classes.length > 4 && (
                        <span className="text-[9px] text-gray-500">+{data.mlResults.classes.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}
                <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-between">
                  <span>Train: {data.mlResults.train_size}</span>
                  <span>Test: {data.mlResults.test_size}</span>
                </div>
              </div>
            )}
            
            {/* Clustering Results */}
            {data.mlType === 'clustering' && (
              <div className="space-y-1.5">
                <div className="bg-indigo-50 border border-indigo-200 rounded px-2 py-1.5">
                  <div className="text-[10px] text-gray-500 uppercase font-medium">Silhouette</div>
                  <div className="text-2xl font-bold text-indigo-700">
                    {data.mlResults.metrics.silhouette_score?.toFixed(3) || 'N/A'}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded px-2 py-1">
                  <div className="text-[9px] text-gray-500 uppercase mb-1">Clusters</div>
                  <div className="text-lg font-bold text-purple-700">
                    {data.mlResults.metrics.n_clusters} groups
                  </div>
                </div>
                {data.mlResults.cluster_stats && (
                  <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">
                    <div className="text-[9px] text-gray-500 uppercase mb-1">Distribution</div>
                    <div className="space-y-0.5">
                      {data.mlResults.cluster_stats.slice(0, 3).map((stat: any) => (
                        <div key={stat.cluster} className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-600">C{stat.cluster}</span>
                          <span className="font-medium">{stat.percentage.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="text-[10px] text-indigo-600 font-medium mt-2 text-center">
              Double-click for details
            </div>
          </div>
        )}
        
        {/* Status indicator */}
        {data.status && data.status !== 'pending' && !data.mlResults && (
          <div className="flex items-center space-x-2 mt-2">
            {data.status === 'running' && (
              <div className="flex items-center space-x-1 text-xs text-yellow-600">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-yellow-600 border-t-transparent"></div>
                <span>Training...</span>
              </div>
            )}
            {data.status === 'success' && (
              <div className="text-xs text-green-600">
                ✓ Model trained
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
        className="!w-4 !h-4 !bg-indigo-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{
          right: -8,
        }}
        title="Connect to another transformation or visualization"
        isConnectable={true}
      />
    </div>
  );
};

