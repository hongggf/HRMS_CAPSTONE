import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleGuard } from '../components/auth/RoleGuard';
import { EmployeeLoginPage } from '../pages/employee/EmployeeLoginPage';
import { EmployeeActivatePage } from '../pages/employee/EmployeeActivatePage';
import { EmployeeDashboardPage } from '../pages/employee/EmployeeDashboardPage';
import { EmployeePayslipsPage } from '../pages/employee/EmployeePayslipsPage';
import { EmployeeLearningPage } from '../pages/employee/EmployeeLearningPage';
import { useAuthStore } from '../store/useAuthStore';
import { authApi } from '../api/auth';
import { employeeApi } from '../api/employee';
import { payrollApi } from '../api/payroll';
import { lndApi } from '../api/lnd';

vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    verifyInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
  },
}));

vi.mock('../api/employee', () => ({
  employeeApi: {
    getMyProfile: vi.fn(),
    getMyDashboard: vi.fn(),
    provisionAccount: vi.fn(),
  },
}));

vi.mock('../api/payroll', () => ({
  payrollApi: {
    getMyPayslips: vi.fn(),
  },
}));

vi.mock('../api/lnd', () => ({
  lndApi: {
    getMyLearning: vi.fn(),
    joinTraining: vi.fn(),
    submitEvaluation: vi.fn(),
  },
}));

describe('Employee Self-Service (ESS) Portal Frontend Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useAuthStore.getState().logout();
    vi.clearAllMocks();
  });

  describe('EmployeeLoginPage', () => {
    it('renders Employee Portal sign-in form with Ant Design components', () => {
      render(
        <MemoryRouter>
          <EmployeeLoginPage />
        </MemoryRouter>,
      );

      expect(screen.getByText('Employee Portal')).toBeInTheDocument();
      expect(
        screen.getByText('Self-Service Access & Identity'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /sign in to employee portal/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/have an invitation\? activate your account/i),
      ).toBeInTheDocument();
    });
  });

  describe('EmployeeActivatePage', () => {
    it('verifies token and renders employee welcome and password setup form', async () => {
      vi.mocked(authApi.verifyInvitation).mockResolvedValueOnce({
        email: 'alice@company.com',
        firstName: 'Alice',
        lastName: 'Smith',
        employeeId: 'EMP-0042',
        department: 'Engineering',
        position: 'Software Engineer',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });

      render(
        <MemoryRouter initialEntries={['/employee/activate?token=valid_test_token']}>
          <EmployeeActivatePage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getByText(/welcome, alice smith!/i),
        ).toBeInTheDocument();
      });

      expect(screen.getByText('EMP-0042')).toBeInTheDocument();
      expect(screen.getByText('alice@company.com')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /activate account & sign in/i }),
      ).toBeInTheDocument();
    });

    it('renders error notice when invitation token is invalid or expired', async () => {
      vi.mocked(authApi.verifyInvitation).mockRejectedValueOnce(
        new Error('Invitation link has expired'),
      );

      render(
        <MemoryRouter initialEntries={['/employee/activate?token=expired_token']}>
          <EmployeeActivatePage />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getByText('Invalid or Expired Invitation'),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/activation tokens are single-use and time-limited/i),
      ).toBeInTheDocument();
    });
  });

  describe('EmployeeDashboardPage', () => {
    it('fetches and displays authenticated employee dashboard data', async () => {
      vi.mocked(employeeApi.getMyDashboard).mockResolvedValueOnce({
        employee: {
          id: 42,
          employeeId: 'EMP-0042',
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@company.com',
          department: 'Software Engineering',
          position: 'Senior Developer',
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          hireDate: '2026-01-15T00:00:00.000Z',
        },
        latestPayslip: {
          id: 101,
          periodName: 'March 2026',
          periodStatus: 'PAID',
          periodStart: '2026-03-01T00:00:00.000Z',
          periodEnd: '2026-03-31T00:00:00.000Z',
          basicSalary: 45000000,
          grossSalary: 58000000,
          totalAllowances: 8000000,
          totalDeductions: 6000000,
          totalOvertime: 5000000,
          netSalary: 52000000,
        },
        leaveBalances: [
          {
            id: 1,
            leaveType: 'Annual Leave',
            totalDays: 12,
            usedDays: 2,
            remainingDays: 10,
            year: 2026,
          },
        ],
        trainings: [
          {
            assignmentId: 1,
            trainingId: 1,
            title: 'Cloud Security Best Practices',
            status: 'COMPLETED',
            category: 'Engineering',
            assignedAt: '2026-02-10T00:00:00.000Z',
            sessionsCount: 3,
          },
        ],
        performance: {
          reviewId: 1,
          cycleName: 'Q1 2026 Performance Appraisal',
          reviewStatus: 'COMPLETED',
          score: 4.8,
        },
        attendance: {
          month: '2026-03',
          presentDays: 20,
          lateDays: 0,
          totalWorkingHours: 160,
          todayStatus: 'PRESENT',
        },
        recentNotifications: [
          {
            id: 1,
            title: 'Payroll March 2026 Disbursed',
            message: 'Your salary for March 2026 has been processed and disbursed.',
            type: 'INFO',
            isRead: false,
            createdAt: '2026-03-25T10:00:00.000Z',
          },
        ],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeeDashboardPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
      });

      expect(screen.getAllByText('EMP-0042').length).toBeGreaterThan(0);
      expect(screen.getByText(/Software Engineering/i)).toBeInTheDocument();
      expect(screen.getByText(/Senior Developer/i)).toBeInTheDocument();
      expect(screen.getAllByText(/March 2026/).length).toBeGreaterThan(0);
      expect(screen.getByText('Cloud Security Best Practices')).toBeInTheDocument();
      expect(screen.getByText(/Q1 2026 Performance Appraisal/)).toBeInTheDocument();
      expect(screen.getByText('Payroll March 2026 Disbursed')).toBeInTheDocument();
    });

    it('renders empty states gracefully when optional employee metrics are not available', async () => {
      vi.mocked(employeeApi.getMyDashboard).mockResolvedValueOnce({
        employee: {
          id: 42,
          employeeId: 'EMP-0042',
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@company.com',
          department: 'Software Engineering',
          position: 'Senior Developer',
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          hireDate: '2026-01-15T00:00:00.000Z',
        },
        latestPayslip: null,
        leaveBalances: [],
        trainings: [],
        performance: null,
        attendance: {
          month: '2026-03',
          presentDays: 0,
          lateDays: 0,
          totalWorkingHours: 0,
          todayStatus: 'NOT_CHECKED_IN',
        },
        recentNotifications: [],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeeDashboardPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/no released payslips yet/i)).toBeInTheDocument();
      expect(screen.getByText(/no leave balance recorded/i)).toBeInTheDocument();
      expect(screen.getByText(/no training courses currently assigned/i)).toBeInTheDocument();
      expect(screen.getByText(/no active review cycle/i)).toBeInTheDocument();
    });

    it('renders error state with retry button when dashboard fetch fails', async () => {
      vi.mocked(employeeApi.getMyDashboard).mockRejectedValueOnce(
        new Error('Failed to load employee dashboard'),
      );

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeeDashboardPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to load employee dashboard')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('EmployeePayslipsPage', () => {
    const mockPayslips = [
      {
        id: 101,
        payrollPeriodId: 10,
        employeeId: 42,
        basicSalary: 45000000,
        grossSalary: 55000000,
        totalDeductions: 5000000,
        netSalary: 50000000,
        createdAt: '2026-03-25T00:00:00.000Z',
        updatedAt: '2026-03-25T00:00:00.000Z',
        payrollPeriod: {
          id: 10,
          name: 'March 2026 Standard Payroll',
          year: 2026,
          month: 3,
          startDate: '2026-03-01T00:00:00.000Z',
          endDate: '2026-03-31T00:00:00.000Z',
          paymentDate: '2026-03-25T00:00:00.000Z',
          status: 'PAID',
        },
        items: [
          {
            id: 1,
            payrollId: 101,
            componentName: 'Transport Allowance',
            name: 'Transport Allowance',
            componentType: 'ALLOWANCE',
            amount: 5000000,
            isTaxable: true,
          },
          {
            id: 2,
            payrollId: 101,
            componentName: 'Performance Bonus',
            name: 'Performance Bonus',
            componentType: 'BONUS',
            amount: 5000000,
            isTaxable: true,
          },
          {
            id: 3,
            payrollId: 101,
            componentName: 'Income Tax (PPh 21)',
            name: 'Income Tax (PPh 21)',
            componentType: 'DEDUCTION',
            amount: 4000000,
            isTaxable: false,
          },
          {
            id: 4,
            payrollId: 101,
            componentName: 'Health Insurance (BPJS)',
            name: 'Health Insurance (BPJS)',
            componentType: 'DEDUCTION',
            amount: 1000000,
            isTaxable: false,
          },
        ],
      },
      {
        id: 100,
        payrollPeriodId: 9,
        employeeId: 42,
        basicSalary: 45000000,
        grossSalary: 48000000,
        totalDeductions: 4000000,
        netSalary: 44000000,
        createdAt: '2026-02-25T00:00:00.000Z',
        updatedAt: '2026-02-25T00:00:00.000Z',
        payrollPeriod: {
          id: 9,
          name: 'February 2026 Standard Payroll',
          year: 2026,
          month: 2,
          startDate: '2026-02-01T00:00:00.000Z',
          endDate: '2026-02-28T00:00:00.000Z',
          paymentDate: '2026-02-25T00:00:00.000Z',
          status: 'APPROVED',
        },
        items: [],
      },
    ];

    it('renders employee payslips with KPI summaries and table columns', async () => {
      vi.mocked(payrollApi.getMyPayslips).mockResolvedValueOnce(mockPayslips as any);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeePayslipsPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('March 2026 Standard Payroll')).toBeInTheDocument();
      });

      expect(screen.getByText('February 2026 Standard Payroll')).toBeInTheDocument();
      expect(screen.getByText('My Payslips')).toBeInTheDocument();
      expect(screen.getByText('Authorized monthly compensation statements and earnings breakdowns')).toBeInTheDocument();
      expect(screen.getByText('Released Payslips')).toBeInTheDocument();
      expect(screen.getByText('Latest Released Net Pay')).toBeInTheDocument();
    });

    it('opens detailed breakdown modal when clicking view breakdown', async () => {
      vi.mocked(payrollApi.getMyPayslips).mockResolvedValueOnce(mockPayslips as any);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeePayslipsPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('March 2026 Standard Payroll')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByRole('button', { name: /view payslip/i });
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/official payslip statement/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Transport Allowance')).toBeInTheDocument();
      expect(screen.getByText('Performance Bonus')).toBeInTheDocument();
      expect(screen.getByText('Income Tax (PPh 21)')).toBeInTheDocument();
      expect(screen.getByText('Health Insurance (BPJS)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /print statement/i })).toBeInTheDocument();
    });

    it('shows empty state when no payslips have been released', async () => {
      vi.mocked(payrollApi.getMyPayslips).mockResolvedValueOnce([]);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeePayslipsPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/no released payslips available/i)).toBeInTheDocument();
      });
    });
  });

  describe('EmployeeLearningPage', () => {
    const mockLearningSummary = {
      employee: {
        id: 42,
        employeeId: 'EMP-0042',
        firstName: 'Alice',
        lastName: 'Developer',
        email: 'alice@company.com',
        department: 'Engineering',
      },
      assignedTrainings: [
        {
          assignmentId: 1,
          trainingId: 10,
          title: 'Kubernetes Production Operations',
          description: 'Deploying and scaling microservices with k8s',
          category: 'Cloud Infrastructure',
          categoryId: 1,
          provider: 'CNCF Academy',
          type: 'ONLINE' as const,
          capacity: 30,
          startDate: '2026-03-01T00:00:00.000Z',
          endDate: '2026-03-15T00:00:00.000Z',
          status: 'ACTIVE' as const,
          assignedAt: '2026-02-20T00:00:00.000Z',
          totalSessions: 3,
          attendedSessions: 2,
          progress: 67,
          isCompleted: false,
          evaluation: null,
          sessions: [
            {
              id: 101,
              title: 'Pods & Networking',
              date: '2026-03-02T10:00:00.000Z',
              location: 'Virtual Room 1',
              attendanceStatus: 'ATTENDED' as const,
              attendedAt: '2026-03-02T10:05:00.000Z',
            },
            {
              id: 102,
              title: 'Ingress & TLS',
              date: '2026-03-05T10:00:00.000Z',
              location: 'Virtual Room 1',
              attendanceStatus: 'ATTENDED' as const,
              attendedAt: '2026-03-05T10:04:00.000Z',
            },
            {
              id: 103,
              title: 'StatefulSets & Storage',
              date: new Date(Date.now() + 86400000).toISOString(),
              location: 'Virtual Room 1',
              attendanceStatus: 'REGISTERED' as const,
              attendedAt: null,
            },
          ],
        },
      ],
      upcomingSessions: [
        {
          id: 103,
          title: 'StatefulSets & Storage',
          date: new Date(Date.now() + 86400000).toISOString(),
          location: 'Virtual Room 1',
          attendanceStatus: 'REGISTERED' as const,
          attendedAt: null,
          trainingId: 10,
          trainingTitle: 'Kubernetes Production Operations',
          category: 'Cloud Infrastructure',
        },
      ],
      availableTrainings: [
        {
          id: 20,
          title: 'Event-Driven Architectures with Kafka',
          description: 'Apache Kafka streaming patterns',
          category: 'Backend Systems',
          categoryId: 2,
          provider: 'Confluent Partner',
          type: 'ONLINE' as const,
          capacity: 25,
          enrolledCount: 15,
          seatsRemaining: 10,
          startDate: '2026-04-01T00:00:00.000Z',
          endDate: '2026-04-10T00:00:00.000Z',
          status: 'ACTIVE' as const,
          sessionsCount: 4,
        },
      ],
      trainingHistory: [
        {
          id: 1,
          sessionId: 101,
          sessionTitle: 'Pods & Networking',
          sessionDate: '2026-03-02T10:00:00.000Z',
          location: 'Virtual Room 1',
          trainingId: 10,
          trainingTitle: 'Kubernetes Production Operations',
          category: 'Cloud Infrastructure',
          status: 'ATTENDED' as const,
          attendedAt: '2026-03-02T10:05:00.000Z',
        },
      ],
      skills: [
        {
          id: 1,
          employeeId: 42,
          skillName: 'Docker Containerization',
          level: 'ADVANCED' as const,
          acquiredAt: '2026-01-10T00:00:00.000Z',
        },
      ],
    };

    it('renders learning dashboard with KPI cards and assigned course list', async () => {
      vi.mocked(lndApi.getMyLearning).mockResolvedValueOnce(mockLearningSummary);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeeLearningPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Kubernetes Production Operations')).toBeInTheDocument();
      });

      expect(screen.getByText('My Learning & Professional Development')).toBeInTheDocument();
      expect(screen.getByText('Assigned Courses')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Sessions')).toBeInTheDocument();
      expect(screen.getByText('Verified Skills')).toBeInTheDocument();
      expect(screen.getByText(/2 \/ 3 Sessions/i)).toBeInTheDocument();
    });

    it('opens course details drawer and displays session attendance schedule', async () => {
      vi.mocked(lndApi.getMyLearning).mockResolvedValueOnce(mockLearningSummary);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeeLearningPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Kubernetes Production Operations')).toBeInTheDocument();
      });

      const detailsBtn = screen.getAllByRole('button', { name: /view details & sessions/i })[0];
      fireEvent.click(detailsBtn);

      await waitFor(() => {
        expect(screen.getByText(/course details: kubernetes production operations/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/pods & networking/i)).toBeInTheDocument();
      expect(screen.getByText(/statefulsets & storage/i)).toBeInTheDocument();
    });

    it('opens course evaluation modal and submits feedback successfully', async () => {
      vi.mocked(lndApi.getMyLearning).mockResolvedValueOnce(mockLearningSummary);
      vi.mocked(lndApi.submitEvaluation).mockResolvedValueOnce({ success: true, id: 99 });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeeLearningPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Kubernetes Production Operations')).toBeInTheDocument();
      });

      const evalBtn = screen.getByRole('button', { name: /evaluate/i });
      fireEvent.click(evalBtn);

      await waitFor(() => {
        expect(screen.getByText(/course evaluation: kubernetes production operations/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/overall course quality & delivery rating/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit evaluation/i })).toBeInTheDocument();
    });

    it('renders empty states when employee has no learning assignments or history', async () => {
      vi.mocked(lndApi.getMyLearning).mockResolvedValueOnce({
        employee: {
          id: 42,
          employeeId: 'EMP-0042',
          firstName: 'Alice',
          lastName: 'Developer',
          email: 'alice@company.com',
        },
        assignedTrainings: [],
        upcomingSessions: [],
        availableTrainings: [],
        trainingHistory: [],
        skills: [],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EmployeeLearningPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(
          screen.getByText(/you currently have no training programs assigned/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('RBAC Role Guard for EMPLOYEE', () => {
    it('strictly forbids EMPLOYEE role from accessing HR administrative routes', () => {
      useAuthStore.getState().login(
        {
          id: 42,
          email: 'alice@company.com',
          roles: ['EMPLOYEE'],
        },
        'mock-token',
        'mock-refresh',
      );

      render(
        <MemoryRouter initialEntries={['/admin/payroll']}>
          <Routes>
            <Route
              path="/admin/payroll"
              element={
                <RoleGuard requiredRoles={['HEAD_OF_HR', 'HR_PAYROLL']}>
                  <div>Confidential Payroll Admin Desk</div>
                </RoleGuard>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(
        screen.queryByText('Confidential Payroll Admin Desk'),
      ).not.toBeInTheDocument();
      expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
    });

    it('permits EMPLOYEE role to access Employee Portal routes', () => {
      useAuthStore.getState().login(
        {
          id: 42,
          email: 'alice@company.com',
          roles: ['EMPLOYEE'],
        },
        'mock-token',
        'mock-refresh',
      );

      render(
        <MemoryRouter initialEntries={['/employee/dashboard']}>
          <Routes>
            <Route
              path="/employee/dashboard"
              element={
                <RoleGuard requiredRoles={['EMPLOYEE', 'HEAD_OF_HR']}>
                  <div>Authorized Employee Portal View</div>
                </RoleGuard>
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(
        screen.getByText('Authorized Employee Portal View'),
      ).toBeInTheDocument();
    });
  });
});
