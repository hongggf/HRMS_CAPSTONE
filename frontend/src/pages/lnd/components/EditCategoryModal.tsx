import React, { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { TrainingCategory, UpdateTrainingCategoryInput } from '../../../types/lnd';
import { normalizeApiError } from '../../../api/client';

interface EditCategoryModalProps {
  visible: boolean;
  category: TrainingCategory | null;
  onCancel: () => void;
  onSubmit: (id: number, values: UpdateTrainingCategoryInput) => Promise<void>;
  loading?: boolean;
}

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  visible,
  category,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (category && visible) {
      form.setFieldsValue({
        name: category.name,
        description: category.description || '',
      });
    } else {
      form.resetFields();
    }
  }, [category, visible, form]);

  const handleOk = async () => {
    if (!category) return;
    try {
      const values = await form.validateFields();
      await onSubmit(category.id, {
        name: values.name.trim(),
        description: values.description ? values.description.trim() : undefined,
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
      title="Edit Training Category"
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
          <Input.TextArea rows={3} placeholder="Focus area description" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
