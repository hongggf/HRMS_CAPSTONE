import React from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, Select, message } from 'antd';
import dayjs from 'dayjs';
import { CreateGoalInput, PerformanceCycle } from '../../../types/performance';
import { Employee } from '../../../types/employee';
import { normalizeApiError } from '../../../api/client';

interface CreateGoalModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateGoalInput) => Promise<void>;
  cycles: PerformanceCycle[];
  employees: Employee[];
  selectedCycleId?: number;
  loading?: boolean;
}

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  cycles,
  employees,
  selectedCycleId,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        cycleId: values.cycleId,
        employeeId: values.employeeId,
        title: values.title,
        description: values.description,
        weight: values.weight,
        target: values.target,
        measurement: values.measurement,
        dueDate: values.dueDate.toISOString(),
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
      title="Define Employee Performance Goal"
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          cycleId: selectedCycleId,
          weight: 25,
        }}
      >
        <Form.Item
          name="cycleId"
          label="Performance Cycle"
          rules={[{ required: true, message: 'Please select a cycle' }]}
        >
          <Select placeholder="Select Cycle">
            {cycles.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name} ({dayjs(c.startDate).format('YYYY-MM-DD')} - {dayjs(c.endDate).format('YYYY-MM-DD')})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="employeeId"
          label="Assigned Employee"
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
          name="title"
          label="Goal / OKR Title"
          rules={[{ required: true, message: 'Please enter goal title' }]}
        >
          <Input placeholder="e.g. Deliver Payment Gateway V2 with 99.99% uptime" />
        </Form.Item>

        <Form.Item name="description" label="Objective Description">
          <Input.TextArea rows={2} placeholder="Context, key deliverables, and criteria" />
        </Form.Item>

        <Form.Item
          name="weight"
          label="Weight Percentage (0% - 100%)"
          rules={[
            { required: true, message: 'Weight is required' },
            { type: 'number', min: 0, max: 100, message: 'Weight must be between 0 and 100' },
          ]}
        >
          <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
        </Form.Item>

        <Form.Item name="target" label="Target Goal Metric">
          <Input placeholder="e.g. < 50ms latency, zero P0 defects" />
        </Form.Item>

        <Form.Item
          name="dueDate"
          label="Target Due Date"
          rules={[{ required: true, message: 'Please select target completion date' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
