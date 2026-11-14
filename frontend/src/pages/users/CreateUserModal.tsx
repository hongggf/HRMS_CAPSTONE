import React, { useState } from 'react';
import { Modal, Form, Input, Select, Typography, Alert, Space } from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  LockOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../api/user';
import { RolePermission } from '../../types/user';
import { normalizeApiError } from '../../api/client';

const { Text } = Typography;

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  roles: RolePermission[];
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  open,
  onClose,
  roles,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [passwordValue, setPasswordValue] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      form.resetFields();
      setPasswordValue('');
      setErrorBanner(null);
      onClose();
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      setErrorBanner(normalized.message);
    },
  });

  const hasLength = passwordValue.length >= 8;
  const hasLower = /[a-z]/.test(passwordValue);
  const hasUpper = /[A-Z]/.test(passwordValue);
  const hasNumber = /\d/.test(passwordValue);
  const hasSpecial = /[@$!%*?&]/.test(passwordValue);
  const isPasswordValid =
    hasLength && hasLower && hasUpper && hasNumber && hasSpecial;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate({
        email: values.email,
        password: values.password,
        roleId: values.roleId,
      });
    } catch {
      // validation error inside form
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setPasswordValue('');
    setErrorBanner(null);
    onClose();
  };

  return (
    <Modal
      title="Create New User Account"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={createMutation.isPending}
      okText="Create User"
      cancelText="Cancel"
      destroyOnClose
    >
      {errorBanner && (
        <Alert
          type="error"
          message={errorBanner}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="email"
          label="Corporate Email"
          rules={[
            { required: true, message: 'Please enter corporate email' },
            { type: 'email', message: 'Please enter a valid email address' },
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ color: '#8c8c8c' }} />}
            placeholder="e.g. employee@company.com"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Initial Password"
          rules={[
            { required: true, message: 'Please enter a password' },
            {
              validator: (_, value) => {
                if (!value || isPasswordValid) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(
                    'Password must satisfy all security requirements below',
                  ),
                );
              },
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#8c8c8c' }} />}
            placeholder="At least 8 chars, uppercase, lowercase, number, special"
            onChange={(e) => setPasswordValue(e.target.value)}
          />
        </Form.Item>

        {/* Live password requirement indicators */}
        <div
          style={{
            background: '#fafafa',
            padding: '10px 14px',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 12,
          }}
        >
          <Text strong style={{ display: 'block', marginBottom: 6 }}>
            Password Policy Requirements:
          </Text>
          <Space direction="vertical" size={2}>
            <Text type={hasLength ? 'success' : 'secondary'}>
              {hasLength ? (
                <CheckCircleFilled style={{ color: '#52c41a' }} />
              ) : (
                <CloseCircleFilled style={{ color: '#bfbfbf' }} />
              )}{' '}
              At least 8 characters
            </Text>
            <Text type={hasUpper ? 'success' : 'secondary'}>
              {hasUpper ? (
                <CheckCircleFilled style={{ color: '#52c41a' }} />
              ) : (
                <CloseCircleFilled style={{ color: '#bfbfbf' }} />
              )}{' '}
              At least one uppercase letter (A-Z)
            </Text>
            <Text type={hasLower ? 'success' : 'secondary'}>
              {hasLower ? (
                <CheckCircleFilled style={{ color: '#52c41a' }} />
              ) : (
                <CloseCircleFilled style={{ color: '#bfbfbf' }} />
              )}{' '}
              At least one lowercase letter (a-z)
            </Text>
            <Text type={hasNumber ? 'success' : 'secondary'}>
              {hasNumber ? (
                <CheckCircleFilled style={{ color: '#52c41a' }} />
              ) : (
                <CloseCircleFilled style={{ color: '#bfbfbf' }} />
              )}{' '}
              At least one numeric digit (0-9)
            </Text>
            <Text type={hasSpecial ? 'success' : 'secondary'}>
              {hasSpecial ? (
                <CheckCircleFilled style={{ color: '#52c41a' }} />
              ) : (
                <CloseCircleFilled style={{ color: '#bfbfbf' }} />
              )}{' '}
              At least one special symbol (@$!%*?&)
            </Text>
          </Space>
        </div>

        <Form.Item
          name="roleId"
          label="Initial Role Assignment"
          tooltip="Assign an initial role or leave blank for unassigned staff"
        >
          <Select
            placeholder="Select a verified system role (optional)"
            allowClear
            options={roles.map((r) => ({
              value: r.id,
              label: `${r.name} - ${r.description || `${r.permissions.length} permissions`}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
