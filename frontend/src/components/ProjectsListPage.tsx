import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, Edit2, Database, GitBranch, BarChart3, LogOut, User, Clock, ChevronRight, Share2, Users, X } from 'lucide-react';
import { projectAPI } from '../services/projectAPI';
import { useAuthStore } from '../store/useAuthStore';
import type { Project, ProjectShare } from '../types';

export const ProjectsListPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Sharing state
  const [sharingProject, setSharingProject] = useState<Project | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit' | 'admin'>('view');
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const [updatingShareId, setUpdatingShareId] = useState<string | null>(null);
  const [projectShares, setProjectShares] = useState<ProjectShare[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const canManageShares = sharingProject?.isOwner !== false || sharingProject?.permission === 'admin';

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectAPI.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      setIsCreating(true);
      const project = await projectAPI.create({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });
      setProjects([project, ...projects]);
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !newProjectName.trim()) return;
    
    try {
      setIsCreating(true);
      const updated = await projectAPI.update(editingProject.id, {
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });
      setProjects(projects.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      setEditingProject(null);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"?\n\nThis will permanently delete all datasets, pipelines, and visualizations within this project. This action cannot be undone.`)) {
      return;
    }
    try {
      setDeletingId(projectId);
      await projectAPI.delete(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setNewProjectDescription(project.description || '');
  };

  const openShareModal = async (project: Project) => {
    setSharingProject(project);
    setShareEmail('');
    setSharePermission('view');
    setShareError('');
    
    // Load existing shares
    if (project.isOwner !== false) {
      try {
        setLoadingShares(true);
        const shares = await projectAPI.getShares(project.id);
        setProjectShares(shares);
      } catch (error) {
        console.error('Failed to load shares:', error);
        setProjectShares([]);
      } finally {
        setLoadingShares(false);
      }
    }
  };

  const handleShareProject = async () => {
    if (!sharingProject || !shareEmail.trim()) return;
    
    setShareError('');
    setIsSharing(true);
    
    try {
      await projectAPI.share(sharingProject.id, {
        email: shareEmail.trim(),
        permission: sharePermission,
      });
      
      // Refresh shares
      const shares = await projectAPI.getShares(sharingProject.id);
      setProjectShares(shares);
      setShareEmail('');
      setSharePermission('view');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to share project';
      setShareError(message);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!sharingProject) return;
    
    try {
      await projectAPI.removeShare(sharingProject.id, shareId);
      setProjectShares(projectShares.filter(s => s.id !== shareId));
    } catch (error) {
      console.error('Failed to remove share:', error);
      alert('Failed to remove share. Please try again.');
    }
  };

  const handleUpdateSharePermission = async (
    shareId: string,
    email: string,
    permission: 'view' | 'edit' | 'admin'
  ) => {
    if (!sharingProject) return;
    setShareError('');
    setUpdatingShareId(shareId);
    try {
      await projectAPI.updateShare(sharingProject.id, shareId, {
        email,
        permission,
      });
      setProjectShares(projectShares.map((share) => (
        share.id === shareId ? { ...share, permission } : share
      )));
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to update permission';
      setShareError(message);
    } finally {
      setUpdatingShareId(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Handle negative days (future dates) or very recent updates
    if (diffDays < 0) {
      return 'Just now';
    } else if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        if (diffMinutes === 0) {
          return 'Just now';
        }
        return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
      }
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-base">C</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">Cascade</h1>
                <p className="text-xs text-gray-500">Data Analytics Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {user && (
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{user.email}</span>
                </div>
              )}
              <button
                onClick={() => {
                  logout();
                  window.location.reload();
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Projects</h2>
            <p className="text-gray-600">Create and manage your data analysis projects</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-sm font-medium"
          >
            <Plus className="h-5 w-5" />
            <span>New Project</span>
          </button>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
              <FolderOpen className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first project to start uploading datasets, building transformation pipelines, and creating visualizations.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-sm font-medium"
            >
              <Plus className="h-5 w-5" />
              <span>Create Your First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`group bg-white rounded-2xl border hover:shadow-lg transition-all duration-300 overflow-hidden ${
                  project.isOwner === false 
                    ? 'border-purple-200 hover:border-purple-300' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}${location.search}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                      project.isOwner === false
                        ? 'bg-purple-50 border-purple-100'
                        : 'bg-blue-50 border-blue-100'
                    }`}>
                      {project.isOwner === false ? (
                        <Users className="h-6 w-6 text-purple-600" />
                      ) : (
                        <FolderOpen className="h-6 w-6 text-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {project.isOwner !== false && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openShareModal(project);
                            }}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Share project"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(project);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit project"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id, project.name);
                            }}
                            disabled={deletingId === project.id}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete project"
                          >
                            {deletingId === project.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <h3 className={`text-lg font-semibold mb-1 transition-colors ${
                    project.isOwner === false
                      ? 'text-gray-900 group-hover:text-purple-600'
                      : 'text-gray-900 group-hover:text-blue-600'
                  }`}>
                    {project.name}
                  </h3>
                  
                  {/* Shared indicator */}
                  {project.isOwner === false && (
                    <div className="flex items-center space-x-1.5 text-xs text-purple-600 mb-2">
                      <Users className="h-3.5 w-3.5" />
                      <span>Shared by {project.ownerEmail}</span>
                      <span className="px-1.5 py-0.5 bg-purple-100 rounded text-purple-700 capitalize">
                        {project.permission}
                      </span>
                    </div>
                  )}
                  
                  {project.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-1.5">
                      <Database className="h-4 w-4" />
                      <span>{project.datasetCount} datasets</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <GitBranch className="h-4 w-4" />
                      <span>{project.pipelineCount} pipelines</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <BarChart3 className="h-4 w-4" />
                      <span>{project.graphCount} graphs</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-1.5 text-xs text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                    <ChevronRight className={`h-5 w-5 transition-all ${
                      project.isOwner === false
                        ? 'text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1'
                        : 'text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1'
                    }`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Project Modal */}
      {(showCreateModal || editingProject) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {editingProject ? 'Update your project details' : 'Start a new data analysis project'}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Analysis Project"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Describe what this project is about..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingProject(null);
                  setNewProjectName('');
                  setNewProjectDescription('');
                }}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={editingProject ? handleUpdateProject : handleCreateProject}
                disabled={!newProjectName.trim() || isCreating}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isCreating ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>{editingProject ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  editingProject ? 'Update Project' : 'Create Project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Project Modal */}
      {sharingProject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Share Project
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Invite others to collaborate on "{sharingProject.name}"
                </p>
              </div>
              <button
                onClick={() => {
                  setSharingProject(null);
                  setShareEmail('');
                  setShareError('');
                  setProjectShares([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Share form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => {
                      setShareEmail(e.target.value);
                      setShareError('');
                    }}
                    placeholder="colleague@example.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permission Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['view', 'edit', 'admin'] as const).map((perm) => (
                      <button
                        key={perm}
                        onClick={() => setSharePermission(perm)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          sharePermission === perm
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {perm === 'view' && 'View Only'}
                        {perm === 'edit' && 'Can Edit'}
                        {perm === 'admin' && 'Admin'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {sharePermission === 'view' && 'Can view project contents but cannot make changes'}
                    {sharePermission === 'edit' && 'Can view and edit datasets, pipelines, and visualizations'}
                    {sharePermission === 'admin' && 'Full access including managing who the project is shared with'}
                  </p>
                </div>
                
                {shareError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {shareError}
                  </div>
                )}
                
                <button
                  onClick={handleShareProject}
                  disabled={!shareEmail.trim() || isSharing}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
                >
                  {isSharing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Sharing...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      <span>Share Project</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Existing shares */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  People with access
                </h4>
                
                {loadingShares ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-600 border-t-transparent"></div>
                  </div>
                ) : projectShares.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    This project hasn't been shared with anyone yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {projectShares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {share.sharedWithEmail}
                            </p>
                            <div className="mt-1">
                              <select
                                value={share.permission}
                                onChange={(e) => handleUpdateSharePermission(
                                  share.id,
                                  share.sharedWithEmail,
                                  e.target.value as 'view' | 'edit' | 'admin'
                                )}
                                disabled={!canManageShares || updatingShareId === share.id}
                                className="text-xs text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60"
                              >
                                <option value="view">View only</option>
                                <option value="edit">Can edit</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        {canManageShares && (
                          <button
                            onClick={() => handleRemoveShare(share.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove access"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
