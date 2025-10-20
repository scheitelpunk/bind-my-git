import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getToken, logout, forceRefreshToken, isTokenExpiringSoon } from './keycloak';
import type { PaginatedResponse } from '@/types';

// Track retry attempts to prevent infinite loops
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Create axios instance with enhanced configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000, // Increased timeout for better UX
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Enable automatic JSON parsing
  responseType: 'json',
  // Handle XSRF
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Enhanced request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Add request timestamp for debugging
    (config as any).metadata = { startTime: new Date() };

    const token = getToken();
    if (token) {
      // Check if token is expiring soon and refresh if needed
      if (isTokenExpiringSoon(120)) { // Refresh if expiring within 2 minutes
        try {
          await forceRefreshToken();
          const newToken = getToken();
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
        } catch (error) {
          console.warn('Token refresh failed in request interceptor:', error);
          config.headers.Authorization = `Bearer ${token}`;
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with retry logic
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Add response time for performance monitoring
    if ((response.config as any).metadata?.startTime) {
      const duration = new Date().getTime() - (response.config as any).metadata.startTime.getTime();
      console.debug(`API ${response.config.method?.toUpperCase()} ${response.config.url} completed in ${duration}ms`);
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle network errors
    if (!error.response) {
      const networkError = new Error('Network error. Please check your connection.');
      networkError.name = 'NetworkError';
      return Promise.reject(networkError);
    }

    // Handle 401 errors with token refresh
    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (token) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await forceRefreshToken();
        const newToken = getToken();

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('No token after refresh');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        const sessionError = new Error('Session expired. Please login again.');
        sessionError.name = 'SessionExpired';
        return Promise.reject(sessionError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 errors
    if (error.response.status === 403) {
      const accessError = new Error('Access denied. You do not have permission to perform this action.');
      accessError.name = 'AccessDenied';
      return Promise.reject(accessError);
    }

    // Handle 404 errors
    if (error.response.status === 404) {
      const notFoundError = new Error('The requested resource was not found.');
      notFoundError.name = 'NotFound';
      return Promise.reject(notFoundError);
    }

    // Handle 422 validation errors
    if (error.response.status === 422) {
      const validationData = error.response.data as any;
      const validationError = new Error(validationData?.detail || 'Validation error occurred.');
      validationError.name = 'ValidationError';
      (validationError as any).validationErrors = validationData;
      return Promise.reject(validationError);
    }

    // Handle 500 server errors
    if (error.response.status >= 500) {
      const serverError = new Error('Server error. Please try again later.');
      serverError.name = 'ServerError';
      return Promise.reject(serverError);
    }

    // Extract error message from response
    const errorMessage =
      (error.response.data as any)?.detail ||
      (error.response.data as any)?.message ||
      error.response.statusText ||
      'An unexpected error occurred.';

    const apiError = new Error(errorMessage);
    apiError.name = 'APIError';
    (apiError as any).status = error.response.status;
    (apiError as any).data = error.response.data;

    return Promise.reject(apiError);
  }
);

// Enhanced API methods with better error handling
export const api = {
  // GET request
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.get<T>(url, config).then(response => {
      // Handle different response structures
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return (response.data as any).data;
      }
      return response.data;
    });
  },

  // POST request
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.post<T>(url, data, config).then(response => {
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return (response.data as any).data;
      }
      return response.data;
    });
  },

  // PUT request
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.put<T>(url, data, config).then(response => {
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return (response.data as any).data;
      }
      return response.data;
    });
  },

  // PATCH request
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.patch<T>(url, data, config).then(response => {
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return (response.data as any).data;
      }
      return response.data;
    });
  },

  // DELETE request
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.delete<T>(url, config).then(response => {
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return (response.data as any).data;
      }
      return response.data;
    });
  },

  // Paginated GET request
  getPaginated: <T>(url: string, config?: AxiosRequestConfig): Promise<PaginatedResponse<T>> => {
    return apiClient.get<PaginatedResponse<T>>(url, config).then(response => response.data);
  },

  // Raw request (returns full axios response)
  raw: (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    return apiClient.request(config);
  },

  // Upload file with progress
  upload: <T>(url: string, formData: FormData, onUploadProgress?: (progressEvent: any) => void): Promise<T> => {
    return apiClient.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    }).then(response => {
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return (response.data as any).data;
      }
      return response.data;
    });
  },

  // Download file
  download: (url: string, filename?: string, config?: AxiosRequestConfig): Promise<Blob> => {
    return apiClient.get(url, {
      ...config,
      responseType: 'blob',
    }).then(response => {
      // Create download link if filename provided
      if (filename) {
        const blob = new Blob([response.data]);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }
      return response.data;
    });
  },
};

// Auth-specific API methods
export const authApi = {
  // Get current user info
  getUserInfo: () => api.get('/auth/user'),

  // Check if user has role
  checkRole: (role: string) => api.get(`/auth/check/${role}`),

  // Get user roles
  getUserRoles: () => api.get('/auth/roles'),

  // Logout
  logout: () => api.post('/auth/logout'),
};

// Utility functions for API client
export const setAuthToken = (token: string) => {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const clearAuthToken = () => {
  delete apiClient.defaults.headers.common['Authorization'];
};

export const getBaseURL = () => {
  return apiClient.defaults.baseURL;
};

export const updateBaseURL = (baseURL: string) => {
  apiClient.defaults.baseURL = baseURL;
};

// Export the raw axios instance for advanced use cases
export { apiClient };
export default api;