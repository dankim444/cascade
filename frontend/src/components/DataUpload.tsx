import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle } from 'lucide-react';
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
import { useWorkflowStore } from '../store/useWorkflowStore';
import { datasetAPI } from '../services/api';
import { CSVPreview } from './CSVPreview';

interface DataUploadProps {
  onUploadComplete?: (dataset: Dataset) => void;
}

export const DataUpload: React.FC<DataUploadProps> = ({ onUploadComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);
  const addDataset = useWorkflowStore((state) => state.addDataset);

  // Removed parseCSV function - now handled by backend

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    setError(null);

    try {
      const file = acceptedFiles[0];
      
      if (!file) {
        setError('No file selected');
        return;
      }

      // Check file type
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
        setError('Please upload a CSV or Excel file');
        return;
      }

      // Check file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB');
        return;
      }

      // Upload to backend
      const dataset = await datasetAPI.upload(file);
      
      // Show preview instead of immediately adding
      setPreviewDataset(dataset);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [addDataset, onUploadComplete]);

  const handleConfirmUpload = () => {
    if (previewDataset) {
      addDataset(previewDataset);
      onUploadComplete?.(previewDataset);
      setPreviewDataset(null);
    }
  };

  const handleCancelUpload = () => {
    setPreviewDataset(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isProcessing ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {isProcessing ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {isProcessing 
                ? 'Processing file...' 
                : isDragActive 
                  ? 'Drop your file here' 
                  : 'Upload your dataset'
              }
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Drag & drop a CSV or Excel file, or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports files up to 100MB
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* CSV Preview Modal */}
      {previewDataset && (
        <CSVPreview
          dataset={previewDataset}
          onConfirm={handleConfirmUpload}
          onCancel={handleCancelUpload}
        />
      )}
    </div>
  );
};
