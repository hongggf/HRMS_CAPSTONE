import React, { useEffect } from 'react';
import { Modal, Form, Input, Alert } from 'antd';
import { normalizeApiError } from '../../api/client';

interface WorkforceRejectModalProps {
  open: boolean;
  requestId: number | null;
  isSubmitting: boolean;
  onSubmit: (id: number, reason: string) => Promise<void>;
  onCancel: () => void;
}

export const WorkforceRejectModal: React.FC<WorkforceRejectModalProps> = ({
  open,
  requestId,
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
    if (!requestId) return;
    setServerError(null);
    try {
      await onSubmit(requestId, values.rejectionReason);
      form.resetFields();
    } catch (err) {
      const normalized = normalizeApiError(err);
      setServerError(normalized.message);
    }
  };

  return (
    <Modal
      title={`Reject Workforce Request #${requestId}`}
      open={open}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={isSubmitting}
      destroyOnClose
      okText="Reject Request"
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
          label="Rejection Reason"
          rules={[
            {
              required: true,
              message: 'Please provide a reason for rejecting this request',
            },
            { min: 1, message: 'Rejection reason cannot be empty' },
            {
              max: 1000,
              message: 'Rejection reason cannot exceed 1000 characters',
            },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Explain the justification or budget constraints causing this rejection..."
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
