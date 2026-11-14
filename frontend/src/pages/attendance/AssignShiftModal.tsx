import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Alert, message } from 'antd';
import { UserSwitchOutlined } from '@ant-design/icons';
import { attendanceApi } from '../../api/attendance';
import { Employee } from '../../types/employee';
import { Shift } from '../../types/attendance';

interface AssignShiftModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees: Employee[];
  shifts: Shift[];
}

export const AssignShiftModal: React.FC<AssignShiftModalProps> = ({
  open,
  onClose,
  onSuccess,
  employees,
  shifts,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBackendError(null);
      form.setFieldsValue({
        employeeId: employees.length > 0 ? employees[0].id : undefined,
        shiftId: shifts.length > 0 ? shifts[0].id : undefined,
        startDate: new Date().toISOString(),
      });
    }
  }, [open, employees, shifts, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setBackendError(null);

      await attendanceApi.assignShift({
        employeeId: Number(values.employeeId),
        shiftId: Number(values.shiftId),
        startDate: values.startDate,
      });

      message.success('Shift successfully assigned to employee');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.errorFields) return;
      const msg =
        err.response?.data?.error || err.message || 'Failed to assign shift';
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
          <UserSwitchOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Assign Shift to Employee
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      okText="Assign Shift"
      destroyOnClose
    >
      {backendError && (
        <Alert
          message="Assignment Failed"
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

        <Form.Item
          name="shiftId"
          label="Shift Schedule"
          rules={[{ required: true, message: 'Please select a shift' }]}
        >
          <Select placeholder="Select shift schedule..." disabled={submitting}>
            {shifts.map((s) => (
              <Select.Option key={s.id} value={s.id}>
                {s.name} ({s.startTime} - {s.endTime})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="startDate"
          label="Effective Start Date (ISO UTC)"
          rules={[{ required: true, message: 'Start date is required' }]}
          extra="Shift will take effect starting on this date"
        >
          <Input disabled={submitting} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
