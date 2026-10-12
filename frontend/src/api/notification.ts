import { apiClient } from './client';
import { NotificationItem } from '../types/api';

export const notificationApi = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await apiClient.get<NotificationItem[]>('/notifications');
    return Array.isArray(res.data) ? res.data : [];
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get<{ count: number }>('/notifications/unread');
    return res.data?.count ?? 0;
  },

  markAsRead: async (
    id: number,
  ): Promise<{ success: boolean; count: number }> => {
    const res = await apiClient.post<{ success: boolean; count: number }>(
      `/notifications/${id}/read`,
    );
    return res.data;
  },

  markAllAsRead: async (): Promise<{ success: boolean; count: number }> => {
    const res = await apiClient.post<{ success: boolean; count: number }>(
      '/notifications/mark-all-read',
    );
    return res.data;
  },
};
