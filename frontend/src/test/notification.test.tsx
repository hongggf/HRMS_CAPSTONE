import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { notificationApi } from '../api/notification';
import { NotificationCenter } from '../components/layout/NotificationCenter';
import { apiClient } from '../api/client';

describe('Notification API & NotificationCenter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('notificationApi.getNotifications returns parsed notifications array', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: [
        {
          id: 1,
          recipientId: 10,
          type: 'INFO',
          title: 'Welcome',
          message: 'Welcome to HRMS',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const res = await notificationApi.getNotifications();
    expect(res).toHaveLength(1);
    expect(res[0].title).toBe('Welcome');
  });

  it('notificationApi.getUnreadCount returns integer count', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: { count: 3 },
    });

    const count = await notificationApi.getUnreadCount();
    expect(count).toBe(3);
  });

  it('notificationApi.markAsRead issues POST to /notifications/:id/read', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: { success: true, count: 1 },
    });

    const res = await notificationApi.markAsRead(42);
    expect(postSpy).toHaveBeenCalledWith('/notifications/42/read');
    expect(res.success).toBe(true);
  });

  it('notificationApi.markAllAsRead issues POST to /notifications/mark-all-read', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: { success: true, count: 5 },
    });

    const res = await notificationApi.markAllAsRead();
    expect(postSpy).toHaveBeenCalledWith('/notifications/mark-all-read');
    expect(res.success).toBe(true);
  });

  it('renders NotificationCenter with unread badge count', async () => {
    vi.spyOn(notificationApi, 'getUnreadCount').mockResolvedValue(4);
    vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue([
      {
        id: 1,
        recipientId: 1,
        type: 'WARNING',
        title: 'Workforce Quota Warning',
        message: 'Engineering department exceeded quota',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationCenter />
      </QueryClientProvider>,
    );

    // Should display unread badge
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    // Click the bell button to open popover
    const bellBtn = screen.getByRole('button', {
      name: /notification center/i,
    });
    fireEvent.click(bellBtn);

    // Popover content should display notification
    await waitFor(() => {
      expect(screen.getByText('Workforce Quota Warning')).toBeInTheDocument();
      expect(
        screen.getByText('Engineering department exceeded quota'),
      ).toBeInTheDocument();
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });
  });
});
