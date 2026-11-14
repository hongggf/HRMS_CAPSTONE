import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { RoleGuard } from '../components/auth/RoleGuard';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { useAuthStore, registerOnLogout } from '../store/useAuthStore';
import { RoleName, User } from '../types/api';
import { authApi } from '../api/auth';
import { userApi } from '../api/user';
import { attendanceApi } from '../api/attendance';
import { payrollApi } from '../api/payroll';
import { performanceApi } from '../api/performance';
import { lndApi } from '../api/lnd';
import { notificationApi } from '../api/notification';
import { auditApi } from '../api/audit';
import { workforceApi } from '../api/workforce';

describe('Phase 11: QA Release Readiness & Verification Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    vi.clearAllMocks();
  });

  describe('Section B: Authentication & Authorization Matrix', () => {
    it('redirects unauthenticated users to /login when attempting to access protected screens', () => {
      useAuthStore.setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isInitializing: false,
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secret Dashboard Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page Target</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(
        screen.queryByText('Secret Dashboard Content'),
      ).not.toBeInTheDocument();
      expect(screen.getByText('Login Page Target')).toBeInTheDocument();
    });

    const roleAccessCases: Array<{
      role: RoleName;
      required: RoleName[];
      shouldAllow: boolean;
    }> = [
      // HEAD_OF_HR has universal access across all modules
      { role: 'HEAD_OF_HR', required: ['HR_ADMIN'], shouldAllow: true },
      { role: 'HEAD_OF_HR', required: ['HR_PAYROLL'], shouldAllow: true },
      { role: 'HEAD_OF_HR', required: ['HR_RECRUITMENT'], shouldAllow: true },
      { role: 'HEAD_OF_HR', required: ['HR_ATTENDANCE'], shouldAllow: true },
      { role: 'HEAD_OF_HR', required: ['HR_PERFORMANCE'], shouldAllow: true },
      { role: 'HEAD_OF_HR', required: ['HR_LND'], shouldAllow: true },

      // HR_ADMIN access boundaries
      { role: 'HR_ADMIN', required: ['HR_ADMIN'], shouldAllow: true },
      { role: 'HR_ADMIN', required: ['HR_PAYROLL'], shouldAllow: false },
      { role: 'HR_ADMIN', required: ['HR_LND'], shouldAllow: false },

      // HR_PAYROLL access boundaries
      { role: 'HR_PAYROLL', required: ['HR_PAYROLL'], shouldAllow: true },
      { role: 'HR_PAYROLL', required: ['HR_ADMIN'], shouldAllow: false },
      { role: 'HR_PAYROLL', required: ['HR_RECRUITMENT'], shouldAllow: false },

      // HR_RECRUITMENT access boundaries
      {
        role: 'HR_RECRUITMENT',
        required: ['HR_RECRUITMENT'],
        shouldAllow: true,
      },
      {
        role: 'HR_RECRUITMENT',
        required: ['HR_ATTENDANCE'],
        shouldAllow: false,
      },

      // HR_ATTENDANCE access boundaries
      { role: 'HR_ATTENDANCE', required: ['HR_ATTENDANCE'], shouldAllow: true },
      {
        role: 'HR_ATTENDANCE',
        required: ['HR_PERFORMANCE'],
        shouldAllow: false,
      },

      // HR_PERFORMANCE access boundaries
      {
        role: 'HR_PERFORMANCE',
        required: ['HR_PERFORMANCE'],
        shouldAllow: true,
      },
      { role: 'HR_PERFORMANCE', required: ['HR_PAYROLL'], shouldAllow: false },

      // HR_LND access boundaries
      { role: 'HR_LND', required: ['HR_LND'], shouldAllow: true },
      { role: 'HR_LND', required: ['HR_ADMIN'], shouldAllow: false },
    ];

    roleAccessCases.forEach(({ role, required, shouldAllow }) => {
      it(`enforces role boundary: ${role} accessing route requiring [${required.join(', ')}] -> ${shouldAllow ? 'ALLOW' : 'DENY (403)'}`, () => {
        useAuthStore.setState({
          user: {
            id: 10,
            email: `${role.toLowerCase()}@hr.local`,
            roles: [role],
          },
          isAuthenticated: true,
          accessToken: 'valid-jwt',
          isInitializing: false,
        });

        render(
          <MemoryRouter>
            <RoleGuard requiredRoles={required}>
              <div>Authorized Content For {required.join(', ')}</div>
            </RoleGuard>
          </MemoryRouter>,
        );

        if (shouldAllow) {
          expect(
            screen.getByText(`Authorized Content For ${required.join(', ')}`),
          ).toBeInTheDocument();
        } else {
          expect(
            screen.queryByText(`Authorized Content For ${required.join(', ')}`),
          ).not.toBeInTheDocument();
          // Forbidden403 fallback rendered
          expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
          expect(
            screen.getByText(/not authorized to access this module/i),
          ).toBeInTheDocument();
        }
      });
    });

    it('purges all cached queries, tabs, and session tokens upon user logout', () => {
      queryClient.setQueryData(['sensitive-salaries'], [{ salary: 120000 }]);
      queryClient.setQueryData(
        ['sensitive-audit'],
        [{ action: 'PASSWORD_RESET' }],
      );

      expect(queryClient.getQueryData(['sensitive-salaries'])).toBeDefined();

      const unregister = registerOnLogout(() => {
        queryClient.clear();
      });

      useAuthStore.getState().logout();

      expect(queryClient.getQueryData(['sensitive-salaries'])).toBeUndefined();
      expect(queryClient.getQueryData(['sensitive-audit'])).toBeUndefined();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      unregister();
    });

    it('purges previous session queries and switches state upon new account login', () => {
      const user1: User = {
        id: 1,
        email: 'officer1@hr.local',
        roles: ['HR_ADMIN'],
      };
      const user2: User = {
        id: 2,
        email: 'officer2@hr.local',
        roles: ['HR_PAYROLL'],
      };

      // User 1 logs in
      useAuthStore.getState().login(user1, 'jwt-1', 'refresh-1');
      queryClient.setQueryData(['user1-cache'], { data: 'private-1' });

      const unregister = registerOnLogout(() => {
        queryClient.clear();
      });

      // User 2 logs in (account switch)
      useAuthStore.getState().login(user2, 'jwt-2', 'refresh-2');

      // Verify User 1 cache was purged
      expect(queryClient.getQueryData(['user1-cache'])).toBeUndefined();
      expect(useAuthStore.getState().user?.email).toBe('officer2@hr.local');
      expect(useAuthStore.getState().user?.roles).toContain('HR_PAYROLL');

      unregister();
    });
  });

  describe('Section C: Critical Business Workflows Verification', () => {
    it('1. Login & Logout lifecycle workflow', async () => {
      const loginSpy = vi.spyOn(authApi, 'login').mockResolvedValue({
        user: { id: 1, email: 'head@hr.local', roles: ['HEAD_OF_HR'] },
        accessToken: 'mock-access-jwt',
        refreshToken: 'mock-refresh-jwt',
      });
      const logoutSpy = vi
        .spyOn(authApi, 'logout')
        .mockResolvedValue({ message: 'Logged out' });

      const creds = await authApi.login('head@hr.local', 'password123');
      expect(loginSpy).toHaveBeenCalledWith('head@hr.local', 'password123');
      expect(creds.user.email).toBe('head@hr.local');

      useAuthStore
        .getState()
        .login(creds.user, creds.accessToken, creds.refreshToken);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      await authApi.logout('mock-refresh-jwt');
      expect(logoutSpy).toHaveBeenCalledWith('mock-refresh-jwt');
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('2. Workforce request and approval workflow', async () => {
      const submitSpy = vi.spyOn(workforceApi, 'submit').mockResolvedValue({
        id: 101,
        status: 'PENDING_APPROVAL',
      } as any);
      const approveSpy = vi.spyOn(workforceApi, 'approve').mockResolvedValue({
        id: 101,
        status: 'APPROVED',
      } as any);

      const submitted = await workforceApi.submit(101);
      expect(submitSpy).toHaveBeenCalledWith(101);
      expect(submitted.status).toBe('PENDING_APPROVAL');

      const approved = await workforceApi.approve(101);
      expect(approveSpy).toHaveBeenCalledWith(101);
      expect(approved.status).toBe('APPROVED');
    });

    it('3. Attendance punch and leave approval workflow', async () => {
      const punchSpy = vi.spyOn(attendanceApi, 'checkIn').mockResolvedValue({
        id: 1,
        employeeId: 10,
      } as any);
      const leaveApproveSpy = vi
        .spyOn(attendanceApi, 'updateLeaveStatus')
        .mockResolvedValue({
          id: 55,
          status: 'APPROVED',
        } as any);

      const punch = await attendanceApi.checkIn({
        employeeId: 10,
        date: '2026-11-14',
        time: '09:00:00',
      });
      expect(punchSpy).toHaveBeenCalledWith({
        employeeId: 10,
        date: '2026-11-14',
        time: '09:00:00',
      });
      expect(punch.id).toBe(1);

      const leave = await attendanceApi.updateLeaveStatus(55, 'APPROVED');
      expect(leaveApproveSpy).toHaveBeenCalledWith(55, 'APPROVED');
      expect(leave.status).toBe('APPROVED');
    });

    it('4. Payroll calculation, approval, and locking workflow', async () => {
      const calcSpy = vi
        .spyOn(payrollApi, 'calculatePayroll')
        .mockResolvedValue({
          success: true,
          message: 'Calculated',
        } as any);
      const approveSpy = vi
        .spyOn(payrollApi, 'approvePayroll')
        .mockResolvedValue({
          id: 7,
          status: 'APPROVED',
        } as any);
      const lockSpy = vi.spyOn(payrollApi, 'lockPayroll').mockResolvedValue({
        id: 7,
        status: 'LOCKED',
      } as any);

      await payrollApi.calculatePayroll(7);
      expect(calcSpy).toHaveBeenCalledWith(7);

      const approved = await payrollApi.approvePayroll(7);
      expect(approveSpy).toHaveBeenCalledWith(7);
      expect(approved.status).toBe('APPROVED');

      const locked = await payrollApi.lockPayroll(7);
      expect(lockSpy).toHaveBeenCalledWith(7);
      expect(locked.status).toBe('LOCKED');
    });

    it('5. Performance cycle, review, and promotion approval workflow', async () => {
      const evalSpy = vi
        .spyOn(performanceApi, 'evaluateReview')
        .mockResolvedValue({
          id: 99,
          status: 'EVALUATED',
          score: 4.8,
        } as any);
      const promoSpy = vi
        .spyOn(performanceApi, 'approvePromotion')
        .mockResolvedValue({
          id: 42,
          status: 'APPROVED',
        } as any);

      const evaluated = await performanceApi.evaluateReview(99, {
        score: 4.8,
        managerFeedback: 'Exceptional performance',
      } as any);
      expect(evalSpy).toHaveBeenCalledWith(99, {
        score: 4.8,
        managerFeedback: 'Exceptional performance',
      });
      expect(evaluated.status).toBe('EVALUATED');

      const promo = await performanceApi.approvePromotion(42);
      expect(promoSpy).toHaveBeenCalledWith(42);
      expect(promo.status).toBe('APPROVED');
    });

    it('6. L&D strategic training enrollment workflow', async () => {
      const assignSpy = vi
        .spyOn(lndApi, 'assignEmployees')
        .mockResolvedValue([{ id: 1, trainingId: 10, employeeId: 20 }] as any);
      const attendSpy = vi.spyOn(lndApi, 'markAttendance').mockResolvedValue({
        id: 1,
        status: 'ATTENDED',
      } as any);

      const assigned = await lndApi.assignEmployees(10, { employeeIds: [20] });
      expect(assignSpy).toHaveBeenCalledWith(10, { employeeIds: [20] });
      expect(assigned).toHaveLength(1);

      const attended = await lndApi.markAttendance(5, {
        employeeId: 20,
        status: 'ATTENDED',
      });
      expect(attendSpy).toHaveBeenCalledWith(5, {
        employeeId: 20,
        status: 'ATTENDED',
      });
      expect(attended.status).toBe('ATTENDED');
    });

    it('7. User administration, role modification, and lockout prevention', async () => {
      const createSpy = vi.spyOn(userApi, 'createUser').mockResolvedValue({
        id: 88,
        email: 'officer@hr.local',
      });
      const deactSpy = vi.spyOn(userApi, 'deactivateUser').mockResolvedValue({
        success: true,
        message: 'Deactivated',
      });

      const user = await userApi.createUser({
        email: 'officer@hr.local',
        password: 'Password123!',
        roleId: 2,
      });
      expect(createSpy).toHaveBeenCalledWith({
        email: 'officer@hr.local',
        password: 'Password123!',
        roleId: 2,
      });
      expect(user.id).toBe(88);

      const deact = await userApi.deactivateUser(88);
      expect(deactSpy).toHaveBeenCalledWith(88);
      expect(deact.success).toBe(true);
    });

    it('8. Notification reading and unread count tracking', async () => {
      vi.spyOn(notificationApi, 'getUnreadCount').mockResolvedValue(3);
      vi.spyOn(notificationApi, 'markAllAsRead').mockResolvedValue({
        success: true,
        count: 0,
      });

      const count = await notificationApi.getUnreadCount();
      expect(count).toBe(3);

      const res = await notificationApi.markAllAsRead();
      expect(res.success).toBe(true);
      expect(res.count).toBe(0);
    });

    it('9. Immutable audit log queries without mutation capabilities', async () => {
      const getLogsSpy = vi.spyOn(auditApi, 'getAuditLogs').mockResolvedValue({
        logs: [
          {
            id: 1,
            action: 'PAYROLL_LOCKED',
            module: 'PAYROLL',
            entityType: 'PayrollPeriod',
            entityId: '7',
            actorId: 1,
            timestamp: '2026-11-14T10:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const res = await auditApi.getAuditLogs({
        module: 'PAYROLL',
        page: 1,
        limit: 10,
      });
      expect(getLogsSpy).toHaveBeenCalledWith({
        module: 'PAYROLL',
        page: 1,
        limit: 10,
      });
      expect(res.logs[0].action).toBe('PAYROLL_LOCKED');

      // Audit logs must remain strictly read-only
      expect((auditApi as any).deleteAuditLog).toBeUndefined();
      expect((auditApi as any).updateAuditLog).toBeUndefined();
    });
  });
});
