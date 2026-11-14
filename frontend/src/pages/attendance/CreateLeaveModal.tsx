import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Alert, message, Tag } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { attendanceApi } from '../../api/attendance';
import { Employee } from '../../types/employee';
import { LeaveType } from '../../types/attendance';

interface CreateLeaveModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees: Employee[];
  leaveTypes: LeaveType[];
  defaultEmployeeId?: number;
}

export const CreateLeaveModal: React.FC<CreateLeaveModalProps> = ({
  open,
  onClose,
  onSuccess,
  employees,
  leaveTypes,
  defaultEmployeeId,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);

  useEffect(() => {
    if (open) {
      setBackendError(null);
      const today = new Date();
      const tomorrow = new Date(Date.now() + 86400000);
      form.setFieldsValue({
        employeeId:
          defaultEmployeeId ||
          (employees.length > 0 ? employees[0].id : undefined),
        leaveTypeId: leaveTypes.length > 0 ? leaveTypes[0].id : undefined,
        startDate: today.toISOString().split('T')[0] + 'T00:00:00.000Z',
        endDate: tomorrow.toISOString().split('T')[0] + 'T00:00:00.000Z',
      });
      if (leaveTypes.length > 0) setSelectedType(leaveTypes[0]);
    }
  }, [open, defaultEmployeeId, employees, leaveTypes, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Frontend sanity check: start <= end
      const start = new Date(values.startDate);
      const end = new Date(values.endDate);
      if (end.getTime() < start.getTime()) {
        setBackendError('End date cannot be earlier than start date');
        return;
      }

      setSubmitting(true);
      setBackendError(null);

      await attendanceApi.createLeaveRequest({
        employeeId: Number(values.employeeId),
        leaveTypeId: Number(values.leaveTypeId),
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason.trim(),
      });

      message.success('Leave request submitted successfully');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.errorFields) return;
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Failed to submit leave request';
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
          <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Submit Leave Request
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      okText="Submit Leave Request"
      destroyOnClose
    >
      {backendError && (
        <Alert
          message="Leave Request Error"
          description={backendError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setBackendError(null)}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="employeeId"
          label="Employee"
          rules={[{ required: true, message: 'Please select an employee' }]}
        >
          <Select
            showSearch
            placeholder="Select employee..."
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

        <Form.Item
          name="leaveTypeId"
          label="Leave Type"
          rules={[{ required: true, message: 'Please select leave type' }]}
        >
          <Select
            placeholder="Select leave type..."
            disabled={submitting}
            onChange={(val) => {
              const lt = leaveTypes.find((t) => t.id === val);
              setSelectedType(lt || null);
            }}
          >
            {leaveTypes.map((type) => (
              <Select.Option key={type.id} value={type.id}>
                {type.name} ({type.daysAllowed} days allowed)
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {selectedType && (
          <div style={{ marginBottom: 16 }}>
            <Tag color={selectedType.isPaid ? 'green' : 'orange'}>
              {selectedType.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
            </Tag>
            <Tag color={selectedType.requiresBalance ? 'blue' : 'default'}>
              {selectedType.requiresBalance
                ? 'Deducts Balance'
                : 'No Balance Required'}
            </Tag>
            {selectedType.description && (
              <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                {selectedType.description}
              </span>
            )}
          </div>
        )}

        <Form.Item
          name="startDate"
          label="Start Date (ISO UTC)"
          rules={[{ required: true, message: 'Start date is required' }]}
          extra="e.g. 2026-12-01T00:00:00.000Z"
        >
          <Input disabled={submitting} />
        </Form.Item>

        <Form.Item
          name="endDate"
          label="End Date (ISO UTC)"
          rules={[{ required: true, message: 'End date is required' }]}
          extra="e.g. 2026-12-05T00:00:00.000Z"
        >
          <Input disabled={submitting} />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Reason / Justification"
          rules={[
            { required: true, message: 'Please provide reason for leave' },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Detail the purpose for taking leave..."
            disabled={submitting}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
