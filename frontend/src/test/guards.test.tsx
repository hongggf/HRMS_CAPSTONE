import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { RoleGuard } from '../components/auth/RoleGuard';
import { useAuthStore } from '../store/useAuthStore';
import { RoleName } from '../types/api';

describe('Route & RBAC Guards', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    localStorage.clear();
  });

  describe('ProtectedRoute', () => {
    it('redirects unauthenticated users to /login', () => {
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/login" element={<div>Login Page View</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Secret Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Login Page View')).toBeInTheDocument();
      expect(
        screen.queryByText('Secret Protected Content'),
      ).not.toBeInTheDocument();
    });

    it('renders protected child component when authenticated', () => {
      useAuthStore
        .getState()
        .login(
          { id: 1, email: 'head@hr.local', roles: ['HEAD_OF_HR'] },
          'valid-access',
          'valid-refresh',
        );

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Secret Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Secret Protected Content')).toBeInTheDocument();
    });

    it('displays loading spinner while session is initializing', () => {
      useAuthStore.setState({
        isInitializing: true,
        isAuthenticated: false,
        accessToken: null,
      });

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <div>Secret Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

      expect(screen.getByText(/Verifying secure session/i)).toBeInTheDocument();
      expect(
        screen.queryByText('Secret Protected Content'),
      ).not.toBeInTheDocument();
    });
  });

  describe('RoleGuard', () => {
    it('renders fallback when user is unauthenticated or null', () => {
      render(
        <MemoryRouter>
          <RoleGuard requiredRoles={['HR_PAYROLL']}>
            <div>Confidential Payroll Ledger</div>
          </RoleGuard>
        </MemoryRouter>,
      );

      expect(
        screen.queryByText('Confidential Payroll Ledger'),
      ).not.toBeInTheDocument();
      // Default fallback is Forbidden403 which renders 403 Forbidden status
      expect(screen.getByText(/403/i)).toBeInTheDocument();
    });

    it('renders fallback when user has unauthorized role', () => {
      useAuthStore
        .getState()
        .login(
          { id: 2, email: 'recruiter@hr.local', roles: ['HR_RECRUITMENT'] },
          'recruiter-access',
          'recruiter-refresh',
        );

      render(
        <MemoryRouter>
          <RoleGuard
            requiredRoles={['HR_PAYROLL']}
            fallback={<div>Custom 403 Forbidden Screen</div>}
          >
            <div>Confidential Payroll Ledger</div>
          </RoleGuard>
        </MemoryRouter>,
      );

      expect(
        screen.queryByText('Confidential Payroll Ledger'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText('Custom 403 Forbidden Screen'),
      ).toBeInTheDocument();
    });

    it('renders child content when user has the exact matching role', () => {
      useAuthStore
        .getState()
        .login(
          { id: 3, email: 'payroll@hr.local', roles: ['HR_PAYROLL'] },
          'payroll-access',
          'payroll-refresh',
        );

      render(
        <MemoryRouter>
          <RoleGuard requiredRoles={['HR_PAYROLL']}>
            <div>Confidential Payroll Ledger</div>
          </RoleGuard>
        </MemoryRouter>,
      );

      expect(
        screen.getByText('Confidential Payroll Ledger'),
      ).toBeInTheDocument();
    });

    it('always permits HEAD_OF_HR as the master administrative role', () => {
      useAuthStore
        .getState()
        .login(
          { id: 1, email: 'head@hr.local', roles: ['HEAD_OF_HR'] },
          'head-access',
          'head-refresh',
        );

      render(
        <MemoryRouter>
          <RoleGuard requiredRoles={['HR_ATTENDANCE', 'HR_PERFORMANCE']}>
            <div>Restricted Department Settings</div>
          </RoleGuard>
        </MemoryRouter>,
      );

      expect(
        screen.getByText('Restricted Department Settings'),
      ).toBeInTheDocument();
    });

    it('denies unknown or fabricated roles by default', () => {
      useAuthStore.getState().login(
        {
          id: 99,
          email: 'hacker@hr.local',
          roles: ['UNKNOWN_ROLE' as RoleName],
        },
        'fake-access',
        'fake-refresh',
      );

      render(
        <MemoryRouter>
          <RoleGuard
            requiredRoles={['HR_ADMIN']}
            fallback={<div>Access Denied</div>}
          >
            <div>Admin Panel</div>
          </RoleGuard>
        </MemoryRouter>,
      );

      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('denies access by default when requiredRoles is empty', () => {
      useAuthStore.getState().login(
        {
          id: 5,
          email: 'admin@hr.local',
          roles: ['HR_ADMIN'],
        },
        'admin-access',
        'admin-refresh',
      );

      render(
        <MemoryRouter>
          <RoleGuard requiredRoles={[]} fallback={<div>Fallback Blocked</div>}>
            <div>Sensitive Screen</div>
          </RoleGuard>
        </MemoryRouter>,
      );

      expect(screen.queryByText('Sensitive Screen')).not.toBeInTheDocument();
      expect(screen.getByText('Fallback Blocked')).toBeInTheDocument();
    });

    it('conceals unauthorized action buttons when fallback is null', () => {
      useAuthStore.getState().login(
        {
          id: 6,
          email: 'recruiter@hr.local',
          roles: ['HR_RECRUITMENT'],
        },
        'recruiter-access',
        'recruiter-refresh',
      );

      render(
        <MemoryRouter>
          <div>
            <h1>Payroll Controls</h1>
            <RoleGuard requiredRoles={['HR_PAYROLL']} fallback={null}>
              <button>Lock Payroll Period</button>
            </RoleGuard>
          </div>
        </MemoryRouter>,
      );

      expect(screen.getByText('Payroll Controls')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Lock Payroll Period/i }),
      ).not.toBeInTheDocument();
    });

    it('renders action buttons for authorized roles', () => {
      useAuthStore.getState().login(
        {
          id: 7,
          email: 'payroll@hr.local',
          roles: ['HR_PAYROLL'],
        },
        'payroll-access',
        'payroll-refresh',
      );

      render(
        <MemoryRouter>
          <div>
            <RoleGuard requiredRoles={['HR_PAYROLL']} fallback={null}>
              <button>Lock Payroll Period</button>
            </RoleGuard>
          </div>
        </MemoryRouter>,
      );

      expect(
        screen.getByRole('button', { name: /Lock Payroll Period/i }),
      ).toBeInTheDocument();
    });
  });
});
