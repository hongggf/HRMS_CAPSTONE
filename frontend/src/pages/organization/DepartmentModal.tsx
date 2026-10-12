import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Alert } from 'antd';
import {
  Department,
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from '../../types/organization';
import { normalizeApiError } from '../../api/client';

interface DepartmentModalProps {
  open: boolean;
  department: Department | null; // null = create mode
  isSubmitting: boolean;
  onSubmit: (
    values: CreateDepartmentInput | UpdateDepartmentInput,
  ) => Promise<void>;
  onCancel: () => void;
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  open,
  department,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const isEdit = Boolean(department);

  useEffect(() => {
    if (open) {
      setServerError(null);
      if (department) {
        form.setFieldsValue({
          name: department.name,
          code: department.code,
          description: department.description || '',
          status: department.status,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, department, form]);

  const handleFinish = async (
    values: CreateDepartmentInput | UpdateDepartmentInput,
  ) => {
    setServerError(null);
    try {
      await onSubmit(values);
      form.resetFields();
    } catch (err) {
      const normalized = normalizeApiError(err);
      setServerError(normalized.message);
      if (normalized.details) {
        form.setFields(
          normalized.details.map((d) => ({
            name: d.field || 'name',
            errors: [d.message],
          })),
        );
      }
    }
  };

  return (
    <Modal
      title={
        isEdit
          ? `Edit Department: ${department?.name}`
          : 'Create New Department'
      }
      open={open}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={isSubmitting}
      destroyOnClose
      okText={isEdit ? 'Save Changes' : 'Create Department'}
    >
      {serverError && (
        <Alert
          type="error"
          message={serverError}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ status: 'ACTIVE' }}
      >
        <Form.Item
          name="name"
          label="Department Name"
          rules={[
            { required: true, message: 'Please enter department name' },
            {
              max: 100,
              message: 'Department name cannot exceed 100 characters',
            },
          ]}
        >
          <Input placeholder="e.g. Engineering & Technology" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="code"
          label="Department Code"
          extra="Uppercase alphanumeric characters, hyphens or underscores (e.g. ENG, HR_OPERATIONS)"
          rules={[
            { required: true, message: 'Please enter department code' },
            { max: 20, message: 'Department code cannot exceed 20 characters' },
            {
              pattern: /^[A-Z0-9_-]+$/,
              message:
                'Code must be uppercase alphanumeric with hyphens or underscores only',
            },
          ]}
        >
          <Input
            placeholder="e.g. ENG"
            maxLength={20}
            style={{ textTransform: 'uppercase' }}
            onChange={(e) => {
              form.setFieldValue('code', e.target.value.toUpperCase());
            }}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[
            { max: 500, message: 'Description cannot exceed 500 characters' },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Brief overview of department scope and functions"
            maxLength={500}
            showCount
          />
        </Form.Item>

        {isEdit && (
          <Form.Item
            name="status"
            label="Status"
            rules={[
              { required: true, message: 'Please select department status' },
            ]}
          >
            <Select>
              <Select.Option value="ACTIVE">Active</Select.Option>
              <Select.Option value="INACTIVE">Inactive</Select.Option>
            </Select>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
