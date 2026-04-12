import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Table, Download, Save, Edit2 } from 'lucide-react';
import { datasetAPI } from '../services/api';

interface ResultsViewerProps {
  result: any;
  onClose: () => void;
  projectId?: string;
  pipelineId?: string;
  pipelineName?: string;
  onDatasetSaved?: () => void;
  onDatasetRenamed?: () => void;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({
  result,
  onClose,
  projectId,
  pipelineId,
  pipelineName,
  onDatasetSaved,
  onDatasetRenamed,
}) => {
  const isSuccess = result.status === 'success';
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedDatasetName, setSavedDatasetName] = useState<string | null>(result.outputDataset?.name || null);
  const [savedDatasetId, setSavedDatasetId] = useState<string | null>(result.outputDataset?.id ?? null);
  const [renameDatasetName, setRenameDatasetName] = useState<string>(result.outputDataset?.name || '');
  const [isRenamingDataset, setIsRenamingDataset] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  // Extract data from result
  const outputData = result.data || result.output_data || [];
  const rowCount = result.outputRows || result.row_count || result.rows || outputData.length;
  const columns = outputData.length > 0 ? Object.keys(outputData[0]) : [];
  const message = result.message || '';
  
  // Get execution summary (and final on-disk output key for full dataset save)
  const executionResults = result.executionResults || [];
  const finalExecution = executionResults.length > 0 ? executionResults[executionResults.length - 1] : null;
  const outputDataKey = finalExecution?.output_data_key as string | undefined;
  const operationsPerformed = executionResults.map((r: any) => r.operation).filter(Boolean);
  const executionTime = result.executionTime || 'N/A';

  const datasetIdForFullCsv = savedDatasetId ?? result.outputDataset?.id ?? null;
  const datasetNameForFullCsv =
    savedDatasetName ?? result.outputDataset?.name ?? 'pipeline_output';
  const canDownloadFullCsv = Boolean(outputDataKey || datasetIdForFullCsv);

  const triggerBlobFileDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadPreviewAsCsv = () => {
    if (outputData.length === 0) return;
    const headers = columns.join(',');
    const rows = outputData.map((row: any) =>
      columns.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        const str = String(value);
        return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','),
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    triggerBlobFileDownload(blob, `cascade_preview_${Date.now()}.csv`);
  };

  const downloadCSV = async () => {
    if (canDownloadFullCsv) {
      setIsDownloadingCsv(true);
      try {
        if (datasetIdForFullCsv) {
          await datasetAPI.downloadCsv(datasetIdForFullCsv, datasetNameForFullCsv);
          return;
        }
        if (outputDataKey) {
          const blob = await datasetAPI.downloadExecutionOutputCsv(outputDataKey);
          const safe = outputDataKey.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
          triggerBlobFileDownload(blob, `${safe || 'pipeline_output'}.csv`);
          return;
        }
      } catch (e: any) {
        alert(e?.message || 'Download failed');
      } finally {
        setIsDownloadingCsv(false);
      }
      return;
    }

    downloadPreviewAsCsv();
  };

  const handleSaveAsDataset = async () => {
    if (!projectId) {
      setSaveError('Cannot save: Missing project ID');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (outputDataKey) {
        const dataset = await datasetAPI.createFromExecutionOutput({
          outputDataKey,
          projectId,
          pipelineId,
          pipelineName,
          outputSchema: result.outputSchema,
          rowCount: result.outputRows,
        });
        setSavedDatasetName(dataset.name);
        setSavedDatasetId(dataset.id);
        setRenameDatasetName(dataset.name);
        onDatasetSaved?.();
        alert(`Dataset saved successfully: ${dataset.name}`);
        return;
      }

      if (outputData.length === 0) {
        setSaveError('No output to save');
        return;
      }

      const headers = columns.join(',');
      const rows = outputData.map((row: any) =>
        columns.map((col) => {
          const value = row[col];
          if (value === null || value === undefined) return '';
          const str = String(value);
          return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      );
      const csv = [headers, ...rows].join('\n');
      const csvBlob = new Blob([csv], { type: 'text/csv' });
      const csvFile = new File([csvBlob], `pipeline_output_${Date.now()}.csv`, { type: 'text/csv' });
      const dataset = await datasetAPI.upload(csvFile, projectId);
      setSavedDatasetName(dataset.name);
      setSavedDatasetId(dataset.id);
      setRenameDatasetName(dataset.name);
      onDatasetSaved?.();
      alert(
        `Dataset saved (preview rows only — ${outputData.length} rows). Run the pipeline again and save immediately if you need the full result.`
      );
    } catch (error: any) {
      console.error('Failed to save dataset:', error);
      setSaveError(error.message || 'Failed to save dataset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenameSavedDataset = async () => {
    if (!savedDatasetId) return;
    const nextName = renameDatasetName.trim();
    if (!nextName) {
      setSaveError('Dataset name cannot be empty');
      return;
    }
    setSaveError(null);
    setIsRenamingDataset(true);
    try {
      const updated = await datasetAPI.rename(savedDatasetId, nextName);
      setSavedDatasetName(updated.name);
      setRenameDatasetName(updated.name);
      onDatasetRenamed?.();
    } catch (error: any) {
      setSaveError(error.message || 'Failed to rename dataset');
    } finally {
      setIsRenamingDataset(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`${isSuccess ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-4 rounded-t-lg flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            {isSuccess ? (
              <CheckCircle className="h-6 w-6" />
            ) : (
              <AlertCircle className="h-6 w-6" />
            )}
            <div>
              <h2 className="text-xl font-bold">
                {isSuccess ? 'Pipeline Executed Successfully!' : 'Pipeline Execution Failed'}
              </h2>
              {isSuccess && (
                <p className="text-sm opacity-90 mt-1">
                  {operationsPerformed.length > 0 
                    ? `Applied: ${operationsPerformed.map((op: string) => op.replace('_', ' ')).join(' → ')}` 
                    : message || 'Data transformation completed'}
                  {executionTime && ` • ${executionTime}`}
                </p>
              )}
              {!isSuccess && message && (
                <p className="text-sm opacity-90 mt-1">{message}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Content */}
        {isSuccess && (
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
            {/* Pipeline Summary */}
            {executionResults.length > 0 && (
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
                <div className="text-sm font-medium text-blue-900 mb-2">Pipeline Steps:</div>
                <div className="flex flex-wrap gap-2">
                  {executionResults.map((step: any, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <div className="bg-white border border-blue-300 rounded px-3 py-1 text-xs">
                        <span className="font-medium text-blue-700">{step.operation?.replace('_', ' ') || 'transform'}</span>
                        <span className="text-gray-500 ml-2">→ {step.row_count} rows</span>
                      </div>
                      {idx < executionResults.length - 1 && (
                        <span className="text-blue-400">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Stats Bar */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Table className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {rowCount.toLocaleString()} rows
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    {columns.length} columns
                  </span>
                </div>
                {(savedDatasetName || result.outputDataset) && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      {savedDatasetName 
                        ? `Saved: ${savedDatasetName}` 
                        : `Auto-saved as dataset: ${result.outputDataset.name}`}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {(outputData.length > 0 || outputDataKey) && projectId && !savedDatasetName && !result.outputDataset && (
                  <button
                    onClick={handleSaveAsDataset}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    title="Save the pipeline output as a dataset in this project"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save as Dataset</span>
                      </>
                    )}
                  </button>
                )}
                {(outputData.length > 0 || canDownloadFullCsv) && (
                  <button
                    onClick={() => void downloadCSV()}
                    disabled={isDownloadingCsv || (outputData.length === 0 && !canDownloadFullCsv)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title={canDownloadFullCsv ? 'Full result CSV' : 'Preview CSV'}
                  >
                    {isDownloadingCsv ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>{canDownloadFullCsv ? 'Download CSV' : 'Download preview CSV'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {savedDatasetId && (
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={renameDatasetName}
                  onChange={(e) => setRenameDatasetName(e.target.value)}
                  className="flex-1 max-w-sm px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Dataset name"
                />
                <button
                  onClick={handleRenameSavedDataset}
                  disabled={isRenamingDataset || renameDatasetName.trim().length === 0}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRenamingDataset ? 'Saving...' : 'Rename output'}
                </button>
              </div>
            )}

            {outputData.length > 0 && (
              <div className="px-6 py-1.5 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Preview</span>
              </div>
            )}
            
            {saveError && (
              <div className="px-6 py-3 bg-red-50 border-b border-red-200">
                <div className="flex items-center space-x-2 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{saveError}</span>
                </div>
              </div>
            )}

            {/* Data Table */}
            {outputData.length > 0 ? (
              <div className="flex-1 min-h-0 min-w-0 overflow-auto px-6 py-4">
                <div className="border border-gray-200 rounded-lg">
                  <table className="w-full min-w-max divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="sticky left-0 top-0 z-30 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100 border-r border-gray-200 shadow-[0_1px_0_0_rgb(229_231_235)]">
                          #
                        </th>
                        {columns.map((col) => (
                          <th
                            key={col}
                            className="sticky top-0 z-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50 shadow-[0_1px_0_0_rgb(229_231_235)]"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {outputData.slice(0, 100).map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="sticky left-0 z-10 px-4 py-3 text-sm text-gray-500 font-medium bg-gray-50 border-r border-gray-200">
                            {idx + 1}
                          </td>
                          {columns.map((col) => (
                            <td
                              key={col}
                              className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                              title={String(row[col] ?? 'null')}
                            >
                              {row[col] !== null && row[col] !== undefined 
                                ? String(row[col]) 
                                : <span className="text-gray-400 italic">null</span>
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {outputData.length > 100 && (
                  <div className="mt-4 text-center text-sm text-gray-500">First 100 rows</div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Table className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium">No output data available</p>
                  <p className="text-sm mt-1">The pipeline executed but returned no rows</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Content */}
        {!isSuccess && (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Details:</h3>
              <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono">
                {result.error || result.detail || 'Unknown error occurred'}
              </pre>
            </div>

            {result.traceback && (
              <details className="mt-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                  Show full traceback
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-4 rounded border border-gray-300 overflow-x-auto">
                  {result.traceback}
                </pre>
              </details>
            )}
          </div>
        )}

      </div>
    </div>
  );
};


