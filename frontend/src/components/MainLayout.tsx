import React, { useState } from 'react';
import { PipelineLayout } from './PipelineLayout';
import { CascadeMark } from './CascadeLogo';

type Tab = 'pipeline' | 'visualizations';

export const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('pipeline');

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with Title and Tabs */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CascadeMark className="w-10 h-10 shrink-0 shadow-md" aria-hidden />
            <h1 className="text-2xl font-bold text-gray-900">Cascade</h1>
          </div>
          
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
        {activeTab === 'visualizations' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Visualizations</h2>
              <p className="text-gray-600">Graph creation interface coming soon...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
