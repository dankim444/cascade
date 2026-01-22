import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { ProjectsListPage } from './components/ProjectsListPage';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { SignInPage } from './components/SignInPage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route element={<AuthGuard />}>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsListPage />} />
        <Route path="/projects/:projectId" element={<ProjectWorkspaceWrapper />} />
      </Route>
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}

const ProjectWorkspaceWrapper: React.FC = () => {
  const { projectId } = useParams();

  if (!projectId) {
    return <Navigate to="/projects" replace />;
  }

  return <ProjectWorkspace projectId={projectId} />;
};

export default App;
