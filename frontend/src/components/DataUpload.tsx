import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle } from 'lucide-react';
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
  projectId?: string;
  onUploadComplete?: (dataset: Dataset) => void;
}

export const DataUpload: React.FC<DataUploadProps> = ({ projectId, onUploadComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);
  const [activeSource, setActiveSource] = useState<'file' | 'dynamodb'>('file');
  const [dynamoForm, setDynamoForm] = useState({
    tableName: '',
    region: '',
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
    endpointUrl: '',
    limit: '',
    datasetName: '',
  });
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
      const dataset = await datasetAPI.upload(file, projectId);
      
      // Show preview instead of immediately adding
      setPreviewDataset(dataset as Dataset);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [addDataset, onUploadComplete]);

  const handleDynamoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setDynamoForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDynamoImport = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      if (!dynamoForm.tableName.trim()) {
        setError('Table name is required');
        return;
      }

      let parsedLimit: number | undefined;
      if (dynamoForm.limit.trim()) {
        parsedLimit = Number(dynamoForm.limit);
        if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
          setError('Limit must be a positive number');
          return;
        }
      }

      const dataset = await datasetAPI.importFromDynamoDB({
        tableName: dynamoForm.tableName.trim(),
        region: dynamoForm.region.trim() || undefined,
        accessKeyId: dynamoForm.accessKeyId.trim() || undefined,
        secretAccessKey: dynamoForm.secretAccessKey || undefined,
        sessionToken: dynamoForm.sessionToken.trim() || undefined,
        endpointUrl: dynamoForm.endpointUrl.trim() || undefined,
        limit: parsedLimit,
        datasetName: dynamoForm.datasetName.trim() || undefined,
        projectId,
      });

      setPreviewDataset(dataset as Dataset);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to import DynamoDB table');
    } finally {
      setIsProcessing(false);
    }
  };

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
      <div className="flex items-center justify-center space-x-2 mb-4">
        <button
          type="button"
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${
            activeSource === 'file'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
          onClick={() => setActiveSource('file')}
          disabled={isProcessing}
        >
          Upload File
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${
            activeSource === 'dynamodb'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
          onClick={() => setActiveSource('dynamodb')}
          disabled={isProcessing}
        >
          DynamoDB
        </button>
      </div>

      {activeSource === 'file' ? (
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
      ) : (
        <div className={`border rounded-lg p-6 space-y-4 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Table name</label>
            <input
              name="tableName"
              value={dynamoForm.tableName}
              onChange={handleDynamoChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="your-table-name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Dataset name (optional)</label>
            <input
              name="datasetName"
              value={dynamoForm.datasetName}
              onChange={handleDynamoChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Friendly name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">AWS region</label>
            <input
              name="region"
              value={dynamoForm.region}
              onChange={handleDynamoChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="us-east-1"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Access key ID</label>
              <input
                name="accessKeyId"
                value={dynamoForm.accessKeyId}
                onChange={handleDynamoChange}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="AKIA..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Secret access key</label>
              <input
                name="secretAccessKey"
                type="password"
                value={dynamoForm.secretAccessKey}
                onChange={handleDynamoChange}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Session token (optional)</label>
            <input
              name="sessionToken"
              value={dynamoForm.sessionToken}
              onChange={handleDynamoChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Optional session token"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Endpoint URL (optional)</label>
            <input
              name="endpointUrl"
              value={dynamoForm.endpointUrl}
              onChange={handleDynamoChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="http://localhost:8000"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Limit rows (optional)</label>
            <input
              name="limit"
              value={dynamoForm.limit}
              onChange={handleDynamoChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="1000"
            />
          </div>
          <button
            type="button"
            onClick={handleDynamoImport}
            className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {isProcessing ? 'Importing...' : 'Import from DynamoDB'}
          </button>
          <p className="text-xs text-gray-400">
            Credentials are used only for this import and are not stored.
          </p>
        </div>
      )}

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
