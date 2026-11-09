import React from 'react';
import { Modal, Form, Input, message } from 'antd';
import { CreateTrainingCategoryInput } from '../../../types/lnd';
import { normalizeApiError } from '../../../api/client';

interface CreateCategoryModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateTrainingCategoryInput) => Promise<void>;
  loading?: boolean;
}

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        name: values.name,
        description: values.description,
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
      title="Create Training Category"
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
          label="Category Name"
          rules={[{ required: true, message: 'Please enter category name' }]}
        >
          <Input placeholder="e.g. Cloud & DevOps, Leadership, Security" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} placeholder="Focus area description" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
