import React, { useEffect } from 'react';
import { Modal, Form, Input, Alert } from 'antd';
import { UnifiedTask } from '../../types/tasks';
import { normalizeApiError } from '../../api/client';

interface TaskRejectModalProps {
  open: boolean;
  task: UnifiedTask | null;
  isSubmitting: boolean;
  onSubmit: (task: UnifiedTask, reason: string) => Promise<void>;
  onCancel: () => void;
}

export const TaskRejectModal: React.FC<TaskRejectModalProps> = ({
  open,
  task,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [serverError, setServerError] = React.useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setServerError(null);
      form.resetFields();
    }
  }, [open, form]);

  const handleFinish = async (values: { rejectionReason: string }) => {
    if (!task) return;
    setServerError(null);
    try {
      await onSubmit(task, values.rejectionReason);
      form.resetFields();
    } catch (err) {
      const normalized = normalizeApiError(err);
      setServerError(normalized.message);
    }
  };

  return (
    <Modal
      title={`Reject Task: ${task?.title || task?.id}`}
      open={open}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={isSubmitting}
      destroyOnClose
      okText="Reject Task"
      okButtonProps={{ danger: true }}
    >
      {serverError && (
        <Alert
          type="error"
          message={serverError}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="rejectionReason"
          label="Rejection Justification"
          rules={[
            {
              required: true,
              message: 'Please provide a justification for this rejection',
            },
            { min: 1, message: 'Reason cannot be empty' },
            { max: 1000, message: 'Reason cannot exceed 1000 characters' },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Explain executive rationale, staffing limits, or budget constraints..."
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
