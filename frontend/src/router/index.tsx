import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/login/LoginPage';
import { AdminLayout } from '../components/layout/AdminLayout';
import { EmployeeLayout } from '../components/layout/EmployeeLayout';
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
import { DataLogsPage } from '../pages/datalogs/DataLogsPage';
import { NotFound404 } from '../pages/error/NotFound404';
import { EmployeeLoginPage } from '../pages/employee/EmployeeLoginPage';
import { EmployeeActivatePage } from '../pages/employee/EmployeeActivatePage';
import { EmployeeDashboardPage } from '../pages/employee/EmployeeDashboardPage';
import { EmployeePayslipsPage } from '../pages/employee/EmployeePayslipsPage';
import { EmployeeLearningPage } from '../pages/employee/EmployeeLearningPage';
import { useAuthStore } from '../store/useAuthStore';

const RootRedirect: React.FC = () => {
  const { user } = useAuthStore();
  const isEmployeeOnly =
    user?.roles?.includes('EMPLOYEE') &&
    !user.roles.some((r) => r.startsWith('HR_') || r === 'HEAD_OF_HR');

  if (isEmployeeOnly) {
    return <Navigate to="/employee/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/employee/login',
    element: <EmployeeLoginPage />,
  },
  {
    path: '/employee/activate',
    element: <EmployeeActivatePage />,
  },
  {
    path: '/employee',
    element: (
      <ProtectedRoute>
        <EmployeeLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/employee/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <RoleGuard requiredRoles={['EMPLOYEE', 'HEAD_OF_HR']}>
            <EmployeeDashboardPage />
          </RoleGuard>
        ),
      },
      {
        path: 'payslips',
        element: (
          <RoleGuard requiredRoles={['EMPLOYEE', 'HEAD_OF_HR']}>
            <EmployeePayslipsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'learning',
        element: (
          <RoleGuard requiredRoles={['EMPLOYEE', 'HEAD_OF_HR']}>
            <EmployeeLearningPage />
          </RoleGuard>
        ),
      },
    ],
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
        element: <RootRedirect />,
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
        path: 'data-logs',
        element: (
          <RoleGuard
            requiredRoles={[
              'HEAD_OF_HR',
              'HR_ADMIN',
              'HR_RECRUITMENT',
              'HR_ATTENDANCE',
              'HR_PAYROLL',
              'HR_PERFORMANCE',
              'HR_LND',
            ]}
          >
            <DataLogsPage />
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
