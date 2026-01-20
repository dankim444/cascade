import React, { useState } from 'react';
import { AuthGuard } from './components/AuthGuard';
import { ProjectsListPage } from './components/ProjectsListPage';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import './App.css';

function App() {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  return (
    <AuthGuard>
      {currentProjectId ? (
        <ProjectWorkspace 
          projectId={currentProjectId} 
          onBack={() => setCurrentProjectId(null)} 
        />
      ) : (
        <ProjectsListPage onSelectProject={setCurrentProjectId} />
      )}
    </AuthGuard>
  );
}

export default App;
