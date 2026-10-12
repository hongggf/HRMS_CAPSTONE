import axios from 'axios';
import { apiClient } from './client';
import { ApiResponse, LoginResponseData, User } from '../types/api';
import { useAuthStore } from '../store/useAuthStore';

const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const authApi = {
  login: async (
    email: string,
    password: string,
  ): Promise<LoginResponseData> => {
    const res = await apiClient.post<ApiResponse<LoginResponseData>>(
      '/auth/login',
      {
        email,
        password,
      },
    );
    return res.data.data;
  },

  refresh: async (
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken?: string }> => {
    const res = await axios.post<
      ApiResponse<{ accessToken: string; refreshToken?: string }>
    >(`${baseURL}/auth/refresh`, { refreshToken });
    return res.data.data;
  },

  logout: async (refreshToken: string): Promise<{ message?: string }> => {
    const res = await apiClient.post<ApiResponse<null>>('/auth/logout', {
      refreshToken,
    });
    return { message: res.data.message };
  },

  getMe: async (): Promise<User> => {
    const res =
      await apiClient.get<ApiResponse<{ user: User } | User>>('/auth/me');
    const data = res.data.data;
    if (data && typeof data === 'object' && 'user' in data) {
      return (data as { user: User }).user;
    }
    return data as User;
  },

  restoreSession: async (): Promise<boolean> => {
    const {
      refreshToken,
      accessToken,
      logout,
      setTokens,
      setUser,
      setInitializing,
    } = useAuthStore.getState();
    if (!refreshToken) {
      setInitializing(false);
      return false;
    }
    if (accessToken) {
      setInitializing(false);
      return true;
    }
    try {
      const data = await authApi.refresh(refreshToken);
      setTokens(data.accessToken, data.refreshToken);
      const profile = await authApi.getMe();
      setUser(profile);
      useAuthStore.setState({ isAuthenticated: true, isInitializing: false });
      return true;
    } catch {
      logout();
      setInitializing(false);
      return false;
    }
  },
};
