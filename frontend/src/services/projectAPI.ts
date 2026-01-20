import axios from 'axios';
import type { Project, ProjectDetails, ProjectShare } from '../types';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cascade-auth-storage');
  if (token) {
    try {
      const authData = JSON.parse(token);
      if (authData.token) {
        config.headers.Authorization = `Bearer ${authData.token}`;
      }
    } catch (e) {
      // Invalid token format, ignore
    }
  }
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cascade-auth-storage');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export interface CreateProjectData {
  name: string;
  description?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
}

export interface ShareProjectData {
  email: string;
  permission: 'view' | 'edit' | 'admin';
}

export interface ShareResponse {
  id: string;
  email: string;
  permission: string;
  sharedAt: string;
  message: string;
}

export const projectAPI = {
  // Get all projects for current user (owned and shared)
  getAll: async (): Promise<Project[]> => {
    const response = await api.get('/api/projects');
    return response.data.projects;
  },

  // Get a specific project with all its contents
  getById: async (projectId: string): Promise<ProjectDetails> => {
    const response = await api.get(`/api/projects/${projectId}`);
    return response.data;
  },

  // Create a new project
  create: async (data: CreateProjectData): Promise<Project> => {
    const response = await api.post('/api/projects', data);
    return response.data;
  },

  // Update a project
  update: async (projectId: string, data: UpdateProjectData): Promise<Project> => {
    const response = await api.put(`/api/projects/${projectId}`, data);
    return response.data;
  },

  // Delete a project
  delete: async (projectId: string): Promise<void> => {
    await api.delete(`/api/projects/${projectId}`);
  },

  // Share a project with another user by email
  share: async (projectId: string, data: ShareProjectData): Promise<ShareResponse> => {
    const response = await api.post(`/api/projects/${projectId}/share`, data);
    return response.data;
  },

  // Get all shares for a project
  getShares: async (projectId: string): Promise<ProjectShare[]> => {
    const response = await api.get(`/api/projects/${projectId}/shares`);
    return response.data.shares;
  },

  // Update a share's permission
  updateShare: async (projectId: string, shareId: string, data: ShareProjectData): Promise<ShareResponse> => {
    const response = await api.put(`/api/projects/${projectId}/shares/${shareId}`, data);
    return response.data;
  },

  // Remove a share (unshare project with a user)
  removeShare: async (projectId: string, shareId: string): Promise<void> => {
    await api.delete(`/api/projects/${projectId}/shares/${shareId}`);
  },
};

export default projectAPI;

