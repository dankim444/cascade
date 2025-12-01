import React from 'react';
import { X, Download } from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartType } from '../types';

interface VisualizationDisplayProps {
  chartType: ChartType;
  xColumn: string;
  yColumn: string;
  data: any[];
  title?: string;
  onClose: () => void;
}

// Color palette for charts
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export const VisualizationDisplay: React.FC<VisualizationDisplayProps> = ({
  chartType,
  xColumn,
  yColumn,
  data,
  title,
  onClose,
}) => {
  // Process data for visualization
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map((row) => ({
      x: row[xColumn],
      y: parseFloat(row[yColumn]) || 0,
      name: String(row[xColumn]),
      value: parseFloat(row[yColumn]) || 0,
    }));
  }, [data, xColumn, yColumn]);

  const downloadChart = () => {
    // Create CSV from chart data
    const csvContent = [
      `${xColumn},${yColumn}`,
      ...chartData.map(d => `${d.x},${d.y}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart_data_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    switch (chartType) {
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="x" 
                name={xColumn} 
                label={{ value: xColumn, position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                dataKey="y" 
                name={yColumn}
                label={{ value: yColumn, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name={`${xColumn} vs ${yColumn}`} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="x" 
                label={{ value: xColumn, position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                label={{ value: yColumn, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="y" 
                stroke={COLORS[0]} 
                strokeWidth={2}
                name={yColumn}
                dot={{ fill: COLORS[0] }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="x" 
                label={{ value: xColumn, position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                label={{ value: yColumn, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="y" fill={COLORS[0]} name={yColumn} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="x" 
                label={{ value: xColumn, position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                label={{ value: yColumn, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="y" 
                stroke={COLORS[0]} 
                fill={COLORS[0]}
                fillOpacity={0.6}
                name={yColumn}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.slice(0, 10)} // Limit to 10 slices for readability
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={150}
                fill={COLORS[0]}
                dataKey="value"
              >
                {chartData.slice(0, 10).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Unsupported chart type: {chartType}</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {title || `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`}
            </h2>
            <p className="text-sm opacity-90 mt-1">
              {xColumn} vs {yColumn} ({chartData.length} data points)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-6 overflow-hidden">
          {chartData.length > 0 ? (
            <div className="w-full h-full min-h-[500px]">
              {renderChart()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm mt-2">
                  Make sure the selected columns contain valid data
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <span className="font-medium">X-Axis:</span> {xColumn} • 
            <span className="font-medium ml-2">Y-Axis:</span> {yColumn}
          </div>
          <div className="flex space-x-3">
            {chartData.length > 0 && (
              <button
                onClick={downloadChart}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download Data</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


