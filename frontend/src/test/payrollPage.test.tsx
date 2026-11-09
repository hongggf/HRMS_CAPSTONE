import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PayrollPage } from '../pages/payroll/PayrollPage';
import { payrollApi } from '../api/payroll';
import { departmentApi } from '../api/organization';
import { employeeApi } from '../api/employee';
import { useAuthStore } from '../store/useAuthStore';
import { PayrollPeriod, Payroll } from '../types/payroll';

// Synthetic Test Data
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
  {
    id: 3,
    name: 'September 2026 Payroll',
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2026-09-30T23:59:59.000Z',
    status: 'LOCKED',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-30T23:59:59.000Z',
    _count: { payrolls: 2 },
  },
  {
    id: 4,
    name: 'August 2026 Payroll',
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-08-31T23:59:59.000Z',
    status: 'PENDING_APPROVAL',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-31T12:00:00.000Z',
    _count: { payrolls: 2 },
  },
  {
    id: 5,
    name: 'July 2026 Payroll',
    startDate: '2026-07-01T00:00:00.000Z',
    endDate: '2026-07-31T23:59:59.000Z',
    status: 'APPROVED',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-31T12:00:00.000Z',
    _count: { payrolls: 2 },
  },
];

const mockPayrollsPeriod1: Payroll[] = [
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
    totalAllowances: 0,
    totalDeductions: 0,
    totalOvertime: 0,
    netSalary: 6000,
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
    items: [
      {
        id: 5,
        payrollId: 102,
        componentName: 'Basic Salary',
        componentType: 'OTHER',
        amount: 6000,
        description: 'Contractual base salary',
      },
    ],
    adjustments: [],
  },
];

const mockPayslipDetail: Payroll = {
  ...mockPayrollsPeriod1[0],
  payrollPeriod: mockPeriods[0],
};

describe('Phase 7: Secure Payroll Management Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    vi.clearAllMocks();

    // Default API Mocks
    vi.spyOn(payrollApi, 'getPeriods').mockResolvedValue([...mockPeriods]);
    vi.spyOn(payrollApi, 'getPayrollsByPeriod').mockResolvedValue([
      ...mockPayrollsPeriod1,
    ]);
    vi.spyOn(payrollApi, 'getPayslip').mockResolvedValue(mockPayslipDetail);
    vi.spyOn(departmentApi, 'list').mockResolvedValue({
      departments: [{ id: 1, name: 'IT', code: 'IT' }],
      total: 1,
    } as any);
    vi.spyOn(employeeApi, 'list').mockResolvedValue([
      { id: 1, firstName: 'John', lastName: 'Doe' },
    ] as any);

    // Default user: Head of HR
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

  it('renders payroll management overview, status tags, and KPI statistics', async () => {
    renderComponent();

    expect(
      await screen.findByText('Payroll Management & Governance'),
    ).toBeInTheDocument();

    // Active period name and status tag
    expect(await screen.findByText('October 2026 Payroll')).toBeInTheDocument();
    expect(screen.getAllByText('Calculated').length).toBeGreaterThanOrEqual(1);

    // KPI Summary statistics formatted properly
    expect(await screen.findByText('Basic Salary')).toBeInTheDocument();
    expect(screen.getByText('$11,000.00')).toBeInTheDocument();
    expect(screen.getByText('Total Net Payout')).toBeInTheDocument();
    expect(screen.getByText('$11,593.75')).toBeInTheDocument();

    // Table rows rendered
    expect(screen.getByText('Alice Walker')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
    expect(screen.getByText('EMP-002')).toBeInTheDocument();
  });

  it('allows authorized user to create a new payroll period', async () => {
    const newPeriod: PayrollPeriod = {
      id: 6,
      name: 'December 2026 Payroll',
      startDate: '2026-12-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.000Z',
      status: 'DRAFT',
      createdAt: '2026-12-01T00:00:00.000Z',
      updatedAt: '2026-12-01T00:00:00.000Z',
      _count: { payrolls: 0 },
    };

    const createSpy = vi
      .spyOn(payrollApi, 'createPeriod')
      .mockResolvedValue(newPeriod);

    renderComponent();

    const newBtn = await screen.findByRole('button', {
      name: /new payroll period/i,
    });
    fireEvent.click(newBtn);

    expect(
      await screen.findByText('Create New Payroll Period'),
    ).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(
      /e\.g\. November 2026 Monthly Payroll/i,
    );
    fireEvent.change(nameInput, {
      target: { value: 'December 2026 Payroll' },
    });

    const startInput = screen.getByLabelText(/start date/i);
    const endInput = screen.getByLabelText(/end date/i);
    fireEvent.change(startInput, { target: { value: '2026-12-01' } });
    fireEvent.change(endInput, { target: { value: '2026-12-31' } });

    const submitBtn = screen.getByRole('button', { name: /ok/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
      expect(createSpy.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          name: 'December 2026 Payroll',
        }),
      );
    });
  });

  it('handles duplicate payroll period creation rejection from backend', async () => {
    vi.spyOn(payrollApi, 'createPeriod').mockRejectedValue({
      response: {
        data: {
          error: {
            message:
              'A payroll period with these exact start and end dates already exists',
          },
        },
      },
    });

    renderComponent();

    const newBtn = await screen.findByRole('button', {
      name: /new payroll period/i,
    });
    fireEvent.click(newBtn);

    const nameInput = screen.getByPlaceholderText(
      /e\.g\. November 2026 Monthly Payroll/i,
    );
    fireEvent.change(nameInput, {
      target: { value: 'Duplicate Period' },
    });
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2026-10-31' },
    });

    const submitBtn = screen.getByRole('button', { name: /ok/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(payrollApi.createPeriod).toHaveBeenCalled();
    });
  });

  it('triggers calculation with confirmation and refreshes state', async () => {
    const calcSpy = vi
      .spyOn(payrollApi, 'calculatePayroll')
      .mockResolvedValue({
        success: true,
        message: 'Payroll calculated successfully',
      });

    renderComponent();

    const calcBtn = await screen.findByRole('button', {
      name: /recalculate payroll/i,
    });
    fireEvent.click(calcBtn);

    // Popconfirm opens
    expect(
      await screen.findByText(/Run official calculation for all active employees/i),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /yes, calculate/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(calcSpy).toHaveBeenCalledWith(1);
    });
  });

  it('handles backend calculation failure and informs user without optimistic update', async () => {
    vi.spyOn(payrollApi, 'calculatePayroll').mockRejectedValue({
      response: {
        data: {
          error: {
            message:
              'Calculation aborted: Active employee EMP-001 has missing compensation profile',
          },
        },
      },
    });

    renderComponent();

    const calcBtn = await screen.findByRole('button', {
      name: /recalculate payroll/i,
    });
    fireEvent.click(calcBtn);

    const confirmBtn = await screen.findByRole('button', {
      name: /yes, calculate/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(payrollApi.calculatePayroll).toHaveBeenCalledWith(1);
    });

    // Authoritative state remains intact
    expect(screen.getAllByText('Calculated').length).toBeGreaterThanOrEqual(1);
  });

  it('submits prepared payroll period for executive review', async () => {
    const submitSpy = vi
      .spyOn(payrollApi, 'submitPayroll')
      .mockResolvedValue({
        ...mockPeriods[0],
        status: 'PENDING_APPROVAL',
      });

    renderComponent();

    const submitBtn = await screen.findByRole('button', {
      name: /submit for review/i,
    });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(
        /Submit calculated payroll figures to Head of HR for final approval\?/i,
      ),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /yes, submit/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith(1);
    });
  });

  it('restricts approve and reject actions to HEAD_OF_HR role only', async () => {
    // Switch to HR_PAYROLL officer (non-Head of HR)
    useAuthStore.setState({
      user: {
        id: 2,
        email: 'payroll@hr.local',
        roles: ['HR_PAYROLL'],
        permissions: ['PAYROLL_CREATE', 'PAYROLL_READ', 'PAYROLL_LOCK'],
      },
      isAuthenticated: true,
      accessToken: 'payroll-token',
    });

    renderComponent();

    // Verify non-Head of HR does NOT see Approve or Reject buttons
    await screen.findByText('October 2026 Payroll');
    expect(
      screen.queryByRole('button', { name: /approve payroll/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /reject payroll/i }),
    ).not.toBeInTheDocument();
  });

  it('Head of HR approves payroll period in PENDING_APPROVAL status', async () => {
    // Set August 2026 (status: PENDING_APPROVAL) as the first period in list
    vi.spyOn(payrollApi, 'getPeriods').mockResolvedValue([
      mockPeriods[3], // August 2026 (PENDING_APPROVAL)
      ...mockPeriods.slice(0, 3),
    ]);

    const approveSpy = vi
      .spyOn(payrollApi, 'approvePayroll')
      .mockResolvedValue({
        ...mockPeriods[3],
        status: 'APPROVED',
      });

    renderComponent();

    expect(await screen.findByText('August 2026 Payroll')).toBeInTheDocument();

    const approveBtn = await screen.findByRole('button', {
      name: /approve payroll/i,
    });
    fireEvent.click(approveBtn);

    expect(
      await screen.findByText(
        /Authorize this payroll disbursement\? Once approved, the period can be finalized and locked\./i,
      ),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^approve$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith(4);
    });
  });

  it('Head of HR rejects payroll period with mandatory justification comments', async () => {
    vi.spyOn(payrollApi, 'getPeriods').mockResolvedValue([
      mockPeriods[3], // August 2026 (PENDING_APPROVAL)
    ]);

    const rejectSpy = vi
      .spyOn(payrollApi, 'rejectPayroll')
      .mockResolvedValue({
        ...mockPeriods[3],
        status: 'REJECTED',
      });

    renderComponent();

    const rejectBtn = await screen.findByRole('button', {
      name: /reject payroll/i,
    });
    fireEvent.click(rejectBtn);

    expect(
      await screen.findByText('Reject Payroll Period'),
    ).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/state reason for rejection/i);
    fireEvent.change(textarea, {
      target: { value: 'Timesheet overtime hours discrepancy in IT department' },
    });

    const confirmRejectBtn = screen.getByRole('button', {
      name: /confirm rejection/i,
    });
    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith(
        4,
        'Timesheet overtime hours discrepancy in IT department',
      );
    });
  });

  it('locks approved payroll period with high-impact caution dialog', async () => {
    // July 2026 Payroll is APPROVED
    vi.spyOn(payrollApi, 'getPeriods').mockResolvedValue([
      mockPeriods[4], // July 2026 (APPROVED)
    ]);

    const lockSpy = vi
      .spyOn(payrollApi, 'lockPayroll')
      .mockResolvedValue({
        ...mockPeriods[4],
        status: 'LOCKED',
      });

    renderComponent();

    expect(await screen.findByText('July 2026 Payroll')).toBeInTheDocument();

    const lockBtn = await screen.findByRole('button', {
      name: /lock period/i,
    });
    fireEvent.click(lockBtn);

    expect(
      await screen.findByText(
        /CAUTION: Locking is irreversible\. Locked periods cannot be modified, recalculated, or unlocked\./i,
      ),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', {
      name: /confirm & lock/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(lockSpy).toHaveBeenCalledWith(5);
    });
  });

  it('enforces locked period read-only invariants: calculation, submit, and approve disabled', async () => {
    // September 2026 Payroll is LOCKED
    vi.spyOn(payrollApi, 'getPeriods').mockResolvedValue([
      mockPeriods[2], // September 2026 (LOCKED)
    ]);

    renderComponent();

    expect(await screen.findByText('September 2026 Payroll')).toBeInTheDocument();
    expect(screen.getAllByText('Locked (Final)').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Immutable Financial Record'),
    ).toBeInTheDocument();

    // In a locked period, calculate, submit, approve, and lock buttons must NOT be present
    expect(
      screen.queryByRole('button', { name: /calculate payroll/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /recalculate payroll/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /submit for review/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /approve payroll/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /lock period/i }),
    ).not.toBeInTheDocument();
  });

  it('retrieves and displays official payslip in drawer', async () => {
    renderComponent();

    const payslipButtons = await screen.findAllByRole('button', {
      name: /payslip/i,
    });
    fireEvent.click(payslipButtons[0]);

    expect(
      await screen.findByText('Official Employee Payslip'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('HRMS ENTERPRISE PAYSLIP'),
    ).toBeInTheDocument();

    // Verify employee and earnings breakdown
    expect(screen.getAllByText('Senior Engineer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Housing Allowance')).toBeInTheDocument();
    expect(screen.getByText('Overtime Pay')).toBeInTheDocument();
    expect(screen.getByText('Tax Deduction')).toBeInTheDocument();
    expect(screen.getAllByText('$5,593.75').length).toBeGreaterThanOrEqual(1);

    expect(payrollApi.getPayslip).toHaveBeenCalledWith(101);
  });

  it('handles unauthorized payslip access error securely without exposing data', async () => {
    const forbiddenErr = Object.assign(
      new Error('Forbidden: Insufficient permissions to access this payslip'),
      {
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            error: {
              message:
                'Forbidden: Insufficient permissions to access this payslip',
            },
          },
        },
      },
    );
    vi.spyOn(payrollApi, 'getPayslip').mockRejectedValue(forbiddenErr);

    renderComponent();

    const payslipButtons = await screen.findAllByRole('button', {
      name: /payslip/i,
    });
    fireEvent.click(payslipButtons[0]);

    expect(
      await screen.findByText('Unauthorized / Payslip Error'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Forbidden: Insufficient permissions to access this payslip',
      ),
    ).toBeInTheDocument();

    // Sensitive info must NOT be rendered
    expect(screen.queryByText('Housing Allowance')).not.toBeInTheDocument();
  });

  it('allows adding a manual payroll adjustment', async () => {
    const adjustSpy = vi
      .spyOn(payrollApi, 'createAdjustment')
      .mockResolvedValue({
        id: 99,
        payrollId: 101,
        adjustedById: 1,
        amount: 250,
        type: 'ADDITION',
        reason: 'Performance spot bonus',
        date: '2026-10-15T00:00:00.000Z',
      });

    renderComponent();

    const adjustButtons = await screen.findAllByRole('button', {
      name: /adjust/i,
    });
    fireEvent.click(adjustButtons[0]);

    expect(
      await screen.findByText('Add Adjustment: Alice Walker'),
    ).toBeInTheDocument();

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '250' } });

    const reasonInput = screen.getByPlaceholderText(
      /e\.g\. Retroactive bonus payout/i,
    );
    fireEvent.change(reasonInput, {
      target: { value: 'Performance spot bonus' },
    });

    const submitBtn = screen.getByRole('button', { name: /ok/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adjustSpy).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          type: 'ADDITION',
          amount: 250,
          reason: 'Performance spot bonus',
        }),
      );
    });
  });
});
