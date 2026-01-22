import React from 'react';
import { Handle, Position } from 'reactflow';
import { 
  BarChart3,
  LineChart,
  ScatterChart,
  AreaChart,
  PieChart,
  TrendingUp,
  Lock
} from 'lucide-react';
import type { ChartType } from '../../types';

interface VisualizationNodeProps {
  data: {
    label: string;
    chartType?: ChartType;
    xColumn?: string;
    yColumn?: string;
    status?: 'pending' | 'running' | 'success' | 'error';
    config?: any;
    lockedBy?: string;
  };
  selected?: boolean;
}

const getChartIcon = (chartType?: ChartType) => {
  switch (chartType) {
    case 'scatter':
      return ScatterChart;
    case 'line':
      return LineChart;
    case 'bar':
      return BarChart3;
    case 'area':
      return AreaChart;
    case 'pie':
      return PieChart;
    default:
      return TrendingUp;
  }
};

const getChartLabel = (chartType?: ChartType) => {
  switch (chartType) {
    case 'scatter':
      return 'Scatter Plot';
    case 'line':
      return 'Line Chart';
    case 'bar':
      return 'Bar Chart';
    case 'area':
      return 'Area Chart';
    case 'pie':
      return 'Pie Chart';
    default:
      return 'Visualization';
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

export const VisualizationNode: React.FC<VisualizationNodeProps> = ({ data, selected }) => {
  const Icon = getChartIcon(data.chartType);
  const chartLabel = getChartLabel(data.chartType);
  const statusClass = getStatusColor(data.status);

  return (
    <div
      className={`bg-white border-2 rounded-lg shadow-lg min-w-[200px] transition-all ${
        selected ? 'border-blue-500 shadow-xl' : statusClass
      }`}
    >
      {/* Input Handle - Only accepts input, no output */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-4 !h-4 !bg-teal-500 !border-2 !border-white hover:!w-5 hover:!h-5 transition-all"
        style={{
          left: -8,
        }}
        title="Connect from a data source or transformation"
        isConnectable={true}
      />

      {/* Node Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-2 rounded-t-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4" />
          <span className="font-semibold text-sm">{chartLabel}</span>
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
        
        {/* Chart configuration preview */}
        {data.xColumn && data.yColumn && (
          <div className="text-xs text-gray-500 space-y-1 mt-2">
            <div className="flex items-center space-x-1">
              <span className="font-medium">X:</span>
              <span className="truncate">{data.xColumn}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-medium">Y:</span>
              <span className="truncate">{data.yColumn}</span>
            </div>
          </div>
        )}
        
        {/* Status indicator */}
        {data.status && data.status !== 'pending' && (
          <div className="flex items-center space-x-2 mt-2">
            {data.status === 'running' && (
              <div className="flex items-center space-x-1 text-xs text-yellow-600">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-yellow-600 border-t-transparent"></div>
                <span>Rendering...</span>
              </div>
            )}
            {data.status === 'success' && (
              <div className="text-xs text-green-600">
                ✓ Ready to view
              </div>
            )}
            {data.status === 'error' && (
              <div className="text-xs text-red-600">✗ Error</div>
            )}
          </div>
        )}
      </div>

      {/* No output handle - visualization is terminal node */}
    </div>
  );
};


