import React, { useState, useMemo } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Select,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Typography,
  Tooltip,
  Popconfirm,
  Badge,
  message,
  Alert,
  Empty,
} from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  UserSwitchOutlined,
  ExclamationCircleOutlined,
  AuditOutlined,
  BarChartOutlined,
  HistoryOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { attendanceApi } from '../../api/attendance';
import { employeeApi } from '../../api/employee';
import { useAuthStore } from '../../store/useAuthStore';
import {
  AttendanceRecord,
  Shift,
  EmployeeShift,
  LeaveRequest,
  OvertimeRequest,
  Timesheet,
  LeaveType,
} from '../../types/attendance';
import { Employee } from '../../types/employee';
import {
  formatDateOnly,
  formatTimestamp,
  formatWorkingDuration,
  DOCUMENTED_TIMEZONE,
} from '../../utils/dateUtils';
import { AttendanceCorrectionModal } from './AttendanceCorrectionModal';
import { CreateShiftModal } from './CreateShiftModal';
import { AssignShiftModal } from './AssignShiftModal';
import { CreateLeaveModal } from './CreateLeaveModal';
import { CreateOvertimeModal } from './CreateOvertimeModal';
import { GenerateTimesheetModal } from './GenerateTimesheetModal';
import { AttendanceDetailDrawer, DetailItem } from './AttendanceDetailDrawer';

const { Title, Text } = Typography;

export const AttendancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?.id;

  // Active Screen / Tab
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Filters
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<
    number | undefined
  >(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    undefined,
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    number | undefined
  >(undefined);

  // Modals & Drawers state
  const [correctionModalOpen, setCorrectionModalOpen] =
    useState<boolean>(false);
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] =
    useState<AttendanceRecord | null>(null);
  const [createShiftOpen, setCreateShiftOpen] = useState<boolean>(false);
  const [assignShiftOpen, setAssignShiftOpen] = useState<boolean>(false);
  const [createLeaveOpen, setCreateLeaveOpen] = useState<boolean>(false);
  const [createOvertimeOpen, setCreateOvertimeOpen] = useState<boolean>(false);
  const [generateTimesheetOpen, setGenerateTimesheetOpen] =
    useState<boolean>(false);

  // Detail Drawer state
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);

  // In-flight tracking to disable buttons during pending requests
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ================= Queries =================
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-for-attendance'],
    queryFn: () => employeeApi.list(),
  });

  const {
    data: attendances = [],
    isLoading: loadingAttendances,
    refetch: refetchAttendances,
  } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance-records', selectedEmployeeId, selectedStatus],
    queryFn: () =>
      attendanceApi.getAttendances({
        employeeId: selectedEmployeeId,
        status: selectedStatus,
      }),
  });

  const {
    data: shifts = [],
    isLoading: loadingShifts,
    refetch: refetchShifts,
  } = useQuery<Shift[]>({
    queryKey: ['shifts-list'],
    queryFn: () => attendanceApi.getShifts(),
  });

  const {
    data: employeeShifts = [],
    isLoading: loadingEmpShifts,
    refetch: refetchEmpShifts,
  } = useQuery<EmployeeShift[]>({
    queryKey: ['employee-shifts-list', selectedEmployeeId],
    queryFn: () => attendanceApi.getEmployeeShifts(selectedEmployeeId),
  });

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ['leave-types-list'],
    queryFn: () => attendanceApi.getLeaveTypes(),
  });

  const {
    data: leaveRequests = [],
    isLoading: loadingLeaves,
    refetch: refetchLeaves,
  } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests-list', selectedEmployeeId, selectedStatus],
    queryFn: () =>
      attendanceApi.getLeaveRequests({
        employeeId: selectedEmployeeId,
        status: selectedStatus,
      }),
  });

  const {
    data: overtimeRequests = [],
    isLoading: loadingOvertime,
    refetch: refetchOvertime,
  } = useQuery<OvertimeRequest[]>({
    queryKey: ['overtime-requests-list', selectedEmployeeId, selectedStatus],
    queryFn: () =>
      attendanceApi.getOvertimeRequests({
        employeeId: selectedEmployeeId,
        status: selectedStatus,
      }),
  });

  const {
    data: timesheets = [],
    isLoading: loadingTimesheets,
    refetch: refetchTimesheets,
  } = useQuery<Timesheet[]>({
    queryKey: ['timesheets-list', selectedEmployeeId],
    queryFn: () =>
      attendanceApi.getTimesheets({
        employeeId: selectedEmployeeId,
      }),
  });

  const {
    data: reportData,
    isLoading: loadingReport,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['attendance-report', selectedDepartmentId],
    queryFn: () =>
      attendanceApi.getAttendanceReport({
        departmentId: selectedDepartmentId,
      }),
  });

  const {
    data: auditLogData,
    isLoading: loadingAudit,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ['attendance-audit-logs'],
    queryFn: () => attendanceApi.getAttendanceAuditLogs({ limit: 50 }),
  });

  // Global Refetch
  const handleRefetchAll = () => {
    refetchAttendances();
    refetchShifts();
    refetchEmpShifts();
    refetchLeaves();
    refetchOvertime();
    refetchTimesheets();
    refetchReport();
    refetchAudit();
  };

  // ================= Mutations =================
  const leaveStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: 'APPROVED' | 'REJECTED';
    }) => {
      setProcessingId(`leave-${id}`);
      return attendanceApi.updateLeaveStatus(id, status);
    },
    onSuccess: (_, variables) => {
      message.success(
        `Leave request ${variables.status.toLowerCase()} successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ['leave-requests-list'] });
      setProcessingId(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Action failed';
      message.error(msg);
      setProcessingId(null);
    },
  });

  const overtimeStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: 'APPROVED' | 'REJECTED';
    }) => {
      setProcessingId(`overtime-${id}`);
      return attendanceApi.updateOvertimeStatus(id, status);
    },
    onSuccess: (_, variables) => {
      message.success(
        `Overtime request ${variables.status.toLowerCase()} successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ['overtime-requests-list'] });
      setProcessingId(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Action failed';
      message.error(msg);
      setProcessingId(null);
    },
  });

  // ================= Metric Aggregations =================
  const departments = useMemo(() => {
    const map = new Map<number, string>();
    employees.forEach((e) => {
      if (e.department) map.set(e.department.id, e.department.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [employees]);

  const todayPresentCount = useMemo(() => {
    return attendances.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE',
    ).length;
  }, [attendances]);

  const lateArrivalsCount = useMemo(() => {
    return attendances.filter((a) => a.lateMinutes > 0 || a.status === 'LATE')
      .length;
  }, [attendances]);

  const missingCheckOutCount = useMemo(() => {
    return attendances.filter((a) => a.checkIn !== null && a.checkOut === null)
      .length;
  }, [attendances]);

  const pendingLeavesCount = useMemo(() => {
    return leaveRequests.filter((l) => l.status === 'SUBMITTED').length;
  }, [leaveRequests]);

  const pendingOvertimeCount = useMemo(() => {
    return overtimeRequests.filter((o) => o.status === 'SUBMITTED').length;
  }, [overtimeRequests]);

  // Exceptions dataset
  const exceptionRecords = useMemo(() => {
    return attendances.filter(
      (a) =>
        a.checkOut === null ||
        a.lateMinutes > 0 ||
        a.status === 'LATE' ||
        a.status === 'ABSENT',
    );
  }, [attendances]);

  // ================= Columns Definitions =================

  // 1. Daily Records Columns (Administrative review - NO clock in/out buttons)
  const attendanceColumns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (
        <div>
          <Text strong>
            {r.employee
              ? `${r.employee.firstName} ${r.employee.lastName}`
              : `ID: ${r.employeeId}`}
          </Text>
          <div style={{ fontSize: 12, color: '#888' }}>
            {r.employee?.employeeId} |{' '}
            {r.employee?.department?.name || 'No Dept'}
          </div>
        </div>
      ),
    },
    {
      title: `Date (${DOCUMENTED_TIMEZONE})`,
      dataIndex: 'date',
      key: 'date',
      render: (val) => formatDateOnly(val),
    },
    {
      title: 'Check-In',
      dataIndex: 'checkIn',
      key: 'checkIn',
      render: (val) => (val ? formatTimestamp(val) : <Tag>Not Punched</Tag>),
    },
    {
      title: 'Check-Out',
      dataIndex: 'checkOut',
      key: 'checkOut',
      render: (val) =>
        val ? formatTimestamp(val) : <Tag color="warning">Open (Unclosed)</Tag>,
    },
    {
      title: 'Working Hours',
      dataIndex: 'workingMinutes',
      key: 'workingMinutes',
      render: (val) => (
        <Text strong style={{ color: val > 0 ? '#1890ff' : '#888' }}>
          {formatWorkingDuration(val)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, r) => {
        let color = 'default';
        if (status === 'PRESENT') color = 'success';
        if (status === 'LATE') color = 'warning';
        if (status === 'ABSENT') color = 'error';
        if (status === 'LEAVE') color = 'purple';
        return (
          <Space>
            <Tag color={color}>{status}</Tag>
            {r.lateMinutes > 0 && (
              <Tag color="volcano">{r.lateMinutes}m Late</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailItem({ type: 'ATTENDANCE', data: r })}
          >
            Details
          </Button>
          <Button
            size="small"
            icon={<AuditOutlined />}
            onClick={() => {
              setSelectedRecordForCorrection(r);
              setCorrectionModalOpen(true);
            }}
          >
            Correct
          </Button>
        </Space>
      ),
    },
  ];

  // 2. Exceptions Columns
  const exceptionColumns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (
        <div>
          <Text strong>
            {r.employee
              ? `${r.employee.firstName} ${r.employee.lastName}`
              : `ID: ${r.employeeId}`}
          </Text>
          <div style={{ fontSize: 12, color: '#888' }}>
            {r.employee?.employeeId} |{' '}
            {r.employee?.department?.name || 'No Dept'}
          </div>
        </div>
      ),
    },
    {
      title: `Date (${DOCUMENTED_TIMEZONE})`,
      dataIndex: 'date',
      key: 'date',
      render: (val) => formatDateOnly(val),
    },
    {
      title: 'Exception Type',
      key: 'exceptionType',
      render: (_, r) => {
        if (r.checkIn && !r.checkOut) {
          return <Tag color="error">Missing Check-Out (Open Punch)</Tag>;
        }
        if (r.lateMinutes > 0) {
          return <Tag color="warning">Late Arrival ({r.lateMinutes} mins)</Tag>;
        }
        if (r.status === 'ABSENT') {
          return <Tag color="volcano">Unresolved Absence</Tag>;
        }
        return <Tag color="default">Review Required</Tag>;
      },
    },
    {
      title: 'Recorded Check-In',
      dataIndex: 'checkIn',
      key: 'checkIn',
      render: (val) => (val ? formatTimestamp(val) : <Tag>Missing</Tag>),
    },
    {
      title: 'Recorded Check-Out',
      dataIndex: 'checkOut',
      key: 'checkOut',
      render: (val) =>
        val ? formatTimestamp(val) : <Tag color="warning">Missing</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailItem({ type: 'ATTENDANCE', data: r })}
          >
            Details
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<AuditOutlined />}
            onClick={() => {
              setSelectedRecordForCorrection(r);
              setCorrectionModalOpen(true);
            }}
          >
            Submit Correction
          </Button>
        </Space>
      ),
    },
  ];

  // 3. Shift Columns
  const shiftColumns: ColumnsType<Shift> = [
    {
      title: 'Shift Name',
      dataIndex: 'name',
      key: 'name',
      render: (val) => <strong>{val}</strong>,
    },
    {
      title: 'Scheduled Hours',
      key: 'hours',
      render: (_, r) => `${r.startTime} — ${r.endTime}`,
    },
    {
      title: 'Break Duration',
      dataIndex: 'breakDuration',
      key: 'breakDuration',
      render: (val) => `${val} minutes`,
    },
    {
      title: 'Working Days',
      dataIndex: 'workingDays',
      key: 'workingDays',
      render: (val: string) => {
        const dayMap: Record<string, string> = {
          '1': 'Mon',
          '2': 'Tue',
          '3': 'Wed',
          '4': 'Thu',
          '5': 'Fri',
          '6': 'Sat',
          '7': 'Sun',
        };
        const days = val
          ? val
              .split(',')
              .map((d) => dayMap[d.trim()] || d)
              .join(', ')
          : '—';
        return <Tag color="blue">{days}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setDetailItem({ type: 'SHIFT', data: r })}
        >
          Details
        </Button>
      ),
    },
  ];

  // Staff Shift Assignment Columns
  const employeeShiftColumns: ColumnsType<EmployeeShift> = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (
        <div>
          <Text strong>
            {r.employee
              ? `${r.employee.firstName} ${r.employee.lastName}`
              : `ID: ${r.employeeId}`}
          </Text>
          <div style={{ fontSize: 12, color: '#888' }}>
            {r.employee?.employeeId} |{' '}
            {r.employee?.department?.name || 'No Dept'}
          </div>
        </div>
      ),
    },
    {
      title: 'Assigned Shift',
      key: 'shift',
      render: (_, r) => (
        <Tag color="cyan">{r.shift?.name || `Shift #${r.shiftId}`}</Tag>
      ),
    },
    {
      title: 'Shift Timings',
      key: 'timings',
      render: (_, r) =>
        r.shift ? `${r.shift.startTime} — ${r.shift.endTime}` : '—',
    },
    {
      title: `Effective Start (${DOCUMENTED_TIMEZONE})`,
      dataIndex: 'startDate',
      key: 'startDate',
      render: (val) => formatDateOnly(val),
    },
    {
      title: 'Effective End',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (val) =>
        val ? formatDateOnly(val) : <Tag color="green">Ongoing Active</Tag>,
    },
  ];

  // 4. Leave Request Columns
  const leaveColumns: ColumnsType<LeaveRequest> = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (
        <div>
          <Text strong>
            {r.employee
              ? `${r.employee.firstName} ${r.employee.lastName}`
              : `ID: ${r.employeeId}`}
          </Text>
          <div style={{ fontSize: 12, color: '#888' }}>
            {r.employee?.employeeId} |{' '}
            {r.employee?.department?.name || 'No Dept'}
          </div>
        </div>
      ),
    },
    {
      title: 'Leave Type',
      key: 'leaveType',
      render: (_, r) => (
        <Tag color="purple">
          {r.leaveType?.name || `Type #${r.leaveTypeId}`}
        </Tag>
      ),
    },
    {
      title: 'Period (UTC)',
      key: 'period',
      render: (_, r) =>
        `${formatDateOnly(r.startDate)} — ${formatDateOnly(r.endDate)}`,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'APPROVED') color = 'success';
        if (status === 'REJECTED') color = 'error';
        if (status === 'SUBMITTED') color = 'processing';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => {
        const isSelf = r.employee?.userId === currentUserId;
        const isProcessing = processingId === `leave-${r.id}`;

        if (r.status !== 'SUBMITTED') {
          return (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setDetailItem({ type: 'LEAVE', data: r })}
            >
              Details
            </Button>
          );
        }

        if (isSelf) {
          return (
            <Tooltip title="Self-approval is strictly blocked by company security policy. Another authorized HR officer must approve this request.">
              <Button size="small" disabled>
                Self-Approval Blocked
              </Button>
            </Tooltip>
          );
        }

        return (
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setDetailItem({ type: 'LEAVE', data: r })}
            >
              Details
            </Button>
            <Popconfirm
              title="Approve Leave Request"
              description="Are you sure you want to approve this leave request? Leave balance will be deducted atomically."
              onConfirm={() =>
                leaveStatusMutation.mutate({ id: r.id, status: 'APPROVED' })
              }
              okText="Approve"
              cancelText="Cancel"
              disabled={!!processingId}
            >
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={isProcessing}
                disabled={!!processingId}
              >
                Approve
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Reject Leave Request"
              description="Are you sure you want to reject this leave request?"
              onConfirm={() =>
                leaveStatusMutation.mutate({ id: r.id, status: 'REJECTED' })
              }
              okText="Reject"
              cancelText="Cancel"
              disabled={!!processingId}
            >
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                loading={isProcessing}
                disabled={!!processingId}
              >
                Reject
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // 5. Overtime Columns
  const overtimeColumns: ColumnsType<OvertimeRequest> = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (
        <div>
          <Text strong>
            {r.employee
              ? `${r.employee.firstName} ${r.employee.lastName}`
              : `ID: ${r.employeeId}`}
          </Text>
          <div style={{ fontSize: 12, color: '#888' }}>
            {r.employee?.employeeId} |{' '}
            {r.employee?.department?.name || 'No Dept'}
          </div>
        </div>
      ),
    },
    {
      title: `Date (${DOCUMENTED_TIMEZONE})`,
      dataIndex: 'date',
      key: 'date',
      render: (val) => formatDateOnly(val),
    },
    {
      title: 'Requested Hours',
      dataIndex: 'hours',
      key: 'hours',
      render: (val) => <strong>{val} hrs</strong>,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'APPROVED') color = 'success';
        if (status === 'REJECTED') color = 'error';
        if (status === 'SUBMITTED') color = 'processing';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => {
        const isSelf = r.employee?.userId === currentUserId;
        const isProcessing = processingId === `overtime-${r.id}`;

        if (r.status !== 'SUBMITTED') {
          return (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setDetailItem({ type: 'OVERTIME', data: r })}
            >
              Details
            </Button>
          );
        }

        if (isSelf) {
          return (
            <Tooltip title="Self-approval is strictly blocked by company security policy. Another authorized HR officer must approve this request.">
              <Button size="small" disabled>
                Self-Approval Blocked
              </Button>
            </Tooltip>
          );
        }

        return (
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setDetailItem({ type: 'OVERTIME', data: r })}
            >
              Details
            </Button>
            <Popconfirm
              title="Approve Overtime Request"
              description="Are you sure you want to approve this overtime request?"
              onConfirm={() =>
                overtimeStatusMutation.mutate({ id: r.id, status: 'APPROVED' })
              }
              okText="Approve"
              cancelText="Cancel"
              disabled={!!processingId}
            >
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={isProcessing}
                disabled={!!processingId}
              >
                Approve
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Reject Overtime Request"
              description="Are you sure you want to reject this overtime request?"
              onConfirm={() =>
                overtimeStatusMutation.mutate({ id: r.id, status: 'REJECTED' })
              }
              okText="Reject"
              cancelText="Cancel"
              disabled={!!processingId}
            >
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                loading={isProcessing}
                disabled={!!processingId}
              >
                Reject
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // 6. Timesheet Columns
  const timesheetColumns: ColumnsType<Timesheet> = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, r) => (
        <div>
          <Text strong>
            {r.employee
              ? `${r.employee.firstName} ${r.employee.lastName}`
              : `ID: ${r.employeeId}`}
          </Text>
          <div style={{ fontSize: 12, color: '#888' }}>
            {r.employee?.employeeId} |{' '}
            {r.employee?.department?.name || 'No Dept'}
          </div>
        </div>
      ),
    },
    {
      title: 'Period Range',
      key: 'period',
      render: (_, r) =>
        `${formatDateOnly(r.startDate)} — ${formatDateOnly(r.endDate)}`,
    },
    {
      title: 'Regular Hours',
      dataIndex: 'regularHours',
      key: 'regularHours',
      render: (val) => `${val} hrs`,
    },
    {
      title: 'Overtime Hours',
      dataIndex: 'overtimeHours',
      key: 'overtimeHours',
      render: (val) => (
        <span style={{ color: val > 0 ? '#fa8c16' : undefined }}>
          {val} hrs
        </span>
      ),
    },
    {
      title: 'Total Official Hours',
      dataIndex: 'totalHours',
      key: 'totalHours',
      render: (val) => <strong style={{ color: '#1677ff' }}>{val} hrs</strong>,
    },
    {
      title: 'Source of Truth',
      key: 'source',
      render: () => <Tag color="blue">Server Computed</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setDetailItem({ type: 'TIMESHEET', data: r })}
        >
          Details
        </Button>
      ),
    },
  ];

  // 7. Audit Log Columns
  const auditColumns: ColumnsType<any> = [
    {
      title: 'Timestamp (UTC)',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (val) => formatTimestamp(val),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (val: string) => <Tag color="geekblue">{val}</Tag>,
    },
    {
      title: 'Actor',
      key: 'actor',
      render: (_, r) => r.user?.email || `User ID: ${r.actorId ?? 'System'}`,
    },
    {
      title: 'Entity',
      key: 'entity',
      render: (_, r) => `${r.entityType || 'Record'} #${r.entityId || '—'}`,
    },
    {
      title: 'Changes / New Values',
      key: 'details',
      ellipsis: true,
      render: (_, r) => (
        <code style={{ fontSize: 11 }}>
          {r.newValues ? JSON.stringify(r.newValues) : '—'}
        </code>
      ),
    },
  ];

  // ================= Tab Items =================
  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <ClockCircleOutlined /> Attendance Overview
        </span>
      ),
      children: (
        <div>
          {/* Executive Summary Metrics */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} lg={4}>
              <Card bordered hoverable onClick={() => setActiveTab('records')}>
                <Statistic
                  title="Today's Punches"
                  value={todayPresentCount}
                  valueStyle={{ color: '#1890ff', fontWeight: 600 }}
                  prefix={<FieldTimeOutlined />}
                  suffix="active"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card
                bordered
                hoverable
                onClick={() => setActiveTab('exceptions')}
              >
                <Statistic
                  title="Late Arrivals"
                  value={lateArrivalsCount}
                  valueStyle={{
                    color: lateArrivalsCount > 0 ? '#fa8c16' : '#52c41a',
                    fontWeight: 600,
                  }}
                  prefix={<ExclamationCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card
                bordered
                hoverable
                onClick={() => setActiveTab('exceptions')}
              >
                <Statistic
                  title="Missing Check-Out"
                  value={missingCheckOutCount}
                  valueStyle={{
                    color: missingCheckOutCount > 0 ? '#ff4d4f' : '#52c41a',
                    fontWeight: 600,
                  }}
                  prefix={<WarningOutlined />}
                  suffix="open"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card bordered hoverable onClick={() => setActiveTab('shifts')}>
                <Statistic
                  title="Configured Shifts"
                  value={shifts.length}
                  valueStyle={{ color: '#722ed1', fontWeight: 600 }}
                  prefix={<ScheduleOutlined />}
                  suffix="templates"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card bordered hoverable onClick={() => setActiveTab('leaves')}>
                <Statistic
                  title="Pending Leaves"
                  value={pendingLeavesCount}
                  valueStyle={{
                    color: pendingLeavesCount > 0 ? '#13c2c2' : '#888',
                    fontWeight: 600,
                  }}
                  prefix={<CalendarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card bordered hoverable onClick={() => setActiveTab('overtime')}>
                <Statistic
                  title="Pending Overtime"
                  value={pendingOvertimeCount}
                  valueStyle={{
                    color: pendingOvertimeCount > 0 ? '#eb2f96' : '#888',
                    fontWeight: 600,
                  }}
                  prefix={<FieldTimeOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Alert
            message="Real-World HR Operation Principle"
            description="HR Attendance officers administer, review, and audit records; employees punch in/out using authorized biometric devices or employee self-service. Any HR corrections must preserve original data and require mandatory business justification."
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="Quick Review Shortcuts" bordered>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button
                    block
                    type="primary"
                    onClick={() => setActiveTab('records')}
                  >
                    Inspect Daily Attendance Records ({attendances.length}{' '}
                    total)
                  </Button>
                  <Button block onClick={() => setActiveTab('exceptions')}>
                    Review Attendance Exceptions ({exceptionRecords.length}{' '}
                    flagged)
                  </Button>
                  <Button block onClick={() => setActiveTab('corrections')}>
                    Employee Correction Requests Desk
                  </Button>
                  <Button block onClick={() => setActiveTab('leaves')}>
                    Leave Approvals Desk ({pendingLeavesCount} pending)
                  </Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Operational Governance" bordered>
                <div style={{ fontSize: 13, lineHeight: '22px' }}>
                  <p>
                    <SafetyCertificateOutlined
                      style={{ color: '#52c41a', marginRight: 8 }}
                    />
                    <strong>Self-Approval Prevention:</strong> Officers cannot
                    approve their own leave or overtime requests.
                  </p>
                  <p>
                    <ClockCircleOutlined
                      style={{ color: '#1890ff', marginRight: 8 }}
                    />
                    <strong>Documented Timezone:</strong> All dates, timestamps,
                    and durations adhere to documented standard UTC.
                  </p>
                  <p>
                    <HistoryOutlined
                      style={{ color: '#722ed1', marginRight: 8 }}
                    />
                    <strong>Full Audit Trail:</strong> All record status changes
                    and shift assignments are recorded in system audit logs.
                  </p>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'records',
      label: (
        <span>
          <FieldTimeOutlined /> Daily Records
        </span>
      ),
      children: (
        <div>
          {/* Subtitle explaining HR Administrative Role */}
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              Review officially recorded employee attendance punches, working
              hours, and statuses. Employees record attendance via approved
              devices or portals.
            </Text>
          </div>

          {/* Filter Bar */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 8]} align="middle" justify="space-between">
              <Col xs={24} sm={16}>
                <Space wrap>
                  <Select
                    allowClear
                    placeholder="Filter by Employee..."
                    style={{ width: 220 }}
                    value={selectedEmployeeId}
                    onChange={(val) => setSelectedEmployeeId(val)}
                  >
                    {employees.map((emp) => (
                      <Select.Option key={emp.id} value={emp.id}>
                        {emp.employeeId} - {emp.firstName} {emp.lastName}
                      </Select.Option>
                    ))}
                  </Select>

                  <Select
                    allowClear
                    placeholder="Filter by Status..."
                    style={{ width: 160 }}
                    value={selectedStatus}
                    onChange={(val) => setSelectedStatus(val)}
                  >
                    <Select.Option value="PRESENT">PRESENT</Select.Option>
                    <Select.Option value="LATE">LATE</Select.Option>
                    <Select.Option value="ABSENT">ABSENT</Select.Option>
                    <Select.Option value="LEAVE">LEAVE</Select.Option>
                  </Select>

                  {(selectedEmployeeId || selectedStatus) && (
                    <Button
                      onClick={() => {
                        setSelectedEmployeeId(undefined);
                        setSelectedStatus(undefined);
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Space>
              </Col>
              <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                <Button
                  icon={<AuditOutlined />}
                  onClick={() => {
                    setSelectedRecordForCorrection(null);
                    setCorrectionModalOpen(true);
                  }}
                >
                  Request Correction
                </Button>
              </Col>
            </Row>
          </Card>

          <Table
            columns={attendanceColumns}
            dataSource={attendances}
            rowKey="id"
            loading={loadingAttendances}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            bordered
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No attendance records found for the selected criteria"
                />
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: 'exceptions',
      label: (
        <span>
          <Badge count={exceptionRecords.length} size="small" offset={[6, -2]}>
            <ExclamationCircleOutlined /> Attendance Exceptions
          </Badge>
        </span>
      ),
      children: (
        <div>
          <Alert
            message="Unresolved Attendance Exceptions"
            description="Identifies employees with missing check-outs (open punches), excessive late arrivals, or unexcused absences requiring HR review or correction submission."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Table
            columns={exceptionColumns}
            dataSource={exceptionRecords}
            rowKey="id"
            loading={loadingAttendances}
            pagination={{ pageSize: 10 }}
            bordered
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No attendance exceptions currently detected"
                />
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: 'corrections',
      label: (
        <span>
          <AuditOutlined /> Correction Requests
        </span>
      ),
      children: (
        <div>
          <Alert
            message="Attendance Correction Governance & Audit Model"
            description="To maintain attendance integrity, administrative corrections must capture proposed timestamps, preserve the original punch values, require mandatory business justification, and log the acting HR officer in the system audit trail. Note: A dedicated multi-stage employee submission & approval schema model (AttendanceCorrection) is currently pending backend provisioning; adjustments are tracked directly via Attendance Audit Logs."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedRecordForCorrection(null);
                setCorrectionModalOpen(true);
              }}
            >
              Submit New Correction
            </Button>
          </div>

          <Card title="Recent Administrative Attendance Adjustments" bordered>
            <Table
              columns={auditColumns}
              dataSource={auditLogData?.logs || []}
              rowKey="id"
              loading={loadingAudit}
              pagination={{ pageSize: 10 }}
              bordered
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No attendance adjustments recorded in audit log yet"
                  />
                ),
              }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'leaves',
      label: (
        <span>
          <Badge count={pendingLeavesCount} size="small" offset={[6, -2]}>
            <CalendarOutlined /> Leave Reference & Approvals
          </Badge>
        </span>
      ),
      children: (
        <div>
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <Space wrap>
              <Text strong>Configured Leave Types:</Text>
              {leaveTypes.map((lt) => (
                <Tag color="cyan" key={lt.id}>
                  {lt.name} ({lt.daysAllowed} days
                  {lt.isPaid ? ' / Paid' : ' / Unpaid'})
                </Tag>
              ))}
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateLeaveOpen(true)}
            >
              Apply Leave Request
            </Button>
          </div>

          <Table
            columns={leaveColumns}
            dataSource={leaveRequests}
            rowKey="id"
            loading={loadingLeaves}
            pagination={{ pageSize: 10 }}
            bordered
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No leave requests logged"
                />
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: 'shifts',
      label: (
        <span>
          <ScheduleOutlined /> Shifts & Rostering
        </span>
      ),
      children: (
        <div>
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <Text type="secondary">
              Configure organizational shift schedules, working day masks, and
              assign roster timings to staff.
            </Text>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateShiftOpen(true)}
              >
                Create Shift
              </Button>
              <Button
                icon={<UserSwitchOutlined />}
                onClick={() => setAssignShiftOpen(true)}
              >
                Assign Shift to Staff
              </Button>
            </Space>
          </div>

          <Card title="Shift Templates" style={{ marginBottom: 20 }} bordered>
            <Table
              columns={shiftColumns}
              dataSource={shifts}
              rowKey="id"
              loading={loadingShifts}
              pagination={false}
              bordered
            />
          </Card>

          <Card
            title={`Staff Shift Assignments (${employeeShifts.length})`}
            bordered
          >
            <Table
              columns={employeeShiftColumns}
              dataSource={employeeShifts}
              rowKey="id"
              loading={loadingEmpShifts}
              pagination={{ pageSize: 10 }}
              bordered
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'overtime',
      label: (
        <span>
          <Badge count={pendingOvertimeCount} size="small" offset={[6, -2]}>
            <FieldTimeOutlined /> Overtime Review
          </Badge>
        </span>
      ),
      children: (
        <div>
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <Text type="secondary">
              Review and approve employee overtime claims. Official overtime is
              subject to verification against logged work hours.
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOvertimeOpen(true)}
            >
              Submit Overtime Request
            </Button>
          </div>

          <Table
            columns={overtimeColumns}
            dataSource={overtimeRequests}
            rowKey="id"
            loading={loadingOvertime}
            pagination={{ pageSize: 10 }}
            bordered
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No overtime requests logged"
                />
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: 'timesheets',
      label: (
        <span>
          <FileTextOutlined /> Timesheets
        </span>
      ),
      children: (
        <div>
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <Text type="secondary">
              Official regular and overtime totals calculated strictly by
              backend business logic.
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setGenerateTimesheetOpen(true)}
            >
              Generate Timesheet
            </Button>
          </div>

          <Table
            columns={timesheetColumns}
            dataSource={timesheets}
            rowKey="id"
            loading={loadingTimesheets}
            pagination={{ pageSize: 10 }}
            bordered
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No timesheets generated yet"
                />
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: 'reports',
      label: (
        <span>
          <BarChartOutlined /> Attendance Reports
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Text strong>Filter by Department:</Text>
              <Select
                allowClear
                placeholder="All Departments"
                style={{ width: 220 }}
                value={selectedDepartmentId}
                onChange={(val) => setSelectedDepartmentId(val)}
              >
                {departments.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.name}
                  </Select.Option>
                ))}
              </Select>
            </Space>
          </div>

          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={8}>
              <Card bordered>
                <Statistic
                  title="Total Approved Overtime"
                  value={reportData?.totalOvertimeHours || 0}
                  suffix="hours"
                  valueStyle={{ color: '#fa8c16' }}
                  prefix={<FieldTimeOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card bordered>
                <Statistic
                  title="Attendance Categories"
                  value={Object.keys(reportData?.attendance || {}).length}
                  prefix={<CheckOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card bordered>
                <Statistic
                  title="Leave Request Categories"
                  value={Object.keys(reportData?.leaves || {}).length}
                  prefix={<CalendarOutlined style={{ color: '#1677ff' }} />}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card
                title="Attendance by Status"
                bordered
                loading={loadingReport}
              >
                {Object.keys(reportData?.attendance || {}).length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No attendance records in reporting window"
                  />
                ) : (
                  <Space wrap>
                    {Object.entries(reportData?.attendance || {}).map(
                      ([st, cnt]) => (
                        <Tag
                          key={st}
                          color="blue"
                          style={{ padding: '6px 12px', fontSize: 13 }}
                        >
                          {st}: <strong>{cnt as number}</strong>
                        </Tag>
                      ),
                    )}
                  </Space>
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                title="Leave Requests by Status"
                bordered
                loading={loadingReport}
              >
                {Object.keys(reportData?.leaves || {}).length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No leave requests in reporting window"
                  />
                ) : (
                  <Space wrap>
                    {Object.entries(reportData?.leaves || {}).map(
                      ([st, cnt]) => (
                        <Tag
                          key={st}
                          color="cyan"
                          style={{ padding: '6px 12px', fontSize: 13 }}
                        >
                          {st}: <strong>{cnt as number}</strong>
                        </Tag>
                      ),
                    )}
                  </Space>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'audit',
      label: (
        <span>
          <HistoryOutlined /> Audit History
        </span>
      ),
      children: (
        <div>
          <Alert
            message="System Audit Trail (Attendance Module)"
            description="Cryptographically tracked history of check-in, check-out, leave approvals, overtime approvals, and shift modifications with actor identification."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Table
            columns={auditColumns}
            dataSource={auditLogData?.logs || []}
            rowKey="id"
            loading={loadingAudit}
            pagination={{ pageSize: 15 }}
            bordered
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No audit logs recorded for Attendance module yet"
                />
              ),
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <ClockCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Attendance Management
          </Title>
          <Space style={{ marginTop: 4 }}>
            <Text type="secondary">
              Administrative attendance monitoring, exceptions, corrections,
              leave reference & overtime audit
            </Text>
            <Tag color="geekblue" variant="filled">
              Documented Timezone: {DOCUMENTED_TIMEZONE}
            </Tag>
          </Space>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={handleRefetchAll}>
            Refresh
          </Button>
        </Space>
      </div>

      {/* Main Tabs Container */}
      <Card bordered>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          items={tabItems}
          destroyInactiveTabPane={false}
        />
      </Card>

      {/* Modals & Drawers */}
      <AttendanceCorrectionModal
        open={correctionModalOpen}
        onClose={() => {
          setCorrectionModalOpen(false);
          setSelectedRecordForCorrection(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
          queryClient.invalidateQueries({
            queryKey: ['attendance-audit-logs'],
          });
        }}
        employees={employees}
        selectedRecord={selectedRecordForCorrection}
      />

      <CreateShiftModal
        open={createShiftOpen}
        onClose={() => setCreateShiftOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['shifts-list'] });
        }}
      />

      <AssignShiftModal
        open={assignShiftOpen}
        onClose={() => setAssignShiftOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['employee-shifts-list'] });
        }}
        employees={employees}
        shifts={shifts}
      />

      <CreateLeaveModal
        open={createLeaveOpen}
        onClose={() => setCreateLeaveOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['leave-requests-list'] });
        }}
        employees={employees}
        leaveTypes={leaveTypes}
      />

      <CreateOvertimeModal
        open={createOvertimeOpen}
        onClose={() => setCreateOvertimeOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ['overtime-requests-list'],
          });
        }}
        employees={employees}
      />

      <GenerateTimesheetModal
        open={generateTimesheetOpen}
        onClose={() => setGenerateTimesheetOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['timesheets-list'] });
        }}
        employees={employees}
      />

      <AttendanceDetailDrawer
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        item={detailItem}
      />
    </div>
  );
};
