import React from 'react';
import { Modal, Form, Select, message } from 'antd';
import { Employee } from '../../../types/employee';

interface AddAttendeeModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (employeeId: number, status: 'ATTENDED' | 'REGISTERED') => Promise<void>;
  employees: Employee[];
  existingEmployeeIds?: number[];
  sessionTitle?: string;
  loading?: boolean;
}

export const AddAttendeeModal: React.FC<AddAttendeeModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  employees,
  existingEmployeeIds = [],
  sessionTitle,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values.employeeId, values.status);
      form.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to add attendee to session');
    }
  };

  const availableEmployees = employees.filter((e) => !existingEmployeeIds.includes(e.id));

  return (
    <Modal
      title={`Add Attendee to ${sessionTitle || 'Session'}`}
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ status: 'REGISTERED' }}>
        <Form.Item
          name="employeeId"
          label="Select Employee"
          rules={[{ required: true, message: 'Please select an employee' }]}
        >
          <Select
            placeholder="Search and select employee"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={availableEmployees.map((e) => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName} (${e.employeeId}) - ${e.department?.name || 'N/A'}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="status"
          label="Initial Attendance Status"
          rules={[{ required: true, message: 'Please select status' }]}
        >
          <Select
            options={[
              { value: 'REGISTERED', label: 'Registered (Scheduled to attend)' },
              { value: 'ATTENDED', label: 'Attended (Mark present now)' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
