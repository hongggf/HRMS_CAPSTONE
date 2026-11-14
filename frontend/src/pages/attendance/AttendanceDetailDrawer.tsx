import React from 'react';
import { Drawer, Descriptions, Tag, Typography } from 'antd';
import {
  formatDateOnly,
  formatTimestamp,
  formatWorkingDuration,
  DOCUMENTED_TIMEZONE,
} from '../../utils/dateUtils';
import {
  AttendanceRecord,
  LeaveRequest,
  OvertimeRequest,
  Timesheet,
  Shift,
} from '../../types/attendance';

const { Title, Text } = Typography;

export type DetailItem =
  | { type: 'ATTENDANCE'; data: AttendanceRecord }
  | { type: 'LEAVE'; data: LeaveRequest }
  | { type: 'OVERTIME'; data: OvertimeRequest }
  | { type: 'TIMESHEET'; data: Timesheet }
  | { type: 'SHIFT'; data: Shift };

interface AttendanceDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  item: DetailItem | null;
}

export const AttendanceDetailDrawer: React.FC<AttendanceDetailDrawerProps> = ({
  open,
  onClose,
  item,
}) => {
  if (!item) return null;

  const renderContent = () => {
    switch (item.type) {
      case 'ATTENDANCE': {
        const att = item.data;
        return (
          <>
            <Title level={5}>Attendance Punch Details</Title>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Record ID">#{att.id}</Descriptions.Item>
              <Descriptions.Item label="Employee">
                {att.employee
                  ? `${att.employee.employeeId} - ${att.employee.firstName} ${att.employee.lastName}`
                  : `ID: ${att.employeeId}`}
              </Descriptions.Item>
              <Descriptions.Item label="Department">
                {att.employee?.department?.name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Date (UTC)">
                {formatDateOnly(att.date)}
              </Descriptions.Item>
              <Descriptions.Item label="Check-In Time">
                {formatTimestamp(att.checkIn)}
              </Descriptions.Item>
              <Descriptions.Item label="Check-Out Time">
                {formatTimestamp(att.checkOut)}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    att.status === 'PRESENT'
                      ? 'green'
                      : att.status === 'LATE'
                        ? 'orange'
                        : att.status === 'ABSENT'
                          ? 'red'
                          : 'blue'
                  }
                >
                  {att.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Late Minutes">
                {att.lateMinutes > 0 ? `${att.lateMinutes} mins` : 'On Time'}
              </Descriptions.Item>
              <Descriptions.Item label="Working Duration">
                <strong>{formatWorkingDuration(att.workingMinutes)}</strong> (
                {att.workingMinutes} mins)
              </Descriptions.Item>
              <Descriptions.Item label="System Timezone">
                {DOCUMENTED_TIMEZONE}
              </Descriptions.Item>
            </Descriptions>
          </>
        );
      }

      case 'LEAVE': {
        const leave = item.data;
        return (
          <>
            <Title level={5}>Leave Request Details</Title>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Request ID">
                #{leave.id}
              </Descriptions.Item>
              <Descriptions.Item label="Employee">
                {leave.employee
                  ? `${leave.employee.employeeId} - ${leave.employee.firstName} ${leave.employee.lastName}`
                  : `ID: ${leave.employeeId}`}
              </Descriptions.Item>
              <Descriptions.Item label="Leave Type">
                {leave.leaveType?.name || `ID: ${leave.leaveTypeId}`}
              </Descriptions.Item>
              <Descriptions.Item label="Period">
                {formatDateOnly(leave.startDate)} to{' '}
                {formatDateOnly(leave.endDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    leave.status === 'APPROVED'
                      ? 'green'
                      : leave.status === 'REJECTED'
                        ? 'red'
                        : leave.status === 'SUBMITTED'
                          ? 'gold'
                          : 'default'
                  }
                >
                  {leave.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Reason">
                <Text>{leave.reason || '—'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Approver">
                {leave.approver?.email ||
                  (leave.approvedBy ? `User #${leave.approvedBy}` : 'Pending')}
              </Descriptions.Item>
              <Descriptions.Item label="Submitted At">
                {formatTimestamp(leave.createdAt)}
              </Descriptions.Item>
            </Descriptions>
          </>
        );
      }

      case 'OVERTIME': {
        const ot = item.data;
        return (
          <>
            <Title level={5}>Overtime Request Details</Title>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Request ID">#{ot.id}</Descriptions.Item>
              <Descriptions.Item label="Employee">
                {ot.employee
                  ? `${ot.employee.employeeId} - ${ot.employee.firstName} ${ot.employee.lastName}`
                  : `ID: ${ot.employeeId}`}
              </Descriptions.Item>
              <Descriptions.Item label="Date (UTC)">
                {formatDateOnly(ot.date)}
              </Descriptions.Item>
              <Descriptions.Item label="Hours Requested">
                <strong>{ot.hours} hrs</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    ot.status === 'APPROVED'
                      ? 'green'
                      : ot.status === 'REJECTED'
                        ? 'red'
                        : ot.status === 'SUBMITTED'
                          ? 'gold'
                          : 'default'
                  }
                >
                  {ot.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Reason">
                <Text>{ot.reason || '—'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Approver">
                {ot.approver?.email ||
                  (ot.approvedBy ? `User #${ot.approvedBy}` : 'Pending')}
              </Descriptions.Item>
              <Descriptions.Item label="Submitted At">
                {formatTimestamp(ot.createdAt)}
              </Descriptions.Item>
            </Descriptions>
          </>
        );
      }

      case 'TIMESHEET': {
        const ts = item.data;
        return (
          <>
            <Title level={5}>Timesheet Calculation Details</Title>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Timesheet ID">
                #{ts.id}
              </Descriptions.Item>
              <Descriptions.Item label="Employee">
                {ts.employee
                  ? `${ts.employee.employeeId} - ${ts.employee.firstName} ${ts.employee.lastName}`
                  : `ID: ${ts.employeeId}`}
              </Descriptions.Item>
              <Descriptions.Item label="Period">
                {formatDateOnly(ts.startDate)} to {formatDateOnly(ts.endDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Regular Hours">
                {ts.regularHours} hrs
              </Descriptions.Item>
              <Descriptions.Item label="Overtime Hours">
                <strong style={{ color: '#fa8c16' }}>
                  {ts.overtimeHours} hrs
                </strong>
              </Descriptions.Item>
              <Descriptions.Item label="Total Hours">
                <strong style={{ color: '#52c41a' }}>
                  {ts.totalHours} hrs
                </strong>
              </Descriptions.Item>
              <Descriptions.Item label="Calculation Truth">
                Backend Server Verified
              </Descriptions.Item>
            </Descriptions>
          </>
        );
      }

      case 'SHIFT': {
        const shift = item.data;
        return (
          <>
            <Title level={5}>Shift Schedule Details</Title>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Shift ID">
                #{shift.id}
              </Descriptions.Item>
              <Descriptions.Item label="Shift Name">
                <strong>{shift.name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Working Hours">
                {shift.startTime} — {shift.endTime}
              </Descriptions.Item>
              <Descriptions.Item label="Break Duration">
                {shift.breakDuration} minutes
              </Descriptions.Item>
              <Descriptions.Item label="Working Days">
                {shift.workingDays}
              </Descriptions.Item>
              <Descriptions.Item label="Assigned Employees">
                {shift._count?.employeeShifts ?? '—'}
              </Descriptions.Item>
            </Descriptions>
          </>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Drawer
      title="Attendance & Schedule Record Detail"
      placement="right"
      width={480}
      onClose={onClose}
      open={open}
    >
      {renderContent()}
    </Drawer>
  );
};
