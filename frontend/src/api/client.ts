import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { ApiResponse, ApiErrorResponse, ApiErrorDetail } from '../types/api';

const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * Normalizes any error (AxiosError, Error, or unknown) into a standard shape
 * preserving documented validation details from backend if present.
 */
export const normalizeApiError = (
  err: unknown,
): { message: string; details?: ApiErrorDetail[] } => {
  if (axios.isAxiosError<ApiErrorResponse>(err)) {
    if (err.response?.data?.error) {
      return {
        message: err.response.data.error.message || 'An error occurred',
        details: err.response.data.error.details,
      };
    }
    if (err.code === 'ECONNABORTED') {
      return {
        message: 'Request timed out. Please check your network connection.',
      };
    }
    if (!err.response) {
      return {
        message: 'Network error. Please check your connection to the server.',
      };
    }
    return { message: err.message || 'HTTP request failed' };
  }

  if (err instanceof Error) {
    return { message: err.message };
  }

  return { message: 'An unexpected error occurred' };
};

// Mutex flag and queue for single-flight concurrent 401 refresh handling
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. Request Interceptor: Attach in-memory access token & preserve FormData
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Preserve multipart/form-data for document uploads (let browser set boundary)
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Response Interceptor: Validate response shape & handle single-flight refresh on 401
apiClient.interceptors.response.use(
  (response) => {
    // Validate response envelope: do not treat explicit backend error payload as success
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      response.data.success === false
    ) {
      return Promise.reject(
        new AxiosError(
          response.data.error?.message || 'Request was not successful',
          'ERR_BAD_RESPONSE',
          response.config,
          response.request,
          response,
        ),
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Exclude auth endpoints from refresh recursion (login, refresh, logout)
    if (
      !originalRequest ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/logout')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // Prevent infinite refresh loop: retry at most once
      if (originalRequest._retry) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Enqueue concurrent request and wait for the single active refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        isRefreshing = false;
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<
          ApiResponse<{ accessToken: string; refreshToken?: string }>
        >(`${baseURL}/auth/refresh`, { refreshToken });

        const newAccessToken = response.data.data.accessToken;
        const newRefreshToken = response.data.data.refreshToken || refreshToken;

        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
