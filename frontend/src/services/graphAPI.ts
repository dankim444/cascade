/**
 * Graph API service for interacting with the backend graph endpoints
 */

export interface GraphConfig {
  graph_type: string;
  x_column?: string;
  y_column?: string;
  color_column?: string;
  size_column?: string;
  aggregation?: string;
  title?: string;
  x_label?: string;
  y_label?: string;
  width: number;
  height: number;
  theme: string;
}

export interface GraphRequest {
  data_key: string;
  config: GraphConfig;
}

export interface Column {
  name: string;
  type: string;
}

export interface GraphType {
  type: string;
  name: string;
  description: string;
  fields: {
    [key: string]: {
      label: string;
      help: string;
      required: boolean;
    };
  };
}

export interface GraphTypesResponse {
  graph_types: GraphType[];
}

export interface ColumnsResponse {
  columns: Column[];
  numeric_columns: string[];
  categorical_columns: string[];
}

export interface GraphResponse {
  graph_json: string;
  graph_image?: string;
  config: GraphConfig;
  data_summary: any;
}

export interface SavedGraph {
  id: string;
  name: string;
  config: GraphConfig;
  data_key: string;
  project_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface SaveGraphRequest {
  name: string;
  config: GraphConfig;
  data_key: string;
  project_id?: string;
}

const API_BASE = 'http://localhost:8000/api/v1/graphs';

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = localStorage.getItem('cascade-auth-storage');
  if (token) {
    try {
      const authData = JSON.parse(token);
      if (authData.token) {
        headers['Authorization'] = `Bearer ${authData.token}`;
      }
    } catch (e) {
      // Invalid token format, ignore
    }
  }
  
  return headers;
}

export const graphAPI = {
  async getGraphTypes(): Promise<GraphTypesResponse> {
    const response = await fetch(`${API_BASE}/types`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch graph types');
    }
    return response.json();
  },

  async getColumns(dataKey: string): Promise<ColumnsResponse> {
    const response = await fetch(`${API_BASE}/columns/${dataKey}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch columns');
    }
    return response.json();
  },

  async generate(request: GraphRequest): Promise<GraphResponse> {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      let detail = 'Failed to generate graph';
      try {
        const errorBody = await response.json();
        detail = errorBody?.detail || detail;
      } catch {
        const errorText = await response.text();
        if (errorText) detail = errorText;
      }
      throw new Error(detail);
    }
    
    return response.json();
  },

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/test`, {
        headers: getAuthHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  // Saved graphs API
  async getSavedGraphs(projectId?: string): Promise<SavedGraph[]> {
    const url = projectId 
      ? `http://localhost:8000/api/v1/saved-graphs?project_id=${projectId}`
      : 'http://localhost:8000/api/v1/saved-graphs';
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch saved graphs');
    }
    return response.json();
  },

  async saveGraph(request: SaveGraphRequest): Promise<{id: string, message: string}> {
    const response = await fetch('http://localhost:8000/api/v1/saved-graphs', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to save graph: ${error}`);
    }
    
    return response.json();
  },

  async deleteSavedGraph(graphId: string): Promise<{message: string}> {
    const response = await fetch(`http://localhost:8000/api/v1/saved-graphs/${graphId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      let detail = 'Failed to delete graph';
      try {
        const errorBody = await response.json();
        detail = errorBody?.detail || detail;
      } catch {
        const errorText = await response.text();
        if (errorText) detail = errorText;
      }
      throw new Error(detail);
    }
    
    return response.json();
  },

  async updateSavedGraph(graphId: string, request: SaveGraphRequest): Promise<{message: string}> {
    const response = await fetch(`http://localhost:8000/api/v1/saved-graphs/${graphId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update graph: ${error}`);
    }
    
    return response.json();
  }
};
