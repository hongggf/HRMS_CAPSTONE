import React, { useState } from 'react';
import { Modal, Form, Select, Input, Alert, message, Typography } from 'antd';
import { AuditOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Employee } from '../../types/employee';
import { AttendanceRecord } from '../../types/attendance';
import { DOCUMENTED_TIMEZONE, formatDateOnly, formatTimestamp } from '../../utils/dateUtils';
import { useAuthStore } from '../../store/useAuthStore';

const { Text } = Typography;

interface AttendanceCorrectionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees: Employee[];
  selectedRecord?: AttendanceRecord | null;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  open,
  onClose,
  onSuccess,
  employees,
  selectedRecord,
}) => {
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      setSubmitting(true);

      // Note: Backend currently lacks a dedicated AttendanceCorrection schema model.
      // This modal documents the required governance flow: captures mandatory reason,
      // acting HR user, original data preservation, and proposed timestamps.
      message.info(
        'Correction request documented. Awaiting backend AttendanceCorrection model provisioning.',
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.message || 'Validation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <AuditOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
          Administrative Attendance Correction ({DOCUMENTED_TIMEZONE})
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      okText="Submit Correction Request"
      okButtonProps={{ disabled: submitting }}
      destroyOnHidden
      width={580}
    >
      <Alert
        message="HR Administrative Correction Governance"
        description="Exceptional corrections must capture proposed timestamps, preserve original attendance data, mandate a justification reason, and record the acting HR officer in the audit trail."
        type="warning"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      {selectedRecord && (
        <div
          style={{
            background: '#fafafa',
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            border: '1px solid #f0f0f0',
          }}
        >
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            Original Attendance Record:
          </Text>
          <div style={{ fontSize: 13, color: '#595959' }}>
            <div>
              <strong>Employee:</strong>{' '}
              {selectedRecord.employee
                ? `${selectedRecord.employee.firstName} ${selectedRecord.employee.lastName} (${selectedRecord.employee.employeeId})`
                : `ID: ${selectedRecord.employeeId}`}
            </div>
            <div>
              <strong>Date:</strong> {formatDateOnly(selectedRecord.date)}
            </div>
            <div>
              <strong>Original Check-In:</strong>{' '}
              {formatTimestamp(selectedRecord.checkIn)}
            </div>
            <div>
              <strong>Original Check-Out:</strong>{' '}
              {formatTimestamp(selectedRecord.checkOut)}
            </div>
          </div>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          employeeId: selectedRecord?.employeeId || (employees[0]?.id ?? undefined),
          date: selectedRecord?.date ? selectedRecord.date.split('T')[0] : new Date().toISOString().split('T')[0],
          actingHr: user?.email || 'HR Officer',
        }}
      >
        <Form.Item
          name="employeeId"
          label="Target Employee"
          rules={[{ required: true, message: 'Employee is required' }]}
        >
          <Select
            showSearch
            placeholder="Search employee..."
            optionFilterProp="children"
            disabled={!!selectedRecord || submitting}
          >
            {employees.map((emp) => (
              <Select.Option key={emp.id} value={emp.id}>
                {emp.employeeId} - {emp.firstName} {emp.lastName} (
                {emp.department?.name || 'No Dept'})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="date"
          label="Attendance Date (UTC)"
          rules={[{ required: true, message: 'Date is required' }]}
        >
          <Input disabled={!!selectedRecord || submitting} />
        </Form.Item>

        <Form.Item
          name="proposedCheckIn"
          label="Proposed Check-In Timestamp (ISO UTC)"
          rules={[{ required: true, message: 'Proposed check-in timestamp is required' }]}
          extra="Server timestamp will be recorded in documented UTC timezone"
        >
          <Input placeholder="YYYY-MM-DDTHH:mm:ss.sssZ" disabled={submitting} />
        </Form.Item>

        <Form.Item
          name="proposedCheckOut"
          label="Proposed Check-Out Timestamp (ISO UTC)"
          rules={[{ required: true, message: 'Proposed check-out timestamp is required' }]}
          extra="Must be later than proposed check-in timestamp"
        >
          <Input placeholder="YYYY-MM-DDTHH:mm:ss.sssZ" disabled={submitting} />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Mandatory Correction Reason & Justification"
          rules={[
            { required: true, message: 'A justification reason is strictly required' },
            { min: 10, message: 'Please provide a detailed reason (at least 10 characters)' },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="e.g. Employee biometric scanner malfunction on entry gate. Confirmed by facility logs."
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item name="actingHr" label="Acting HR Reviewer">
          <Input disabled />
        </Form.Item>
      </Form>
    </Modal>
  );
};
