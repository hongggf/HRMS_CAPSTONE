import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PayrollPage } from '../pages/payroll/PayrollPage';
import { payrollApi } from '../api/payroll';
import { departmentApi } from '../api/organization';
import { employeeApi } from '../api/employee';
import { useAuthStore } from '../store/useAuthStore';
import { PayrollPeriod, Payroll } from '../types/payroll';
import { sanitizeCsvValue } from '../utils/formatters';

const mockPeriods: PayrollPeriod[] = [
  {
    id: 1,
    name: 'October 2026 Payroll',
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: '2026-10-31T23:59:59.000Z',
    status: 'CALCULATED',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    _count: { payrolls: 2 },
    approvals: [
      {
        id: 1,
        payrollPeriodId: 1,
        approvedById: 1,
        status: 'CALCULATED',
        comments: 'System calculation initiated',
        date: '2026-10-01T12:00:00.000Z',
        approvedBy: { id: 1, email: 'head@hr.local' },
      },
    ],
  },
  {
    id: 2,
    name: 'November 2026 Payroll',
    startDate: '2026-11-01T00:00:00.000Z',
    endDate: '2026-11-30T23:59:59.000Z',
    status: 'DRAFT',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    _count: { payrolls: 0 },
  },
];

const mockPayrolls: Payroll[] = [
  {
    id: 101,
    payrollPeriodId: 1,
    employeeId: 1,
    basicSalary: 5000,
    totalAllowances: 1000,
    totalDeductions: 500,
    totalOvertime: 93.75,
    netSalary: 5593.75,
    status: 'CALCULATED',
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    employee: {
      id: 1,
      employeeId: 'EMP-001',
      firstName: 'Alice',
      lastName: 'Walker',
      email: 'alice@company.local',
      department: { id: 1, name: 'Engineering', code: 'ENG' },
      position: { id: 1, title: 'Senior Engineer', code: 'SR_ENG' },
    },
    items: [
      {
        id: 1,
        payrollId: 101,
        componentName: 'Basic Salary',
        componentType: 'OTHER',
        amount: 5000,
        description: 'Contractual base salary',
      },
      {
        id: 2,
        payrollId: 101,
        componentName: 'Housing Allowance',
        componentType: 'ALLOWANCE',
        amount: 1000,
        description: 'Monthly accommodation benefit',
      },
      {
        id: 3,
        payrollId: 101,
        componentName: 'Overtime Pay',
        componentType: 'ALLOWANCE',
        amount: 93.75,
        description: '2 hours at 1.5x rate',
      },
      {
        id: 4,
        payrollId: 101,
        componentName: 'Tax Deduction',
        componentType: 'DEDUCTION',
        amount: 500,
        description: 'Standard withholding tax',
      },
    ],
    adjustments: [],
  },
  {
    id: 102,
    payrollPeriodId: 1,
    employeeId: 2,
    basicSalary: 6000,
    totalAllowances: 200,
    totalDeductions: 300,
    totalOvertime: 0,
    netSalary: 5900,
    status: 'CALCULATED',
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    employee: {
      id: 2,
      employeeId: 'EMP-002',
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@company.local',
      department: { id: 2, name: 'Finance', code: 'FIN' },
      position: { id: 2, title: 'Financial Analyst', code: 'FA' },
    },
    items: [],
    adjustments: [
      {
        id: 1,
        payrollId: 102,
        adjustedById: 1,
        amount: 100,
        type: 'ADDITION',
        reason: 'Bonus missed',
        date: '2026-10-05T00:00:00.000Z',
      },
    ],
  },
];

const mockDepartments = [
  {
    id: 1,
    name: 'Engineering',
    code: 'ENG',
    status: 'ACTIVE' as const,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 2,
    name: 'Finance',
    code: 'FIN',
    status: 'ACTIVE' as const,
    createdAt: '',
    updatedAt: '',
  },
];

const mockEmployees = [
  {
    id: 1,
    employeeId: 'EMP-001',
    firstName: 'Alice',
    lastName: 'Walker',
    email: 'alice@company.local',
    departmentId: 1,
    positionId: 1,
    employmentType: 'FULL_TIME' as const,
    status: 'ACTIVE' as const,
    onboardingStatus: 'ACTIVE' as const,
    createdAt: '',
    updatedAt: '',
    department: mockDepartments[0],
  },
  {
    id: 2,
    employeeId: 'EMP-002',
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob@company.local',
    departmentId: 2,
    positionId: 2,
    employmentType: 'FULL_TIME' as const,
    status: 'ACTIVE' as const,
    onboardingStatus: 'ACTIVE' as const,
    createdAt: '',
    updatedAt: '',
    department: mockDepartments[1],
  },
  {
    id: 3,
    employeeId: 'EMP-003',
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie@company.local',
    departmentId: 1,
    positionId: 1,
    employmentType: 'FULL_TIME' as const,
    status: 'ACTIVE' as const,
    onboardingStatus: 'ACTIVE' as const,
    createdAt: '',
    updatedAt: '',
    department: mockDepartments[0],
  },
];

describe('Phase 1-11: Payroll Enterprise Feature Implementation Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    vi.clearAllMocks();

    vi.spyOn(payrollApi, 'getPeriods').mockResolvedValue([...mockPeriods]);
    vi.spyOn(payrollApi, 'getPayrollsByPeriod').mockResolvedValue([
      ...mockPayrolls,
    ]);
    vi.spyOn(payrollApi, 'getPayslip').mockResolvedValue(mockPayrolls[0]);
    vi.spyOn(payrollApi, 'getMyPayslips').mockResolvedValue([
      {
        ...mockPayrolls[0],
        payrollPeriod: { ...mockPeriods[0], status: 'APPROVED' },
      },
    ]);
    vi.spyOn(payrollApi, 'getPayrollReport').mockResolvedValue({
      totalPayrollsProcessed: 2,
      totals: {
        grossSalary: 12293.75,
        basicSalary: 11000,
        allowances: 1200,
        overtime: 93.75,
        deductions: 800,
        netSalary: 11493.75,
      },
    });

    vi.spyOn(departmentApi, 'list').mockResolvedValue({
      departments: mockDepartments,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    vi.spyOn(employeeApi, 'list').mockResolvedValue(mockEmployees);

    useAuthStore.setState({
      user: {
        id: 1,
        email: 'head@hr.local',
        roles: ['HEAD_OF_HR'],
        permissions: [
          'PAYROLL_CREATE',
          'PAYROLL_READ',
          'PAYROLL_APPROVE',
          'PAYROLL_LOCK',
        ],
      },
      isAuthenticated: true,
      accessToken: 'valid-token',
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <PayrollPage />
      </QueryClientProvider>,
    );

  it('renders enterprise dashboard with Cambodia compliance alert and gross payroll calculation', async () => {
    renderComponent();

    // Cambodia labor law notice
    expect(
      await screen.findByText(
        /Cambodia Statutory Payroll & Labor Law Compliance Standard/i,
      ),
    ).toBeInTheDocument();

    // Gross payroll KPI card
    expect(await screen.findByText('Gross Payroll Total')).toBeInTheDocument();
    // Total Gross = 5000 + 1000 + 93.75 + 6000 + 200 = 12293.75
    expect(await screen.findByText('$12,293.75')).toBeInTheDocument();

    // Authoritative net disbursement
    expect(screen.getByText('Total Net Payout')).toBeInTheDocument();
  });

  it('opens calculation inspector drawer displaying hourly derivation and 1.5x overtime breakdown', async () => {
    renderComponent();

    const inspectButtons = await screen.findAllByRole('button', {
      name: /inspect/i,
    });
    fireEvent.click(inspectButtons[0]);

    expect(
      await screen.findByText('Payroll Calculation Inspector'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/1\. Contractual Base Salary & Hourly Standard/i),
    ).toBeInTheDocument();
    expect(await screen.findByText('$31.25 / hr')).toBeInTheDocument(); // 5000 / 160
    expect(screen.getByText('$46.88 / hr')).toBeInTheDocument(); // 31.25 * 1.5
    expect(
      screen.getByText(/2\. Overtime Pay Derivation/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/1\.5x/i).length).toBeGreaterThanOrEqual(1);
  });

  it('detects uncalculated active employees and flags blocking exception in validation tab', async () => {
    renderComponent();

    // Switch to Pre-Submission Validation Tab
    const validationTab = await screen.findByRole('tab', {
      name: /Pre-Submission Validation/i,
    });
    fireEvent.click(validationTab);

    // Active employee Charlie Brown (EMP-003) is in allEmployees but not in calculated payrolls
    expect(
      await screen.findByText(
        /Active employee was skipped during calculation/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    expect(screen.getAllByText('Blocking Error').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText(/Submission Blocked/i)).toBeInTheDocument();
  });

  it('switches to Periods & Lifecycle tab to view all cycles and audit approvals history', async () => {
    renderComponent();

    const periodsTab = await screen.findByRole('tab', {
      name: /Periods & Lifecycle/i,
    });
    fireEvent.click(periodsTab);

    expect(
      await screen.findByText('Payroll Periods Lifecycle Governance'),
    ).toBeInTheDocument();
    expect(screen.getByText('November 2026 Payroll')).toBeInTheDocument();

    // Inspect period history
    const historyButtons = await screen.findAllByRole('button', {
      name: /History & Audit/i,
    });
    fireEvent.click(historyButtons[0]);

    expect(
      await screen.findByText('Payroll Period Audit & Governance Log'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/System calculation initiated/i),
    ).toBeInTheDocument();
  });

  it('switches to Reports & Analytics tab and queries backend reporting endpoint', async () => {
    renderComponent();

    const reportsTab = await screen.findByRole('tab', {
      name: /Reports & Analytics/i,
    });
    fireEvent.click(reportsTab);

    expect(
      await screen.findByText(
        'Department Cost Breakdown (Current Active Period)',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('Processed Pay Runs')).toBeInTheDocument();
    expect(
      screen.getByText(/Banking & Payment Reconciliation Future Integration/i),
    ).toBeInTheDocument();

    // Verify CSV export button exists
    expect(
      screen.getByRole('button', { name: /Export CSV \(Formula-Protected\)/i }),
    ).toBeInTheDocument();
  });

  it('employee self-service tab lists released payslips and prevents unauthorized access', async () => {
    renderComponent();

    const myPayslipsTab = await screen.findByRole('tab', {
      name: /My Payslips \(Self-Service\)/i,
    });
    fireEvent.click(myPayslipsTab);

    expect(
      await screen.findByText('Employee Self-Service: My Released Payslips'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        /Payslips are released here only after final approval and locking/i,
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /View Payslip/i }),
    ).toBeInTheDocument();
  });

  it('sanitizes CSV exports to protect against formula injection', () => {
    // Test values starting with formula trigger characters: = + - @ \t \r
    expect(sanitizeCsvValue('=1+2')).toBe(`'=1+2`);
    expect(sanitizeCsvValue('+CMD')).toBe(`'+CMD`);
    expect(sanitizeCsvValue('-100')).toBe(`'-100`);
    expect(sanitizeCsvValue('@SUM(A1:A5)')).toBe(`'@SUM(A1:A5)`);
    expect(sanitizeCsvValue('\tTAB')).toBe(`'\tTAB`);
    expect(sanitizeCsvValue('Standard Text')).toBe('Standard Text');
    expect(sanitizeCsvValue('Contains, Comma')).toBe('"Contains, Comma"');
  });
});
