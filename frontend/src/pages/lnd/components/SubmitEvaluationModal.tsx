import React from 'react';
import { Modal, Form, Select, Rate, Input, message } from 'antd';
import { EvaluateTrainingInput, Training } from '../../../types/lnd';
import { Employee } from '../../../types/employee';
import { normalizeApiError } from '../../../api/client';

interface SubmitEvaluationModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (
    trainingId: number,
    values: EvaluateTrainingInput,
  ) => Promise<void>;
  trainings: Training[];
  employees: Employee[];
  selectedTrainingId?: number;
  loading?: boolean;
}

export const SubmitEvaluationModal: React.FC<SubmitEvaluationModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  trainings,
  employees,
  selectedTrainingId,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values.trainingId, {
        evaluatorId: values.evaluatorId,
        rating: values.rating,
        feedback: values.feedback,
        comments: values.comments,
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
      title="Submit Course Evaluation"
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
        initialValues={{ trainingId: selectedTrainingId, rating: 5 }}
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
          name="evaluatorId"
          label="Evaluating Employee"
          rules={[{ required: true, message: 'Please select evaluator' }]}
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
          name="rating"
          label="Overall Course Quality & Content (1 - 5 Stars)"
          rules={[{ required: true, message: 'Please provide rating score' }]}
        >
          <Rate allowClear={false} />
        </Form.Item>

        <Form.Item name="feedback" label="Trainer / Instructor Feedback">
          <Input.TextArea
            rows={2}
            placeholder="Clarity of instruction, pacing, and practical exercises"
          />
        </Form.Item>

        <Form.Item name="comments" label="General Comments & Value to Role">
          <Input.TextArea
            rows={2}
            placeholder="How will you apply these learnings in your day-to-day role?"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
