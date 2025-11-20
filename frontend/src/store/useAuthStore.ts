import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

// Simple localStorage persistence helper
const loadFromStorage = (): Partial<AuthState> => {
  try {
    const stored = localStorage.getItem('cascade-auth-storage');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load auth from storage:', e);
  }
  return {};
};

const saveToStorage = (state: Partial<AuthState>) => {
  try {
    localStorage.setItem('cascade-auth-storage', JSON.stringify({
      token: state.token,
      user: state.user,
      isAuthenticated: state.isAuthenticated,
    }));
  } catch (e) {
    console.error('Failed to save auth to storage:', e);
  }
};

export const useAuthStore = create<AuthState>()((set, get) => {
  // Load initial state from storage
  const stored = loadFromStorage();
  
  return {
    user: stored.user || null,
    token: stored.token || null,
    isAuthenticated: stored.isAuthenticated || false,
    isLoading: false,
    error: null,

    login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('http://localhost:8000/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: email,
              password: password,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Login failed');
          }

          const data = await response.json();
          
          const newState = {
            user: data.user,
            token: data.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          };
          set(newState);
          saveToStorage(newState);
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
            isAuthenticated: false,
          });
          throw error;
        }
      },

      register: async (email: string, password: string, fullName?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('http://localhost:8000/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              full_name: fullName || null,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Registration failed');
          }

          // After registration, automatically log in
          await get().login(email, password);
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Registration failed',
          });
          throw error;
        }
      },

      logout: () => {
        const newState = {
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        };
        set(newState);
        saveToStorage(newState);
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await fetch('http://localhost:8000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Not authenticated');
          }

          const user = await response.json();
          const newState = {
            user,
            isAuthenticated: true,
            isLoading: false,
          };
          set(newState);
          saveToStorage(newState);
        } catch (error) {
          const newState = {
            isAuthenticated: false,
            token: null,
            user: null,
            isLoading: false,
          };
          set(newState);
          saveToStorage(newState);
        }
      },

      clearError: () => {
        set({ error: null });
      },
    };
  }
);

