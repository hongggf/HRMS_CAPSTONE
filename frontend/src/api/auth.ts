import { apiClient } from './client';
import { ApiResponse, LoginResponseData, User } from '../types/api';

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

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    return res.data.data;
  },
};
