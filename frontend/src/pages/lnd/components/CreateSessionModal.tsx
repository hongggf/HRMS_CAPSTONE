import React from 'react';
import { Modal, Form, Input, DatePicker, Select, message } from 'antd';
import { CreateTrainingSessionInput, Training } from '../../../types/lnd';
import { normalizeApiError } from '../../../api/client';

interface CreateSessionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (trainingId: number, values: CreateTrainingSessionInput) => Promise<void>;
  trainings: Training[];
  selectedTrainingId?: number;
  loading?: boolean;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  trainings,
  selectedTrainingId,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values.trainingId, {
        title: values.title,
        date: values.date.toISOString(),
        location: values.location,
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
      title="Schedule Training Session"
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
        initialValues={{ trainingId: selectedTrainingId }}
      >
        <Form.Item
          name="trainingId"
          label="Training Course"
          rules={[{ required: true, message: 'Please select a course' }]}
        >
          <Select placeholder="Select Course">
            {trainings.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                {t.title}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="title"
          label="Session Topic / Module"
          rules={[{ required: true, message: 'Please enter session title' }]}
        >
          <Input placeholder="e.g. Session 1: Concurrency and Thread Safety in Go" />
        </Form.Item>

        <Form.Item
          name="date"
          label="Session Date & Time"
          rules={[{ required: true, message: 'Please select session date and time' }]}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="location" label="Location / Virtual Room Link">
          <Input placeholder="e.g. Room 402, Building A / Zoom Link" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
