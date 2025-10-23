import React from 'react';
import { X, CheckCircle } from 'lucide-react';

// Define types locally to avoid import issues
interface Column {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  nullable: boolean;
}

interface Dataset {
  id: string;
  name: string;
  columns: Column[];
  rowCount: number;
  preview: Record<string, any>[];
  dataKey: string;
}

interface CSVPreviewProps {
  dataset: Dataset;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CSVPreview: React.FC<CSVPreviewProps> = ({ dataset, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h2 className="text-xl font-semibold text-gray-900">CSV Upload Preview</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Dataset Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{dataset.name}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Rows:</span> {dataset.rowCount.toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Columns:</span> {dataset.columns.length}
            </div>
          </div>
        </div>
        
        {/* Column Schema */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">Column Schema</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-700 mb-2">
              <div>Column Name</div>
              <div>Type</div>
              <div>Nullable</div>
              <div>Sample Value</div>
            </div>
            {dataset.columns.map((column) => (
              <div key={column.name} className="grid grid-cols-4 gap-2 text-sm text-gray-600 py-1 border-b border-gray-200 last:border-b-0">
                <div className="font-medium">{column.name}</div>
                <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {column.type}
                </div>
                <div className={column.nullable ? "text-orange-600" : "text-green-600"}>
                  {column.nullable ? "Yes" : "No"}
                </div>
                <div className="truncate">
                  {dataset.preview[0]?.[column.name] !== undefined 
                    ? String(dataset.preview[0][column.name] || "null")
                    : "N/A"
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Data Preview Table */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">Data Preview (First 10 rows)</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {dataset.columns.map((column) => (
                      <th
                        key={column.name}
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataset.preview.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {dataset.columns.map((column) => (
                        <td
                          key={column.name}
                          className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate"
                          title={String(row[column.name] || "null")}
                        >
                          {row[column.name] !== undefined 
                            ? String(row[column.name] || "null")
                            : "N/A"
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Confirm Upload
          </button>
        </div>
      </div>
    </div>
  );
};
