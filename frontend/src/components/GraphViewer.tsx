import React, { useEffect, useRef } from 'react';
import type { GraphResponse } from '../services/graphAPI';

// Declare Plotly as a global variable
declare global {
  interface Window {
    Plotly: any;
  }
}

interface GraphViewerProps {
  graph: GraphResponse;
  onClose?: () => void;
  embedded?: boolean;
}

export const GraphViewer: React.FC<GraphViewerProps> = ({ graph, onClose, embedded = false }) => {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPlotlyAndRender = async () => {
      console.log('=== GraphViewer useEffect triggered ===');
      console.log('plotRef.current:', plotRef.current);
      console.log('graph:', graph);
      console.log('graph.graph_json exists:', !!graph?.graph_json);
      
      if (plotRef.current && graph?.graph_json) {
        try {
          console.log('Attempting to render graph...');
          console.log('Graph JSON length:', graph.graph_json.length);
          console.log('Graph JSON preview:', graph.graph_json.substring(0, 200));
          
          // Check if Plotly is already loaded
          if (!window.Plotly) {
            console.log('Loading Plotly from CDN...');
            // Load Plotly from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.plot.ly/plotly-2.26.0.min.js';
            script.async = true;
            
            await new Promise((resolve, reject) => {
              script.onload = () => {
                console.log('Plotly loaded successfully');
                resolve(undefined);
              };
              script.onerror = (error) => {
                console.error('Failed to load Plotly:', error);
                reject(error);
              };
              document.head.appendChild(script);
            });
          } else {
            console.log('Plotly already loaded');
          }

          console.log('Parsing graph JSON...');
          const plotData = JSON.parse(graph.graph_json);
          console.log('Plot data structure:', plotData);
          console.log('Plot data.data:', plotData.data);
          console.log('Plot data.layout:', plotData.layout);
          
          // Clear any existing plot and reset container
          if (plotRef.current) {
            console.log('Purging existing plot...');
            if (window.Plotly) {
              window.Plotly.purge(plotRef.current);
            }
            // Clear any existing content
            plotRef.current.innerHTML = '';
            // Ensure container has proper styling
            plotRef.current.style.width = '100%';
            plotRef.current.style.height = '500px';
            plotRef.current.style.minHeight = '500px';
          }
          
          // Create new plot
          console.log('Creating new plot with element:', plotRef.current);
          console.log('Plot container dimensions:', {
            width: plotRef.current.offsetWidth,
            height: plotRef.current.offsetHeight,
            clientWidth: plotRef.current.clientWidth,
            clientHeight: plotRef.current.clientHeight
          });
          
          await window.Plotly.newPlot(
            plotRef.current,
            plotData.data,
            {
              ...plotData.layout,
              autosize: true,
              width: undefined,  // Let it auto-size
              height: undefined  // Let it auto-size
            },
            {
              responsive: true,
              displayModeBar: true,
              modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
              displaylogo: false
            }
          );
          console.log('Plot created successfully!');
          
          // Check if plot was actually rendered
          setTimeout(() => {
            console.log('Post-render check - container innerHTML length:', plotRef.current?.innerHTML?.length || 0);
            console.log('Post-render check - container has children:', plotRef.current?.children?.length || 0);
          }, 100);
          
        } catch (error) {
          console.error('Error loading Plotly or rendering plot:', error);
          console.error('Error stack:', error.stack);
          // Fallback display
          if (plotRef.current) {
            plotRef.current.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px;">
                <div style="text-align: center; color: #6b7280;">
                  <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Graph Generated!</h3>
                  <p style="margin: 0 0 16px 0; font-size: 14px;">Error loading visualization: ${error.message}</p>
                  <p style="margin: 16px 0 0 0; font-size: 12px; color: #9ca3af;">
                    Graph type: ${graph.config?.graph_type} | Theme: ${graph.config?.theme}
                  </p>
                  <details style="margin-top: 16px; text-align: left; max-width: 400px;">
                    <summary style="cursor: pointer; color: #6b7280;">Debug Info</summary>
                    <pre style="font-size: 10px; background: #f3f4f6; padding: 8px; border-radius: 4px; overflow: auto; max-height: 200px;">
Error: ${error.message}
Stack: ${error.stack}
Graph JSON: ${graph.graph_json?.substring(0, 500)}...
                    </pre>
                  </details>
                </div>
              </div>
            `;
          }
        }
      } else {
        console.log('Conditions not met for rendering:');
        console.log('- plotRef.current exists:', !!plotRef.current);
        console.log('- graph exists:', !!graph);
        console.log('- graph.graph_json exists:', !!graph?.graph_json);
        
        if (plotRef.current) {
          plotRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 400px; color: #6b7280; background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px;">
              <div style="text-align: center;">
                <p style="margin: 0 0 8px 0;">No graph data available</p>
                <p style="font-size: 12px; color: #9ca3af;">
                  plotRef: ${!!plotRef.current} | graph: ${!!graph} | graph_json: ${!!graph?.graph_json}
                </p>
              </div>
            </div>
          `;
        }
      }
    };

    loadPlotlyAndRender();

    // Cleanup function
    return () => {
      if (plotRef.current && window.Plotly) {
        window.Plotly.purge(plotRef.current);
      }
    };
  }, [graph]);

  const handleDownload = () => {
    if (plotRef.current && window.Plotly) {
      window.Plotly.downloadImage(plotRef.current, {
        format: 'png',
        width: graph.config.width,
        height: graph.config.height,
        filename: graph.config.title || 'graph'
      });
    } else {
      alert('Plotly is not loaded. Please wait for the graph to render first.');
    }
  };

  if (embedded) {
    // Embedded version for use within layouts
    return (
      <div
        ref={plotRef}
        className="w-full h-full min-h-[500px]"
      />
    );
  }

  // Modal version for standalone use
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {graph.config.title || `${graph.config.graph_type.charAt(0).toUpperCase() + graph.config.graph_type.slice(1)} Chart`}
            </h2>
            <p className="text-sm text-gray-500 capitalize">
              {graph.config.graph_type.replace('_', ' ')} • {graph.config.theme.replace('_', ' ')}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download</span>
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Graph Display */}
        <div className="flex-1 p-6 overflow-auto">
          <div
            ref={plotRef}
            className="w-full h-full min-h-[500px]"
          />
        </div>
      </div>
    </div>
  );
};
