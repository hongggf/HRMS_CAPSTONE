import React from 'react';
import { Modal, Form, Input, DatePicker, message } from 'antd';
import { CreateCycleInput } from '../../../types/performance';
import { normalizeApiError } from '../../../api/client';

interface CreateCycleModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateCycleInput) => Promise<void>;
  loading?: boolean;
}

export const CreateCycleModal: React.FC<CreateCycleModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const [start, end] = values.dateRange;

      if (end.isBefore(start)) {
        message.error('Cycle end date must be on or after start date');
        return;
      }

      await onSubmit({
        name: values.name,
        description: values.description,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
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
      title="Create Evaluation Cycle"
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
          name="name"
          label="Cycle Title"
          rules={[
            {
              required: true,
              message: 'Please enter a cycle title (e.g., Q1 2026 Review)',
            },
          ]}
        >
          <Input placeholder="e.g. FY2026 Annual Performance Appraisal" />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="Active Date Window (Start - End)"
          rules={[
            {
              required: true,
              message: 'Please select evaluation period dates',
            },
          ]}
        >
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="description" label="Description & Guidelines">
          <Input.TextArea
            rows={3}
            placeholder="Evaluation guidelines, timeline, or instructions"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
