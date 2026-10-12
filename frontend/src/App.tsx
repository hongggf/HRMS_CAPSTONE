import React from 'react';
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useThemeStore } from './store/useThemeStore';
import { useAuthStore } from './store/useAuthStore';
import { authApi } from './api/auth';
import { queryClient } from './queryClient';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const App: React.FC = () => {
  const { mode } = useThemeStore();
  const { refreshToken, accessToken } = useAuthStore();

  // Proactively restore session and refresh token on initial application load
  React.useEffect(() => {
    if (refreshToken && !accessToken) {
      authApi.restoreSession().catch(() => {});
    }
  }, [refreshToken, accessToken]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            algorithm:
              mode === 'dark'
                ? antdTheme.darkAlgorithm
                : antdTheme.defaultAlgorithm,
            token: {
              colorPrimary: '#1677ff',
              borderRadius: 6,
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            },
          }}
        >
          <AntdApp>
            <RouterProvider router={router} />
          </AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
