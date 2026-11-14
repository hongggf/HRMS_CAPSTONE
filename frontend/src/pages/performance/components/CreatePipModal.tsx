import React from 'react';
import { Modal, Form, Input, DatePicker, Select, message } from 'antd';
import { CreatePipInput } from '../../../types/performance';
import { Employee } from '../../../types/employee';
import { normalizeApiError } from '../../../api/client';

interface CreatePipModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: CreatePipInput) => Promise<void>;
  employees: Employee[];
  loading?: boolean;
}

export const CreatePipModal: React.FC<CreatePipModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  employees,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const [start, end] = values.dateRange;

      if (end.isBefore(start)) {
        message.error('PIP end date must be on or after start date');
        return;
      }

      await onSubmit({
        employeeId: values.employeeId,
        reason: values.reason,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        objective: values.objective,
      });
      form.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return;
      const norm = normalizeApiError(err);
      message.error(norm.message);
    }
  };

  return (
    <Modal
      title="Create Performance Improvement Plan (PIP)"
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="employeeId"
          label="Target Employee"
          rules={[{ required: true, message: 'Please select an employee' }]}
        >
          <Select
            placeholder="Select Employee"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName} (${e.employeeId})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="PIP Timeline (Start Date - Target Completion)"
          rules={[
            {
              required: true,
              message: 'Please select PIP start and target end dates',
            },
          ]}
        >
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="objective"
          label="Core Target Objective"
          rules={[
            { required: true, message: 'Please enter primary PIP objective' },
          ]}
        >
          <Input placeholder="e.g. Achieve 100% on-time milestone delivery and eliminate critical defect escapes" />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Performance Shortfall Justification"
          rules={[
            {
              required: true,
              message: 'Please document performance gaps triggering this plan',
            },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Document specific KPIs missed, documented feedback, and improvement requirements"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
