import React from 'react';
import { X, Table, Download, RefreshCw } from 'lucide-react';

interface NodeDataPreviewProps {
  nodeId: string;
  nodeName: string;
  data: any[] | null;
  rowCount?: number;
  schema?: any[];
  isLoading?: boolean;
  error?: string;
  onClose: () => void;
  onRefresh?: () => void;
}

export const NodeDataPreview: React.FC<NodeDataPreviewProps> = ({
  nodeName,
  data,
  rowCount,
  isLoading,
  error,
  onClose,
  onRefresh,
}) => {
  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

  const downloadCSV = () => {
    if (!data || data.length === 0) return;

    // Convert to CSV
    const headers = columns.join(',');
    const rows = data.map((row: any) =>
      columns.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        const str = String(value);
        return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nodeName}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Table className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-bold">Data Preview</h2>
              <p className="text-sm opacity-90">{nodeName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Data</h3>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        ) : data && data.length > 0 ? (
          <>
            {/* Stats Bar */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    Showing: {data.length.toLocaleString()} rows
                  </span>
                </div>
                {rowCount && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      Total: {rowCount.toLocaleString()} rows
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    {columns.length} columns
                  </span>
                </div>
              </div>

              <button
                onClick={downloadCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Download className="h-4 w-4" />
                <span>Download CSV</span>
              </button>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                        #
                      </th>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 font-medium bg-gray-50">
                          {idx + 1}
                        </td>
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate"
                            title={String(row[col] ?? 'null')}
                          >
                            {row[col] !== null && row[col] !== undefined ? (
                              String(row[col])
                            ) : (
                              <span className="text-gray-400 italic">null</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rowCount && data.length < rowCount && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Showing first {data.length} rows of {rowCount.toLocaleString()} total.
                  Execute the pipeline to see all data.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Table className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium text-gray-700">No data available</p>
              <p className="text-sm text-gray-500 mt-2">
                Execute the pipeline to this node to see data
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end space-x-3">
          {data && data.length > 0 && (
            <button
              onClick={downloadCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
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
  );
};

