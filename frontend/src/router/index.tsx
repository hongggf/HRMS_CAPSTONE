import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/login/LoginPage';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { RoleGuard } from '../components/auth/RoleGuard';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { TasksPage } from '../pages/tasks/TasksPage';
import { OrganizationPage } from '../pages/organization/OrganizationPage';
import { WorkforcePage } from '../pages/workforce/WorkforcePage';
import { RecruitmentPage } from '../pages/recruitment/RecruitmentPage';
import { EmployeePage } from '../pages/employees/EmployeePage';
import { AttendancePage } from '../pages/attendance/AttendancePage';
import { PayrollPage } from '../pages/payroll/PayrollPage';
import { PerformancePage } from '../pages/performance/PerformancePage';
import { LndPage } from '../pages/lnd/LndPage';
import { UsersPage } from '../pages/users/UsersPage';
import { AuditLogsPage } from '../pages/audit/AuditLogsPage';
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
          <RoleGuard
            requiredRoles={[
              'HEAD_OF_HR',
              'HR_RECRUITMENT',
              'HR_ADMIN',
              'HR_ATTENDANCE',
              'HR_PAYROLL',
              'HR_PERFORMANCE',
              'HR_LND',
            ]}
          >
            <DashboardPage />
          </RoleGuard>
        ),
      },
      {
        path: 'tasks',
        element: (
          <RoleGuard
            requiredRoles={[
              'HEAD_OF_HR',
              'HR_RECRUITMENT',
              'HR_ADMIN',
              'HR_ATTENDANCE',
              'HR_PAYROLL',
              'HR_PERFORMANCE',
              'HR_LND',
            ]}
          >
            <TasksPage />
          </RoleGuard>
        ),
      },
      {
        path: 'organization',
        element: (
          <RoleGuard requiredRoles={['HEAD_OF_HR', 'HR_ADMIN']}>
            <OrganizationPage />
          </RoleGuard>
        ),
      },
      {
        path: 'workforce',
        element: (
          <RoleGuard
            requiredRoles={['HEAD_OF_HR', 'HR_RECRUITMENT', 'HR_ADMIN']}
          >
            <WorkforcePage />
          </RoleGuard>
        ),
      },
      {
        path: 'recruitment',
        element: (
          <RoleGuard requiredRoles={['HEAD_OF_HR', 'HR_RECRUITMENT']}>
            <RecruitmentPage />
          </RoleGuard>
        ),
      },
      {
        path: 'employees',
        element: (
          <RoleGuard requiredRoles={['HEAD_OF_HR', 'HR_ADMIN']}>
            <EmployeePage />
          </RoleGuard>
        ),
      },
      {
        path: 'attendance',
        element: (
          <RoleGuard requiredRoles={['HEAD_OF_HR', 'HR_ATTENDANCE']}>
            <AttendancePage />
          </RoleGuard>
        ),
      },
      {
        path: 'payroll',
        element: (
          <RoleGuard requiredRoles={['HEAD_OF_HR', 'HR_PAYROLL']}>
            <PayrollPage />
          </RoleGuard>
        ),
      },
      {
        path: 'performance',
        element: (
          <RoleGuard requiredRoles={['HEAD_OF_HR', 'HR_PERFORMANCE']}>
            <PerformancePage />
          </RoleGuard>
        ),
      },
      {
        path: 'lnd',
        element: (
          <RoleGuard requiredRoles={['HEAD_OF_HR', 'HR_LND']}>
            <LndPage />
          </RoleGuard>
        ),
      },
      {
        path: 'users',
        element: (
          <RoleGuard requiredRoles={['HEAD_OF_HR', 'HR_ADMIN']}>
            <UsersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'audit-logs',
        element: (
          <RoleGuard requiredRoles={['HEAD_OF_HR', 'HR_ADMIN']}>
            <AuditLogsPage />
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
