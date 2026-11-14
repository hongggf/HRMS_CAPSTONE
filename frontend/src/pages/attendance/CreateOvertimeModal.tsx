import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, InputNumber, Alert, message } from 'antd';
import { FieldTimeOutlined } from '@ant-design/icons';
import { attendanceApi } from '../../api/attendance';
import { Employee } from '../../types/employee';

interface CreateOvertimeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees: Employee[];
  defaultEmployeeId?: number;
}

export const CreateOvertimeModal: React.FC<CreateOvertimeModalProps> = ({
  open,
  onClose,
  onSuccess,
  employees,
  defaultEmployeeId,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBackendError(null);
      const now = new Date();
      form.setFieldsValue({
        employeeId:
          defaultEmployeeId ||
          (employees.length > 0 ? employees[0].id : undefined),
        date: now.toISOString().split('T')[0] + 'T00:00:00.000Z',
        hours: 2,
      });
    }
  }, [open, defaultEmployeeId, employees, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setBackendError(null);

      await attendanceApi.createOvertimeRequest({
        employeeId: Number(values.employeeId),
        date: values.date,
        hours: Number(values.hours),
        reason: values.reason.trim(),
      });

      message.success('Overtime request submitted successfully');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.errorFields) return;
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Failed to submit overtime request';
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
          <FieldTimeOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Submit Overtime Request
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      okText="Submit Overtime"
      destroyOnClose
    >
      {backendError && (
        <Alert
          message="Overtime Submission Error"
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
          name="date"
          label="Overtime Date (ISO UTC)"
          rules={[{ required: true, message: 'Date is required' }]}
          extra="e.g. 2026-10-06T00:00:00.000Z"
        >
          <Input disabled={submitting} />
        </Form.Item>

        <Form.Item
          name="hours"
          label="Estimated Hours"
          rules={[
            { required: true, message: 'Hours is required' },
            {
              type: 'number',
              min: 0.5,
              max: 24,
              message: 'Hours must be between 0.5 and 24',
            },
          ]}
        >
          <InputNumber
            step={0.5}
            min={0.5}
            max={24}
            style={{ width: '100%' }}
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Business Justification"
          rules={[
            { required: true, message: 'Please specify reason for overtime' },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Describe the critical tasks requiring overtime work..."
            disabled={submitting}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
