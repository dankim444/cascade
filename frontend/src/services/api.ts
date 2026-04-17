import axios from 'axios';
import { API_BASE_URL } from '../config/apiBase';

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
  dataKey?: string;
  projectId?: string;
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
  upload: async (file: File, projectId?: string): Promise<Dataset> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = projectId 
      ? `/api/datasets/upload?project_id=${projectId}`
      : '/api/datasets/upload';
    
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  getAll: async (projectId?: string): Promise<Dataset[]> => {
    const url = projectId 
      ? `/api/datasets?project_id=${projectId}`
      : '/api/datasets';
    const response = await api.get(url);
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

  rename: async (id: string, name: string): Promise<Dataset> => {
    const response = await api.patch(`/api/datasets/${id}`, { name });
    return response.data;
  },

  createFromExecutionOutput: async (payload: {
    outputDataKey: string;
    projectId: string;
    pipelineId?: string;
    pipelineName?: string;
    outputSchema?: unknown[];
    rowCount?: number;
  }): Promise<Dataset> => {
    const response = await api.post('/api/datasets/from-execution-output', {
      output_data_key: payload.outputDataKey,
      project_id: payload.projectId,
      pipeline_id: payload.pipelineId,
      pipeline_name: payload.pipelineName,
      output_schema: payload.outputSchema,
      row_count: payload.rowCount,
    });
    return response.data;
  },

  /** Full CSV from the executor's on-disk SQLite (not the API preview). */
  downloadExecutionOutputCsv: async (outputDataKey: string): Promise<Blob> => {
    const response = await api.get('/api/datasets/execution-output/csv', {
      params: { output_data_key: outputDataKey },
      responseType: 'blob',
      validateStatus: () => true,
    });
    if (response.status !== 200) {
      let msg = 'Download failed';
      if (response.data instanceof Blob) {
        try {
          const text = await response.data.text();
          const parsed = JSON.parse(text) as { detail?: string };
          if (typeof parsed.detail === 'string') {
            msg = parsed.detail;
          }
        } catch {
          /* ignore */
        }
      }
      throw new Error(msg);
    }
    return response.data as Blob;
  },

  /** Loads presigned S3 URL in a hidden iframe so the file downloads without opening a new tab. */
  downloadCsv: async (id: string, _displayName: string): Promise<void> => {
    const response = await api.get<{ url: string }>(`/api/datasets/${id}/download`);
    const url = response.data?.url;
    if (!url) {
      throw new Error('No download URL returned');
    }
    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;width:0;height:0;border:0;visibility:hidden;pointer-events:none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.title = 'Download';
    iframe.src = url;
    document.body.appendChild(iframe);
    window.setTimeout(() => {
      iframe.remove();
    }, 120_000);
  },

  importFromDynamoDB: async (payload: {
    tableName: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    endpointUrl?: string;
    limit?: number;
    datasetName?: string;
    projectId?: string;
  }): Promise<Dataset> => {
    const response = await api.post('/api/datasets/dynamodb/import', {
      table_name: payload.tableName,
      region: payload.region,
      access_key_id: payload.accessKeyId,
      secret_access_key: payload.secretAccessKey,
      session_token: payload.sessionToken,
      endpoint_url: payload.endpointUrl,
      limit: payload.limit,
      dataset_name: payload.datasetName,
      project_id: payload.projectId,
    });
    return response.data;
  },
};

export type PipelineValidationErrorItem = { nodeId: string; message: string };

export function formatPipelineValidationError(detail: unknown): string {
  if (detail == null) return 'Request failed';
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'object' && detail !== null && 'errors' in detail) {
    const d = detail as { message?: string; errors?: PipelineValidationErrorItem[] };
    const lines: string[] = [d.message || 'Validation failed'];
    if (d.errors?.length) {
      for (const e of d.errors) {
        lines.push(e.nodeId ? `[${e.nodeId}] ${e.message}` : e.message);
      }
    }
    return lines.join('\n');
  }
  return JSON.stringify(detail);
}

// Pipeline API
export const pipelineAPI = {
  save: async (pipeline: any): Promise<any> => {
    const response = await api.post('/api/pipelines/save', pipeline);
    return response.data;
  },

  commitNode: async (
    pipelineId: string,
    nodeId: string,
    node: Record<string, unknown>,
  ): Promise<any> => {
    const response = await api.post(`/api/pipelines/${pipelineId}/commit-node`, {
      node_id: nodeId,
      node,
    });
    return response.data;
  },

  getAll: async (projectId?: string): Promise<Pipeline[]> => {
    const url = projectId 
      ? `/api/pipelines?project_id=${projectId}`
      : '/api/pipelines';
    const response = await api.get(url);
    return response.data.pipelines;
  },

  getById: async (id: string): Promise<any> => {
    const response = await api.get(`/api/pipelines/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<any> => {
    const response = await api.delete(`/api/pipelines/${id}`);
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
