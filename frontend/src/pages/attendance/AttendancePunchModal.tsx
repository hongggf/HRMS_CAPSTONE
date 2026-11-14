import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Radio, Input, Alert, message } from 'antd';
import {
  ClockCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { attendanceApi } from '../../api/attendance';
import { Employee } from '../../types/employee';
import { DOCUMENTED_TIMEZONE } from '../../utils/dateUtils';

interface AttendancePunchModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees: Employee[];
  defaultEmployeeId?: number;
}

export const AttendancePunchModal: React.FC<AttendancePunchModalProps> = ({
  open,
  onClose,
  onSuccess,
  employees,
  defaultEmployeeId,
}) => {
  const [form] = Form.useForm();
  const [punchType, setPunchType] = useState<'IN' | 'OUT'>('IN');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBackendError(null);
      const now = new Date();
      const isoString = now.toISOString();
      form.setFieldsValue({
        punchType: 'IN',
        employeeId:
          defaultEmployeeId ||
          (employees.length > 0 ? employees[0].id : undefined),
        date: isoString.split('T')[0] + 'T00:00:00.000Z',
        time: isoString,
      });
      setPunchType('IN');
    }
  }, [open, defaultEmployeeId, employees, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setBackendError(null);

      if (punchType === 'IN') {
        await attendanceApi.checkIn({
          employeeId: Number(values.employeeId),
          date: values.date,
          time: values.time,
        });
        message.success('Check-in recorded successfully');
      } else {
        await attendanceApi.checkOut(undefined, {
          employeeId: Number(values.employeeId),
          time: values.time,
        });
        message.success('Check-out recorded successfully');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.errorFields) return; // Form validation error
      const msg =
        err.response?.data?.error || err.message || 'Failed to submit punch';
      setBackendError(msg);
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <ClockCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Record Attendance Punch ({DOCUMENTED_TIMEZONE})
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      okText={punchType === 'IN' ? 'Confirm Check-In' : 'Confirm Check-Out'}
      destroyOnClose
    >
      {backendError && (
        <Alert
          message="Submission Error"
          description={backendError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setBackendError(null)}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item name="punchType" label="Punch Action" initialValue="IN">
          <Radio.Group
            onChange={(e) => {
              setPunchType(e.target.value);
              setBackendError(null);
            }}
            buttonStyle="solid"
            style={{ width: '100%', display: 'flex' }}
          >
            <Radio.Button value="IN" style={{ flex: 1, textAlign: 'center' }}>
              <LoginOutlined style={{ marginRight: 4 }} /> Check-In
            </Radio.Button>
            <Radio.Button value="OUT" style={{ flex: 1, textAlign: 'center' }}>
              <LogoutOutlined style={{ marginRight: 4 }} /> Check-Out
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="employeeId"
          label="Employee"
          rules={[{ required: true, message: 'Please select an employee' }]}
        >
          <Select
            showSearch
            placeholder="Search employee..."
            optionFilterProp="children"
            disabled={submitting}
          >
            {employees.map((emp) => (
              <Select.Option key={emp.id} value={emp.id}>
                {emp.employeeId} - {emp.firstName} {emp.lastName} (
                {emp.department?.name || 'No Dept'})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {punchType === 'IN' && (
          <Form.Item
            name="date"
            label="Attendance Date (ISO UTC)"
            rules={[{ required: true, message: 'Date is required' }]}
            extra="Documented standard: UTC Date boundaries"
          >
            <Input disabled={submitting} />
          </Form.Item>
        )}

        <Form.Item
          name="time"
          label="Punch Time (ISO UTC)"
          rules={[{ required: true, message: 'Time is required' }]}
          extra="Server timestamp will be recorded in documented UTC timezone"
        >
          <Input disabled={submitting} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
