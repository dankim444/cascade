import React, { useState } from 'react';
import { PipelineLayout } from './components/PipelineLayout';
import { GraphsLayout } from './components/GraphsLayout';
import { AuthGuard } from './components/AuthGuard';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'visualizations'>('pipeline');

  return (
    <AuthGuard>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header with Title and Tabs */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900">
              Cascade
            </h1>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'pipeline'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Pipeline
              </button>
              <button
                onClick={() => setActiveTab('visualizations')}
                className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'visualizations'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Visualizations
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {activeTab === 'pipeline' && <PipelineLayout />}
          {activeTab === 'visualizations' && <GraphsLayout />}
        </main>
      </div>
    </AuthGuard>
  );
}

export default App;
