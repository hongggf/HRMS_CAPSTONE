import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/login/LoginPage';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { RoleGuard } from '../components/auth/RoleGuard';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { NotFound404 } from '../pages/error/NotFound404';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <RoleGuard requiredRoles={['HEAD_OF_HR']}>
            <DashboardPage />
          </RoleGuard>
        ),
      },
      {
        path: '*',
        element: <NotFound404 />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound404 />,
  },
]);
