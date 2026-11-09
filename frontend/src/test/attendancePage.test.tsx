import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AttendancePage } from '../pages/attendance/AttendancePage';
import { attendanceApi } from '../api/attendance';
import { employeeApi } from '../api/employee';
import { useAuthStore } from '../store/useAuthStore';
import {
  AttendanceRecord,
  Shift,
  EmployeeShift,
  LeaveType,
  LeaveRequest,
  OvertimeRequest,
  Timesheet,
} from '../types/attendance';
import { Employee } from '../types/employee';

const mockEmployees: Employee[] = [
  {
    id: 1,
    employeeId: 'EMP-001',
    firstName: 'Alice',
    lastName: 'Walker',
    email: 'alice@example.com',
    status: 'ACTIVE',
    onboardingStatus: 'ACTIVE',
    employmentType: 'FULL_TIME',
    userId: 101, // Alice's user id
    departmentId: 1,
    positionId: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    department: {
      id: 1,
      name: 'Engineering',
      code: 'ENG',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
  {
    id: 2,
    employeeId: 'EMP-002',
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob@example.com',
    status: 'ACTIVE',
    onboardingStatus: 'ACTIVE',
    employmentType: 'FULL_TIME',
    userId: 102, // Bob's user id
    departmentId: 2,
    positionId: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    department: {
      id: 2,
      name: 'Marketing',
      code: 'MKT',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
];

const mockAttendances: AttendanceRecord[] = [
  {
    id: 1,
    employeeId: 1,
    date: '2026-10-06T00:00:00.000Z',
    checkIn: '2026-10-06T09:00:00.000Z',
    checkOut: '2026-10-06T17:00:00.000Z',
    status: 'PRESENT',
    lateMinutes: 0,
    earlyDeparture: 0,
    workingMinutes: 480, // 8 hours
    createdAt: '2026-10-06T09:00:00.000Z',
    updatedAt: '2026-10-06T17:00:00.000Z',
    employee: mockEmployees[0],
  },
  {
    id: 2,
    employeeId: 2,
    date: '2026-10-06T00:00:00.000Z',
    checkIn: '2026-10-06T09:30:00.000Z',
    checkOut: null, // open punch / exception
    status: 'LATE',
    lateMinutes: 30,
    earlyDeparture: 0,
    workingMinutes: 0,
    createdAt: '2026-10-06T09:30:00.000Z',
    updatedAt: '2026-10-06T09:30:00.000Z',
    employee: mockEmployees[1],
  },
];

const mockShifts: Shift[] = [
  {
    id: 1,
    name: 'Morning Standard',
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    workingDays: '1,2,3,4,5',
  },
];

const mockEmpShifts: EmployeeShift[] = [
  {
    id: 1,
    employeeId: 1,
    shiftId: 1,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: null,
    employee: mockEmployees[0],
    shift: mockShifts[0],
  },
];

const mockLeaveTypes: LeaveType[] = [
  {
    id: 1,
    name: 'Annual Paid Vacation',
    daysAllowed: 20,
    isPaid: true,
    requiresBalance: true,
  },
];

const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 10,
    employeeId: 1,
    leaveTypeId: 1,
    startDate: '2026-11-01T00:00:00.000Z',
    endDate: '2026-11-05T00:00:00.000Z',
    status: 'SUBMITTED',
    reason: 'Family holiday',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
    employee: mockEmployees[0], // Alice (userId: 101)
    leaveType: mockLeaveTypes[0],
  },
];

const mockOvertimeRequests: OvertimeRequest[] = [
  {
    id: 20,
    employeeId: 1,
    date: '2026-10-08T00:00:00.000Z',
    hours: 3.5,
    reason: 'Production deployment release',
    status: 'SUBMITTED',
    createdAt: '2026-10-08T18:00:00.000Z',
    updatedAt: '2026-10-08T18:00:00.000Z',
    employee: mockEmployees[0], // Alice (userId: 101)
  },
];

const mockTimesheets: Timesheet[] = [
  {
    id: 100,
    employeeId: 1,
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: '2026-10-31T00:00:00.000Z',
    regularHours: 160,
    overtimeHours: 10,
    totalHours: 170,
    employee: mockEmployees[0],
  },
];

const mockReportData = {
  attendance: { PRESENT: 10, LATE: 2, ABSENT: 1 },
  leaves: { APPROVED: 4, SUBMITTED: 1 },
  totalOvertimeHours: 25.5,
};

const mockAuditLogs = {
  logs: [
    {
      id: 501,
      actorId: 99,
      action: 'ATTENDANCE_CHECK_IN',
      module: 'ATTENDANCE',
      entityType: 'Attendance',
      entityId: '1',
      oldValues: null,
      newValues: { status: 'PRESENT', checkIn: '2026-10-06T09:00:00.000Z' },
      timestamp: '2026-10-06T09:00:00.000Z',
      user: { email: 'hr_manager@company.local' },
    },
  ],
  total: 1,
};

describe('Real-World HR Attendance & Enterprise Governance Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    vi.clearAllMocks();

    // Default API mocks
    vi.spyOn(employeeApi, 'list').mockResolvedValue(mockEmployees);
    vi.spyOn(attendanceApi, 'getAttendances').mockResolvedValue(mockAttendances);
    vi.spyOn(attendanceApi, 'getShifts').mockResolvedValue(mockShifts);
    vi.spyOn(attendanceApi, 'getEmployeeShifts').mockResolvedValue(mockEmpShifts);
    vi.spyOn(attendanceApi, 'getLeaveTypes').mockResolvedValue(mockLeaveTypes);
    vi.spyOn(attendanceApi, 'getLeaveRequests').mockResolvedValue(mockLeaveRequests);
    vi.spyOn(attendanceApi, 'getOvertimeRequests').mockResolvedValue(mockOvertimeRequests);
    vi.spyOn(attendanceApi, 'getTimesheets').mockResolvedValue(mockTimesheets);
    vi.spyOn(attendanceApi, 'getAttendanceReport').mockResolvedValue(mockReportData);
    vi.spyOn(attendanceApi, 'getAttendanceAuditLogs').mockResolvedValue(mockAuditLogs);

    // Default logged in user: HR Manager (User ID: 99 - not Alice, not Bob)
    useAuthStore.setState({
      user: {
        id: 99,
        email: 'hr_manager@company.local',
        roles: ['HEAD_OF_HR', 'HR_ATTENDANCE'],
        permissions: ['ATTENDANCE_CREATE', 'ATTENDANCE_UPDATE', 'LEAVE_UPDATE', 'OVERTIME_UPDATE', 'TIMESHEET_READ'],
      },
      isAuthenticated: true,
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AttendancePage />
      </QueryClientProvider>,
    );

  it('renders enterprise header, documented UTC timezone, and KPI overview cards', async () => {
    renderComponent();

    expect(screen.getByText('Attendance Management')).toBeInTheDocument();
    expect(screen.getByText('Documented Timezone: UTC')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
      expect(screen.getByText('Late Arrivals')).toBeInTheDocument();
      expect(screen.getByText('Missing Check-Out')).toBeInTheDocument();
      expect(screen.getByText('Configured Shifts')).toBeInTheDocument();
      expect(screen.getByText('Pending Leaves')).toBeInTheDocument();
      expect(screen.getByText('Pending Overtime')).toBeInTheDocument();
    });
  });

  it('strictly separates HR and employee actions: no ordinary clock in/out buttons in HR review desk', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    // Verification: HR interface must NOT provide ordinary employee clock in/out buttons
    expect(screen.queryByRole('button', { name: /Clock In \/ Out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Clock In$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Clock Out$/i })).not.toBeInTheDocument();
  });

  it('renders Daily Records table with formatted timestamps, durations, and details action', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const recordsTab = screen.getByRole('tab', { name: /Daily Records/i });
    fireEvent.click(recordsTab);

    await waitFor(() => {
      expect(screen.getByText('Alice Walker')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('8h 00m')).toBeInTheDocument(); // 480 working minutes
      expect(screen.getByText('30m Late')).toBeInTheDocument();
      expect(screen.getByText('Open (Unclosed)')).toBeInTheDocument(); // Bob has open punch
    });
  });

  it('switches to Attendance Exceptions tab and highlights open punches & late arrivals', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const exceptionsTab = screen.getByRole('tab', { name: /Attendance Exceptions/i });
    fireEvent.click(exceptionsTab);

    await waitFor(() => {
      expect(screen.getByText('Unresolved Attendance Exceptions')).toBeInTheDocument();
      expect(screen.getByText('Missing Check-Out (Open Punch)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Submit Correction/i })).toBeInTheDocument();
    });
  });

  it('opens Attendance Correction Modal with mandatory reason and original data preservation', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const recordsTab = screen.getByRole('tab', { name: /Daily Records/i });
    fireEvent.click(recordsTab);

    await waitFor(() => {
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });

    const correctBtns = screen.getAllByRole('button', { name: /Correct/i });
    fireEvent.click(correctBtns[1]); // Correct Bob's punch

    await waitFor(() => {
      expect(screen.getByText(/Administrative Attendance Correction \(UTC\)/i)).toBeInTheDocument();
      expect(screen.getByText('Original Attendance Record:')).toBeInTheDocument();
      expect(screen.getByText(/Mandatory Correction Reason & Justification/i)).toBeInTheDocument();
    });
  });

  it('switches to Timesheets tab and displays server-calculated hours', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const timesheetTab = screen.getByRole('tab', { name: /Timesheets/i });
    fireEvent.click(timesheetTab);

    await waitFor(() => {
      expect(screen.getByText('160 hrs')).toBeInTheDocument(); // Regular
      expect(screen.getByText('10 hrs')).toBeInTheDocument(); // Overtime
      expect(screen.getByText('170 hrs')).toBeInTheDocument(); // Total Official Hours
      expect(screen.getByText('Server Computed')).toBeInTheDocument();
    });
  });

  it('generates timesheet via modal and shows official server response without frontend calculation', async () => {
    const generateSpy = vi.spyOn(attendanceApi, 'generateTimesheet').mockResolvedValue({
      id: 101,
      employeeId: 1,
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-31T00:00:00.000Z',
      regularHours: 160,
      overtimeHours: 15,
      totalHours: 175,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const timesheetTab = screen.getByRole('tab', { name: /Timesheets/i });
    fireEvent.click(timesheetTab);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generate Timesheet/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Generate Timesheet/i }));

    await waitFor(() => {
      expect(screen.getByText('Generate Official Timesheet')).toBeInTheDocument();
    });

    const submitGenBtn = screen.getByRole('button', { name: 'Generate Timesheet' });
    fireEvent.click(submitGenBtn);

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalled();
      expect(screen.getByText('Server Calculation Result')).toBeInTheDocument();
      expect(screen.getByText('175 hrs')).toBeInTheDocument();
    });
  });

  it('switches to Shifts tab and lists shift templates & staff assignments', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const shiftsTab = screen.getByRole('tab', { name: /Shifts & Rostering/i });
    fireEvent.click(shiftsTab);

    await waitFor(() => {
      expect(screen.getAllByText('Morning Standard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('09:00 — 17:00').length).toBeGreaterThan(0);
      expect(screen.getByText('60 minutes')).toBeInTheDocument();
      expect(screen.getByText('Staff Shift Assignments (1)')).toBeInTheDocument();
    });
  });

  it('creates a new shift schedule with valid working days and times', async () => {
    const createShiftSpy = vi.spyOn(attendanceApi, 'createShift').mockResolvedValue({
      id: 2,
      name: 'Evening Shift',
      startTime: '16:00',
      endTime: '00:00',
      breakDuration: 45,
      workingDays: '1,2,3,4,5',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const shiftsTab = screen.getByRole('tab', { name: /Shifts & Rostering/i });
    fireEvent.click(shiftsTab);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Shift/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Shift/i }));

    await waitFor(() => {
      expect(screen.getByText('Create Shift Schedule')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('e.g. Standard Morning Shift');
    fireEvent.change(nameInput, { target: { value: 'Evening Shift' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Shift' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createShiftSpy).toHaveBeenCalled();
    });
  });

  it('switches to Leave tab and approves a leave request', async () => {
    const updateLeaveSpy = vi.spyOn(attendanceApi, 'updateLeaveStatus').mockResolvedValue({
      id: 10,
      employeeId: 1,
      leaveTypeId: 1,
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-05T00:00:00.000Z',
      status: 'APPROVED',
      reason: 'Family holiday',
      approvedBy: 99,
      createdAt: '2026-10-15T00:00:00.000Z',
      updatedAt: '2026-10-15T00:00:00.000Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const leaveTab = screen.getByRole('tab', { name: /Leave Reference & Approvals/i });
    fireEvent.click(leaveTab);

    await waitFor(() => {
      expect(screen.getByText('Family holiday')).toBeInTheDocument();
    });

    // For request #10 (Alice), current user is HR (id 99), so Approve button is enabled
    const approveBtn = screen.getByRole('button', { name: /Approve/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to approve this leave request\?/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: 'Approve' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(updateLeaveSpy).toHaveBeenCalledWith(10, 'APPROVED');
    });
  });

  it('blocks self-approval when current logged-in user is the requester (leave)', async () => {
    useAuthStore.setState({
      user: {
        id: 101, // Alice's user id!
        email: 'alice@example.com',
        roles: ['HEAD_OF_HR', 'HR_ATTENDANCE'],
        permissions: ['ATTENDANCE_CREATE', 'ATTENDANCE_UPDATE', 'LEAVE_UPDATE'],
      },
      isAuthenticated: true,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const leaveTab = screen.getByRole('tab', { name: /Leave Reference & Approvals/i });
    fireEvent.click(leaveTab);

    await waitFor(() => {
      expect(screen.getByText('Family holiday')).toBeInTheDocument();
    });

    // Alice is looking at her own leave request #10: self-approval blocked
    expect(screen.getByText('Self-Approval Blocked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument();
  });

  it('blocks self-approval when current logged-in user is the requester (overtime)', async () => {
    useAuthStore.setState({
      user: {
        id: 101, // Alice's user id!
        email: 'alice@example.com',
        roles: ['HEAD_OF_HR', 'HR_ATTENDANCE'],
        permissions: ['OVERTIME_UPDATE'],
      },
      isAuthenticated: true,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const otTab = screen.getByRole('tab', { name: /Overtime Review/i });
    fireEvent.click(otTab);

    await waitFor(() => {
      expect(screen.getByText('Production deployment release')).toBeInTheDocument();
    });

    // Alice's overtime request cannot be self-approved
    expect(screen.getByText('Self-Approval Blocked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument();
  });

  it('switches to Reports tab and displays aggregated metrics', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const reportsTab = screen.getByRole('tab', { name: /Attendance Reports/i });
    fireEvent.click(reportsTab);

    await waitFor(() => {
      expect(screen.getByText('Total Approved Overtime')).toBeInTheDocument();
      expect(screen.getByText('Attendance Categories')).toBeInTheDocument();
      expect(screen.getByText('Attendance by Status')).toBeInTheDocument();
    });
  });

  it('switches to Audit History tab and renders audit trail logs', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const auditTab = screen.getByRole('tab', { name: /Audit History/i });
    fireEvent.click(auditTab);

    await waitFor(() => {
      expect(screen.getByText('System Audit Trail (Attendance Module)')).toBeInTheDocument();
      expect(screen.getByText('ATTENDANCE_CHECK_IN')).toBeInTheDocument();
    });
  });

  it('opens Attendance Detail Drawer and displays recorded punch details', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Today's Punches")).toBeInTheDocument();
    });

    const recordsTab = screen.getByRole('tab', { name: /Daily Records/i });
    fireEvent.click(recordsTab);

    await waitFor(() => {
      const detailBtns = screen.getAllByRole('button', { name: /Details/i });
      fireEvent.click(detailBtns[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Attendance & Schedule Record Detail')).toBeInTheDocument();
      expect(screen.getByText('Attendance Punch Details')).toBeInTheDocument();
      expect(screen.getByText('System Timezone')).toBeInTheDocument();
    });
  });
});
