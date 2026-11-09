import React from 'react';
import { Modal, Form, Select, Alert, Button, message } from 'antd';
import { Training } from '../../../types/lnd';
import { Employee } from '../../../types/employee';
import { normalizeApiError } from '../../../api/client';

interface AssignEmployeesModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (employeeIds: number[]) => Promise<void>;
  training: Training | null;
  employees: Employee[];
  loading?: boolean;
}

export const AssignEmployeesModal: React.FC<AssignEmployeesModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  training,
  employees,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values.employeeIds);
      form.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return;
      const norm = normalizeApiError(err);
      message.error(norm.message);
    }
  };

  return (
    <Modal
      title={`Assign Employees to ${training?.title || 'Training'}`}
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      destroyOnClose
    >
      {training?.department && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            type="info"
            showIcon
            message={`Target Department: ${training.department.name}`}
            description="This course is tailored for employees in this department."
            action={
              <Button
                size="small"
                type="primary"
                ghost
                onClick={() => {
                  const deptEmpIds = employees
                    .filter(
                      (e) =>
                        e.departmentId === training.departmentId ||
                        e.department?.id === training.departmentId
                    )
                    .map((e) => e.id);
                  form.setFieldsValue({ employeeIds: deptEmpIds });
                }}
              >
                Select All {training.department.name} Staff
              </Button>
            }
          />
        </div>
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          name="employeeIds"
          label="Select Employees to Enroll"
          rules={[{ required: true, message: 'Please select at least one employee' }]}
        >
          <Select
            mode="multiple"
            placeholder="Search and select employees"
            style={{ width: '100%' }}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName} (${e.employeeId}) - ${e.department?.name || 'N/A'}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
