import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useDataLogStore } from '../store/useDataLogStore';
import { ApiResponse, ApiErrorDetail } from '../types/api';

const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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
  if (axios.isCancel(err) || (err as AxiosError)?.code === 'ERR_CANCELED') {
    return {
      message: 'Request was cancelled',
    };
  }

  if (axios.isAxiosError<any>(err)) {
    if (err.response?.data?.error) {
      const errObj = err.response.data.error;
      const message =
        typeof errObj === 'string'
          ? errObj
          : errObj.message || (typeof errObj === 'object' ? JSON.stringify(errObj) : 'An error occurred');
      return {
        message,
        details: typeof errObj === 'object' ? errObj.details : undefined,
      };
    }
    if (err.response?.data?.message) {
      return {
        message: err.response.data.message,
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

/**
 * Logs intercepted API network traffic to the client-side data log store.
 */
const logApiResponse = (
  config?: InternalAxiosRequestConfig | any,
  response?: any,
  error?: any,
) => {
  try {
    const startTime = (config as any)?._requestStartTime || Date.now();
    const durationMs = Date.now() - startTime;
    const method = ((config?.method as string) || 'GET').toUpperCase();
    const url = (config?.url as string) || '';
    const status = response?.status || error?.response?.status || (error ? 500 : 200);
    const statusText =
      response?.statusText ||
      error?.response?.statusText ||
      (error ? 'Error' : 'OK');
    const isError = Boolean(error) || status >= 400 || status === 0;

    let parsedReqData = config?.data;
    if (typeof parsedReqData === 'string') {
      try {
        parsedReqData = JSON.parse(parsedReqData);
      } catch {
        // Keep string if not valid JSON
      }
    }

    useDataLogStore.getState().addLog({
      method,
      url,
      status,
      statusText,
      durationMs,
      requestData: parsedReqData,
      queryParams: config?.params,
      responseData: response?.data ?? error?.response?.data ?? null,
      isError,
      errorMessage: error ? error.message || 'Request failed' : null,
    });
  } catch {
    // Non-blocking logger safeguard
  }
};

// 1. Request Interceptor: Attach in-memory access token & preserve FormData
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    (config as any)._requestStartTime = Date.now();

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
    logApiResponse(response.config, response, null);

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
    logApiResponse(error.config, null, error);

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
              originalRequest._retry = true;
              if (!originalRequest.headers) {
                originalRequest.headers =
                  {} as unknown as InternalAxiosRequestConfig['headers'];
              }
              originalRequest.headers.Authorization = `Bearer ${token}`;
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
