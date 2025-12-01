import React, { useMemo } from 'react';
import { X, Download, Brain, TrendingUp, Target, Layers, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react';
import type { MLResults } from '../types/core';

interface MLResultsDisplayProps {
  mlType: 'regression' | 'classification' | 'clustering';
  results: MLResults;
  data: any[];
  onClose: () => void;
}

export const MLResultsDisplay: React.FC<MLResultsDisplayProps> = ({
  mlType,
  results,
  data,
  onClose,
}) => {
  const getIcon = () => {
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

  const getTitle = () => {
    switch (mlType) {
      case 'regression':
        return 'Regression Model Results';
      case 'classification':
        return 'Classification Model Results';
      case 'clustering':
        return 'Clustering Results';
      default:
        return 'ML Results';
    }
  };

  const Icon = getIcon();

  const downloadResults = () => {
    // Create CSV from results
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => row[h]).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ml_results_${mlType}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  // Calculate additional statistics
  const regressionStats = useMemo(() => {
    if (mlType !== 'regression' || !data || data.length === 0) return null;
    
    const errors = data.map(row => Math.abs(row.error || 0));
    const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const maxError = Math.max(...errors);
    const withinTolerance = errors.filter(e => e < meanError).length;
    const accuracyPercent = (withinTolerance / errors.length) * 100;
    
    return { meanError, maxError, accuracyPercent };
  }, [mlType, data]);

  const classificationStats = useMemo(() => {
    if (mlType !== 'classification' || !data || data.length === 0) return null;
    
    const correct = data.filter(row => row.correct === 1).length;
    const incorrect = data.length - correct;
    
    return { correct, incorrect, total: data.length };
  }, [mlType, data]);

  const renderMetrics = () => {
    if (mlType === 'regression') {
      const r2 = results.metrics.r2_score || 0;
      const r2Quality = r2 > 0.8 ? 'Excellent' : r2 > 0.6 ? 'Good' : r2 > 0.4 ? 'Fair' : 'Poor';
      const r2Color = r2 > 0.8 ? 'text-green-600' : r2 > 0.6 ? 'text-blue-600' : r2 > 0.4 ? 'text-yellow-600' : 'text-red-600';
      
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="text-sm text-gray-600 mb-1">R² Score</div>
              <div className={`text-3xl font-bold ${r2Color}`}>
                {r2.toFixed(4)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{r2Quality} fit</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">RMSE</div>
              <div className="text-2xl font-bold text-green-600">
                {results.metrics.rmse?.toFixed(4) || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Root Mean Sq Error</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">MSE</div>
              <div className="text-2xl font-bold text-purple-600">
                {results.metrics.mse?.toFixed(4) || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Mean Squared Error</div>
            </div>
          </div>
          
          {regressionStats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Mean Abs Error</div>
                <div className="text-xl font-bold text-orange-600">
                  {regressionStats.meanError.toFixed(4)}
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Max Error</div>
                <div className="text-xl font-bold text-red-600">
                  {regressionStats.maxError.toFixed(4)}
                </div>
              </div>
              <div className="bg-teal-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Within Avg Error</div>
                <div className="text-xl font-bold text-teal-600">
                  {regressionStats.accuracyPercent.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
          
          {/* Visual scatter plot representation */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Prediction Quality (First 20 samples)</span>
            </div>
            <div className="space-y-1">
              {data.slice(0, 20).map((row, idx) => {
                const actual = row.actual || 0;
                const predicted = row.predicted || 0;
                const error = Math.abs(row.error || 0);
                const maxVal = Math.max(...data.slice(0, 20).map((r: any) => Math.max(r.actual || 0, r.predicted || 0)));
                const actualPercent = (actual / maxVal) * 100;
                const predictedPercent = (predicted / maxVal) * 100;
                const errorColor = error < regressionStats!.meanError ? 'bg-green-500' : 'bg-red-500';
                
                return (
                  <div key={idx} className="flex items-center space-x-2 text-xs">
                    <div className="w-8 text-gray-500">#{idx + 1}</div>
                    <div className="flex-1 flex items-center space-x-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                        <div
                          className="bg-blue-400 h-4 rounded-full absolute"
                          style={{ width: `${actualPercent}%` }}
                          title={`Actual: ${actual.toFixed(2)}`}
                        />
                        <div
                          className={`${errorColor} h-4 rounded-full absolute opacity-60`}
                          style={{ width: `${predictedPercent}%` }}
                          title={`Predicted: ${predicted.toFixed(2)}`}
                        />
                      </div>
                      <div className="w-20 text-right text-gray-600">
                        Δ {error.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center space-x-4 mt-3 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-400 rounded"></div>
                <span>Actual</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 opacity-60 rounded"></div>
                <span>Predicted (good)</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 opacity-60 rounded"></div>
                <span>Predicted (high error)</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (mlType === 'classification') {
      const accuracy = results.metrics.accuracy || 0;
      const accuracyQuality = accuracy > 0.9 ? 'Excellent' : accuracy > 0.8 ? 'Good' : accuracy > 0.7 ? 'Fair' : 'Poor';
      const accuracyColor = accuracy > 0.9 ? 'text-green-600' : accuracy > 0.8 ? 'text-blue-600' : accuracy > 0.7 ? 'text-yellow-600' : 'text-red-600';
      
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200 col-span-1">
              <div className="text-sm text-gray-600 mb-1">Accuracy</div>
              <div className={`text-4xl font-bold ${accuracyColor}`}>
                {(accuracy * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">{accuracyQuality} performance</div>
            </div>
            
            {classificationStats && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1 flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Correct</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {classificationStats.correct}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((classificationStats.correct / classificationStats.total) * 100).toFixed(1)}% of predictions
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1 flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Incorrect</span>
                  </div>
                  <div className="text-3xl font-bold text-red-600">
                    {classificationStats.incorrect}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((classificationStats.incorrect / classificationStats.total) * 100).toFixed(1)}% of predictions
                  </div>
                </div>
              </>
            )}
          </div>
          
          {results.classes && results.classes.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-3">Class Distribution</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {results.classes.map((cls, idx) => {
                  const classCount = data.filter(row => String(row.predicted) === String(idx) || String(row.predicted) === String(cls)).length;
                  const percentage = (classCount / data.length) * 100;
                  return (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Class {cls}</div>
                      <div className="text-lg font-bold text-indigo-600">{classCount}</div>
                      <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Prediction samples visualization */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Recent Predictions (First 20 samples)</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {data.slice(0, 20).map((row, idx) => {
                const isCorrect = row.correct === 1;
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded text-center text-xs ${
                      isCorrect ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
                    }`}
                  >
                    <div className="font-medium">{isCorrect ? '✓' : '✗'} #{idx + 1}</div>
                    <div className="text-gray-600 mt-1">
                      {String(row.predicted).substring(0, 8)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (mlType === 'clustering') {
      const silhouette = results.metrics.silhouette_score || 0;
      const silhouetteQuality = silhouette > 0.7 ? 'Excellent' : silhouette > 0.5 ? 'Good' : silhouette > 0.3 ? 'Fair' : 'Poor';
      const silhouetteColor = silhouette > 0.7 ? 'text-green-600' : silhouette > 0.5 ? 'text-blue-600' : silhouette > 0.3 ? 'text-yellow-600' : 'text-red-600';
      
      const clusterColors = [
        'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
        'bg-pink-500', 'bg-teal-500', 'bg-red-500', 'bg-yellow-500',
        'bg-indigo-500', 'bg-cyan-500'
      ];
      
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
              <div className="text-sm text-gray-600 mb-1">Silhouette Score</div>
              <div className={`text-4xl font-bold ${silhouetteColor}`}>
                {silhouette.toFixed(3)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{silhouetteQuality} separation</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Number of Clusters</div>
              <div className="text-4xl font-bold text-purple-600">
                {results.metrics.n_clusters}
              </div>
              <div className="text-xs text-gray-500 mt-1">Groups identified</div>
            </div>
          </div>
          
          {results.cluster_stats && results.cluster_stats.length > 0 && (
            <>
              {/* Cluster size cards */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-3">Cluster Sizes</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {results.cluster_stats.map((stat) => (
                    <div key={stat.cluster} className="bg-white p-3 rounded-lg border-2 border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${clusterColors[stat.cluster % clusterColors.length]}`}></div>
                        <div className="text-xs font-medium text-gray-600">Cluster {stat.cluster}</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">{stat.size}</div>
                      <div className="text-xs text-gray-500">{stat.percentage.toFixed(1)}% of data</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Visual distribution bar */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                  <Layers className="h-4 w-4" />
                  <span>Distribution Overview</span>
                </div>
                <div className="flex h-12 rounded-lg overflow-hidden">
                  {results.cluster_stats.map((stat) => (
                    <div
                      key={stat.cluster}
                      className={`${clusterColors[stat.cluster % clusterColors.length]} flex items-center justify-center text-white font-medium text-sm`}
                      style={{ width: `${stat.percentage}%` }}
                      title={`Cluster ${stat.cluster}: ${stat.size} rows (${stat.percentage.toFixed(1)}%)`}
                    >
                      {stat.percentage > 10 && `${stat.percentage.toFixed(0)}%`}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {results.cluster_stats.map((stat) => (
                    <div key={stat.cluster} className="flex items-center space-x-2 text-xs">
                      <div className={`w-3 h-3 rounded-full ${clusterColors[stat.cluster % clusterColors.length]}`}></div>
                      <span className="text-gray-600">Cluster {stat.cluster}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Sample assignments */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-3">Sample Cluster Assignments (First 30)</div>
                <div className="flex flex-wrap gap-2">
                  {data.slice(0, 30).map((row, idx) => {
                    const cluster = row.cluster || 0;
                    return (
                      <div
                        key={idx}
                        className={`${clusterColors[cluster % clusterColors.length]} text-white px-2 py-1 rounded text-xs font-medium`}
                        title={`Row ${idx + 1}: Cluster ${cluster}`}
                      >
                        #{idx + 1}: C{cluster}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    return null;
  };

  const renderDataPreview = () => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          <p>No data available</p>
        </div>
      );
    }

    const headers = Object.keys(data[0]);
    const previewData = data.slice(0, 15);
    
    // Identify key columns based on ML type
    const keyColumns = mlType === 'regression' 
      ? ['actual', 'predicted', 'error']
      : mlType === 'classification'
      ? ['actual', 'predicted', 'correct']
      : ['cluster'];

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
              {headers.map((header) => {
                const isKeyColumn = keyColumns.includes(header);
                return (
                  <th
                    key={header}
                    className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isKeyColumn ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-500'
                    }`}
                  >
                    {header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previewData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                {headers.map((header) => {
                  const isKeyColumn = keyColumns.includes(header);
                  let cellClass = 'px-4 py-3 text-sm whitespace-nowrap';
                  let value = row[header];
                  
                  // Special formatting for key columns
                  if (mlType === 'regression' && header === 'error') {
                    const error = Math.abs(value || 0);
                    const isGood = error < (regressionStats?.meanError || Infinity);
                    cellClass += isGood ? ' text-green-700 font-medium bg-green-50' : ' text-red-700 font-medium bg-red-50';
                  } else if (mlType === 'classification' && header === 'correct') {
                    cellClass += value === 1 ? ' text-green-700 font-bold bg-green-50' : ' text-red-700 font-bold bg-red-50';
                    value = value === 1 ? '✓ Correct' : '✗ Wrong';
                  } else if (mlType === 'clustering' && header === 'cluster') {
                    const clusterColors = [
                      'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 
                      'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700',
                      'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700'
                    ];
                    cellClass += ` font-bold ${clusterColors[value % clusterColors.length]}`;
                    value = `Cluster ${value}`;
                  } else if (isKeyColumn) {
                    cellClass += ' bg-indigo-50 font-medium text-indigo-900';
                  } else {
                    cellClass += ' text-gray-900';
                  }
                  
                  return (
                    <td key={header} className={cellClass}>
                      {typeof value === 'number' && header !== 'correct' && header !== 'cluster'
                        ? value.toFixed(4) 
                        : String(value ?? '')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icon className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-bold">{getTitle()}</h2>
              <p className="text-sm opacity-90 mt-1">
                Model: {results.model_type.replace('_', ' ').toUpperCase()} • 
                {results.train_size && results.test_size && (
                  <> Train: {results.train_size} • Test: {results.test_size}</>
                )}
                {mlType === 'clustering' && ` ${results.metrics.n_clusters} clusters`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Model Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Model Configuration</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Features:</span>
                <span className="ml-2 font-medium">{results.feature_columns.join(', ')}</span>
              </div>
              {results.target_column && (
                <div>
                  <span className="text-gray-600">Target:</span>
                  <span className="ml-2 font-medium">{results.target_column}</span>
                </div>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h3>
            {renderMetrics()}
          </div>

          {/* Data Preview */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
              <span>Detailed Results (First 15 rows)</span>
              <span className="text-sm font-normal text-gray-500">
                Total: {data.length} rows
              </span>
            </h3>
            {renderDataPreview()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Total rows: {data.length}
          </div>
          <div className="flex space-x-3">
            {data.length > 0 && (
              <button
                onClick={downloadResults}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download Results</span>
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

