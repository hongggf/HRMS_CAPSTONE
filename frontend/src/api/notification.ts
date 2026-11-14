import { apiClient } from './client';
import { NotificationItem } from '../types/api';

export const notificationApi = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await apiClient.get<
      NotificationItem[] | { data: NotificationItem[] }
    >('/notifications');
    const data = (res.data as any)?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get<{ count: number; unreadCount?: number }>(
      '/notifications/unread',
    );
    return res.data?.unreadCount ?? res.data?.count ?? 0;
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
