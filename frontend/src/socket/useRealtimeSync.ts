import { useEffect, useRef } from 'react';
import { App as AntdApp } from 'antd';
import { useAuthStore } from '../store/useAuthStore';
import { queryClient } from '../queryClient';

interface WebSocketMessage<T = unknown> {
  type:
    | 'CONNECTED'
    | 'NOTIFICATION_CREATED'
    | 'DATA_MUTATION'
    | 'DASHBOARD_UPDATED';
  data: T;
  timestamp?: string;
}

interface NotificationPayload {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT';
}

interface DataMutationPayload {
  module: string;
  action: string;
  entityType?: string;
  entityId?: string;
}

export const useRealtimeSync = () => {
  const { notification } = AntdApp.useApp();
  const { isAuthenticated, accessToken } = useAuthStore();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.close(1000, 'User logged out');
        socketRef.current = null;
      }
      return;
    }

    // Determine WebSocket base URL from environment or current host
    const apiBase =
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    const wsUrlBase = apiBase
      .replace(/\/api\/v1\/?$/, '')
      .replace(/^http/, 'ws');
    const wsEndpoint = `${wsUrlBase}/ws?token=${encodeURIComponent(accessToken)}`;

    let isComponentMounted = true;

    const connect = () => {
      if (!isComponentMounted) return;

      try {
        const ws = new WebSocket(wsEndpoint);
        socketRef.current = ws;

        ws.onopen = () => {
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const parsed: WebSocketMessage = JSON.parse(event.data);

            switch (parsed.type) {
              case 'CONNECTED':
                break;

              case 'NOTIFICATION_CREATED': {
                const notif = parsed.data as NotificationPayload;
                // Pop real-time Ant Design toast notification
                notification.info({
                  message: notif.title || 'New HR Notification',
                  description: notif.message,
                  placement: 'topRight',
                  duration: 4.5,
                });
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
                queryClient.invalidateQueries({
                  queryKey: ['unread-notifications'],
                });
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                break;
              }

              case 'DASHBOARD_UPDATED':
                // Auto-refresh executive dashboard metrics without user reload
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                break;

              case 'DATA_MUTATION': {
                const mutation = parsed.data as DataMutationPayload;
                // Auto-refresh matching queries based on module
                switch (mutation.module) {
                  case 'ORGANIZATION':
                    queryClient.invalidateQueries({
                      queryKey: ['departments'],
                    });
                    queryClient.invalidateQueries({ queryKey: ['positions'] });
                    break;
                  case 'WORKFORCE':
                    queryClient.invalidateQueries({
                      queryKey: ['workforce-requests'],
                    });
                    break;
                  case 'RECRUITMENT':
                    queryClient.invalidateQueries({
                      queryKey: ['recruitment'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['requisitions'],
                    });
                    queryClient.invalidateQueries({ queryKey: ['postings'] });
                    queryClient.invalidateQueries({ queryKey: ['candidates'] });
                    queryClient.invalidateQueries({
                      queryKey: ['applications'],
                    });
                    break;
                  case 'EMPLOYEE':
                    queryClient.invalidateQueries({ queryKey: ['employees'] });
                    break;
                  case 'ATTENDANCE':
                  case 'LEAVE':
                  case 'OVERTIME':
                    queryClient.invalidateQueries({ queryKey: ['attendance'] });
                    queryClient.invalidateQueries({ queryKey: ['timesheets'] });
                    queryClient.invalidateQueries({ queryKey: ['leaves'] });
                    queryClient.invalidateQueries({ queryKey: ['overtime'] });
                    break;
                  case 'PAYROLL':
                    queryClient.invalidateQueries({ queryKey: ['payroll'] });
                    queryClient.invalidateQueries({
                      queryKey: ['payroll-periods'],
                    });
                    break;
                  case 'PERFORMANCE':
                  case 'PROMOTION':
                  case 'IMPROVEMENT':
                    queryClient.invalidateQueries({
                      queryKey: ['performance'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['performance-cycles'],
                    });
                    break;
                  case 'TRAINING':
                    queryClient.invalidateQueries({ queryKey: ['trainings'] });
                    queryClient.invalidateQueries({
                      queryKey: ['training-categories'],
                    });
                    break;
                  case 'USER':
                    queryClient.invalidateQueries({ queryKey: ['users'] });
                    break;
                  case 'SYSTEM':
                    queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
                    break;
                }
                // Always keep executive metrics up to date
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                break;
              }
            }
          } catch {
            // Ignore malformed WS frames safely
          }
        };

        ws.onclose = (event) => {
          socketRef.current = null;
          // Reconnect automatically if closed unexpectedly (unless logged out)
          if (
            isComponentMounted &&
            event.code !== 1000 &&
            event.code !== 4001
          ) {
            const nextDelay = Math.min(
              1000 * Math.pow(2, reconnectAttemptsRef.current),
              30000,
            );
            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(connect, nextDelay);
          }
        };

        ws.onerror = () => {
          // WebSocket error event handled via onclose
        };
      } catch {
        // Fallback reconnection
        if (isComponentMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      isComponentMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, accessToken, notification]);
};
