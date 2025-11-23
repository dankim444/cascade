import axios from 'axios';

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
}

interface NodeData {
  label: string;
  type: 'data' | 'transform';
  operation?: string;
  config?: Record<string, any>;
  inputSchema?: { columns: Column[] };
  outputSchema?: { columns: Column[] };
}

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface Pipeline {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: Date;
  updatedAt: Date;
}

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
      // Clear auth data and redirect to login
      localStorage.removeItem('cascade-auth-storage');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Dataset API
export const datasetAPI = {
  upload: async (file: File): Promise<Dataset> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  getAll: async (): Promise<Dataset[]> => {
    const response = await api.get('/api/datasets');
    return response.data.datasets;
  },

  getById: async (id: string): Promise<Dataset> => {
    const response = await api.get(`/api/datasets/${id}`);
    return response.data;
  },

  getPreview: async (id: string, limit: number = 10): Promise<any> => {
    const response = await api.get(`/api/datasets/${id}/preview?limit=${limit}`);
    return response.data;
  },

  delete: async (id: string): Promise<any> => {
    const response = await api.delete(`/api/datasets/${id}`);
    return response.data;
  },
};

// Pipeline API
export const pipelineAPI = {
  save: async (pipeline: any): Promise<any> => {
    const response = await api.post('/api/pipelines/save', pipeline);
    return response.data;
  },

  getAll: async (): Promise<Pipeline[]> => {
    const response = await api.get('/api/pipelines');
    return response.data.pipelines;
  },

  getById: async (id: string): Promise<Pipeline> => {
    const response = await api.get(`/api/pipelines/${id}`);
    return response.data;
  },

  execute: async (pipeline: any): Promise<any> => {
    const response = await api.post('/api/transformations/run', pipeline);
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;
