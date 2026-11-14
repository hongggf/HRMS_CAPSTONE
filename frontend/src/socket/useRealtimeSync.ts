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
                  queryKey: ['notifications-unread'],
                });
                queryClient.invalidateQueries({
                  queryKey: ['unread-notifications'],
                });
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                break;
              }

              case 'DASHBOARD_UPDATED':
                // Auto-refresh executive dashboard metrics without user reload
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                queryClient.invalidateQueries({
                  queryKey: ['dashboard-metrics'],
                });
                break;

              case 'DATA_MUTATION': {
                const mutation = parsed.data as DataMutationPayload;
                // Auto-refresh matching queries based on module
                switch (mutation.module) {
                  case 'ORGANIZATION':
                    queryClient.invalidateQueries({
                      queryKey: ['departments'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['departments-list'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['departments-filter'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['departments-select'],
                    });
                    queryClient.invalidateQueries({ queryKey: ['positions'] });
                    queryClient.invalidateQueries({
                      queryKey: ['positions-list'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['positions-select'],
                    });
                    break;
                  case 'WORKFORCE':
                  case 'TASK':
                    queryClient.invalidateQueries({
                      queryKey: ['workforce-requests'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['unified-tasks'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['dashboard-metrics'],
                    });
                    break;
                  case 'RECRUITMENT':
                    queryClient.invalidateQueries({
                      queryKey: ['recruitment'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['requisitions'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['recruitment-requisitions'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['approved-requisitions-for-posting'],
                    });
                    queryClient.invalidateQueries({ queryKey: ['postings'] });
                    queryClient.invalidateQueries({
                      queryKey: ['recruitment-postings'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['published-job-postings'],
                    });
                    queryClient.invalidateQueries({ queryKey: ['candidates'] });
                    queryClient.invalidateQueries({
                      queryKey: ['recruitment-candidates'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['candidates-for-application-select'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['applications'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['recruitment-applications'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['interview-eligible-applications'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['approved-applications-select'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['recruitment-interviews'],
                    });
                    break;
                  case 'EMPLOYEE':
                    queryClient.invalidateQueries({ queryKey: ['employees'] });
                    queryClient.invalidateQueries({
                      queryKey: ['employees-list'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['employee-detail'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['employees-directory'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['employees-for-attendance'],
                    });
                    break;
                  case 'ATTENDANCE':
                  case 'LEAVE':
                  case 'OVERTIME':
                    queryClient.invalidateQueries({ queryKey: ['attendance'] });
                    queryClient.invalidateQueries({
                      queryKey: ['attendance-records'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['attendance-report'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['attendance-audit-logs'],
                    });
                    queryClient.invalidateQueries({ queryKey: ['timesheets'] });
                    queryClient.invalidateQueries({
                      queryKey: ['timesheets-list'],
                    });
                    queryClient.invalidateQueries({ queryKey: ['leaves'] });
                    queryClient.invalidateQueries({
                      queryKey: ['leave-requests-list'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['leave-types-list'],
                    });
                    queryClient.invalidateQueries({ queryKey: ['overtime'] });
                    queryClient.invalidateQueries({
                      queryKey: ['overtime-requests-list'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['shifts-list'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['employee-shifts-list'],
                    });
                    break;
                  case 'PAYROLL':
                    queryClient.invalidateQueries({ queryKey: ['payroll'] });
                    queryClient.invalidateQueries({
                      queryKey: ['payroll-periods'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['payroll-records'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['payroll-reports'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['payroll-report'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['my-payslips'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['payslip-detail'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['employee-payslips'],
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
                    queryClient.invalidateQueries({
                      queryKey: ['performance-reviews'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['promotions'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['goals'],
                    });
                    break;
                  case 'TRAINING':
                    queryClient.invalidateQueries({ queryKey: ['trainings'] });
                    queryClient.invalidateQueries({
                      queryKey: ['training-categories'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['training-plans'],
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
