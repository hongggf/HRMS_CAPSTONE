import axios from 'axios';
import { apiClient } from './client';
import { ApiResponse, LoginResponseData, User } from '../types/api';

const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

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
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    return res.data.data;
  },
};
