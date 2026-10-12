import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, accessToken, isInitializing, setInitializing } =
    useAuthStore();
  const location = useLocation();

  // Safety fallback: never keep user stuck on initializing screen indefinitely
  React.useEffect(() => {
    if (isInitializing) {
      const timer = setTimeout(() => {
        setInitializing(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isInitializing, setInitializing]);

  if (isInitializing) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: 16,
          backgroundColor: '#001529',
        }}
      >
        <Spin size="large" />
        <span style={{ color: '#8c8c8c', fontSize: 14 }}>
          Verifying secure session...
        </span>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
