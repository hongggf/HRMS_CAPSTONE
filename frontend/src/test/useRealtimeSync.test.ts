import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRealtimeSync } from '../socket/useRealtimeSync';
import { useAuthStore } from '../store/useAuthStore';
import { queryClient } from '../queryClient';

// Mock Ant Design App notification
const mockNotification = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => ({
        notification: mockNotification,
        message: {},
        modal: {},
      }),
    },
  };
});

interface MockSocket {
  url: string;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  onerror: (() => void) | null;
  readyState: number;
  close: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

describe('useRealtimeSync WebSocket hook', () => {
  let mockWebSocketInstances: MockSocket[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
    mockWebSocketInstances = [];

    // Mock global WebSocket class
    class MockWebSocket implements MockSocket {
      public url: string;
      public onopen: (() => void) | null = null;
      public onmessage: ((event: { data: string }) => void) | null = null;
      public onclose: ((event: { code: number }) => void) | null = null;
      public onerror: (() => void) | null = null;
      public readyState = 1;

      constructor(url: string) {
        this.url = url;
        mockWebSocketInstances.push(this);
      }

      public close = vi.fn();
      public send = vi.fn();
    }

    (globalThis as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;
  });

  it('does not open WebSocket when user is not authenticated', () => {
    renderHook(() => useRealtimeSync());
    expect(mockWebSocketInstances).toHaveLength(0);
  });

  it('opens WebSocket with Bearer token query param when authenticated', () => {
    useAuthStore
      .getState()
      .login(
        { id: 1, email: 'head@hr.local', roles: ['HEAD_OF_HR'] },
        'sample-jwt-token',
        'sample-refresh',
      );

    renderHook(() => useRealtimeSync());

    expect(mockWebSocketInstances).toHaveLength(1);
    expect(mockWebSocketInstances[0].url).toContain('token=sample-jwt-token');
  });

  it('invalidates dashboard query on DASHBOARD_UPDATED message', () => {
    useAuthStore
      .getState()
      .login(
        { id: 1, email: 'head@hr.local', roles: ['HEAD_OF_HR'] },
        'sample-jwt-token',
        'sample-refresh',
      );

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useRealtimeSync());
    const ws = mockWebSocketInstances[0];

    // Simulate incoming DASHBOARD_UPDATED frame
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'DASHBOARD_UPDATED',
        data: {},
      }),
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('displays notification toast and invalidates queries on NOTIFICATION_CREATED', () => {
    useAuthStore
      .getState()
      .login(
        { id: 1, email: 'head@hr.local', roles: ['HEAD_OF_HR'] },
        'sample-jwt-token',
        'sample-refresh',
      );

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useRealtimeSync());
    const ws = mockWebSocketInstances[0];

    // Simulate incoming NOTIFICATION_CREATED frame
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'NOTIFICATION_CREATED',
        data: {
          id: 10,
          title: 'Request Approved',
          message: 'Your headcount request was approved',
          type: 'SUCCESS',
        },
      }),
    });

    expect(mockNotification.info).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Request Approved',
        description: 'Your headcount request was approved',
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('invalidates module specific queries on DATA_MUTATION', () => {
    useAuthStore
      .getState()
      .login(
        { id: 1, email: 'head@hr.local', roles: ['HEAD_OF_HR'] },
        'sample-jwt-token',
        'sample-refresh',
      );

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useRealtimeSync());
    const ws = mockWebSocketInstances[0];

    // Simulate DATA_MUTATION for WORKFORCE
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'DATA_MUTATION',
        data: {
          module: 'WORKFORCE',
          action: 'WORKFORCE_CREATED',
        },
      }),
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workforce-requests'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });
});
