import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { dashboardApi } from '../api/dashboard';
import { useAuthStore } from '../store/useAuthStore';
import {
  DashboardMetrics,
  RecruitmentMetrics,
  PayrollReportMetrics,
  EmployeeReportMetrics,
} from '../types/api';

const mockHeadMetrics: DashboardMetrics = {
  totalEmployees: 120,
  activeEmployees: 110,
  inactiveEmployees: 10,
  newHires: 5,
  pendingWorkforceApprovals: 2,
  pendingRecruitmentApprovals: 3,
  pendingPayrollApprovals: 1,
  attendanceSummary: { PRESENT: 98, ABSENT: 12 },
  leaveSummary: { PENDING: 4 },
  payrollSummary: {
    total: 110,
    netSalary: 450000,
  },
  performanceSummary: { COMPLETED: 85, PENDING: 25 },
  trainingSummary: { IN_PROGRESS: 15 },
};

const mockRecruitmentMetrics: RecruitmentMetrics = {
  vacancies: 6,
  applications: 42,
  shortlistedCandidates: 14,
  interviews: 9,
  selectedCandidates: 4,
  hiredCandidates: 3,
  applicationsByStatus: {
    APPLIED: 20,
    SHORTLISTED: 10,
    HIRED: 3,
  },
};

const mockPayrollMetrics: PayrollReportMetrics = {
  totalPayrollsProcessed: 105,
  totals: {
    grossSalary: 520000,
    basicSalary: 420000,
    allowances: 60000,
    overtime: 40000,
    deductions: 50000,
    netSalary: 470000,
  },
};

const mockEmployeeMetrics: EmployeeReportMetrics = {
  totalEmployees: 120,
  departmentDistribution: [
    { departmentId: 1, _count: { _all: 50 } },
    { departmentId: 2, _count: { _all: 70 } },
  ],
  positionDistribution: [{ positionId: 1, _count: { _all: 30 } }],
  statusDistribution: { ACTIVE: 110, INACTIVE: 10 },
  hiringTrends: {
    hiredLast30Days: 8,
  },
};

describe('DashboardPage (Role-Aware Dashboard)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders Executive HR Dashboard for HEAD_OF_HR', async () => {
    useAuthStore.setState({
      user: {
        id: 1,
        email: 'head@hr.local',
        roles: ['HEAD_OF_HR'],
      },
      isAuthenticated: true,
      accessToken: 'token-head',
      isInitializing: false,
    });

    const spy = vi
      .spyOn(dashboardApi, 'getHeadOfHrMetrics')
      .mockResolvedValueOnce(mockHeadMetrics);

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Executive HR Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Total Headcount')).toBeInTheDocument();
    });

    expect(spy).toHaveBeenCalled();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('Active Workforce')).toBeInTheDocument();
    expect(
      screen.getByText(/require executive review and approval/i),
    ).toBeInTheDocument();
  });

  it('renders Recruitment & Talent Pipeline Dashboard for HR_RECRUITMENT', async () => {
    useAuthStore.setState({
      user: {
        id: 2,
        email: 'recruiter@hr.local',
        roles: ['HR_RECRUITMENT'],
      },
      isAuthenticated: true,
      accessToken: 'token-recruiter',
      isInitializing: false,
    });

    const spy = vi
      .spyOn(dashboardApi, 'getRecruitmentMetrics')
      .mockResolvedValueOnce(mockRecruitmentMetrics);

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText('Recruitment & Talent Pipeline Dashboard'),
      ).toBeInTheDocument();
      expect(screen.getByText('Active Job Vacancies')).toBeInTheDocument();
    });

    expect(spy).toHaveBeenCalled();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Candidate Applications')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Shortlisted Candidates')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('Hired Candidates')).toBeInTheDocument();
    expect(screen.getByText('Go to Recruitment & ATS')).toBeInTheDocument();
  });

  it('renders Payroll Dashboard for HR_PAYROLL', async () => {
    useAuthStore.setState({
      user: {
        id: 3,
        email: 'payroll@hr.local',
        roles: ['HR_PAYROLL'],
      },
      isAuthenticated: true,
      accessToken: 'token-payroll',
      isInitializing: false,
    });

    const spy = vi
      .spyOn(dashboardApi, 'getPayrollMetrics')
      .mockResolvedValueOnce(mockPayrollMetrics);

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText('Payroll Intelligence & Compensation Dashboard'),
      ).toBeInTheDocument();
      expect(screen.getByText('Processed Pay Runs')).toBeInTheDocument();
    });

    expect(spy).toHaveBeenCalled();
    expect(screen.getByText('105')).toBeInTheDocument();
    expect(screen.getByText('Total Net Payout')).toBeInTheDocument();
    expect(screen.getByText('Open Payroll Processing')).toBeInTheDocument();
  });

  it('renders Personnel Administration Dashboard for HR_ADMIN', async () => {
    useAuthStore.setState({
      user: {
        id: 4,
        email: 'admin@hr.local',
        roles: ['HR_ADMIN'],
      },
      isAuthenticated: true,
      accessToken: 'token-admin',
      isInitializing: false,
    });

    const spy = vi
      .spyOn(dashboardApi, 'getEmployeeMetrics')
      .mockResolvedValueOnce(mockEmployeeMetrics);

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText('Personnel & Organization Administration Dashboard'),
      ).toBeInTheDocument();
      expect(screen.getByText('Total Records')).toBeInTheDocument();
    });

    expect(spy).toHaveBeenCalled();
    expect(screen.getByText('Departments Configured')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays error alert and retry button when endpoint fails', async () => {
    useAuthStore.setState({
      user: {
        id: 1,
        email: 'head@hr.local',
        roles: ['HEAD_OF_HR'],
      },
      isAuthenticated: true,
      accessToken: 'token-head',
      isInitializing: false,
    });

    const spy = vi
      .spyOn(dashboardApi, 'getHeadOfHrMetrics')
      .mockRejectedValueOnce(new Error('Gateway timeout'))
      .mockResolvedValueOnce(mockHeadMetrics);

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load dashboard metrics'),
      ).toBeInTheDocument();
      expect(screen.getByText('Gateway timeout')).toBeInTheDocument();
    });

    // Click retry
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Total Headcount')).toBeInTheDocument();
    });
  });
});
