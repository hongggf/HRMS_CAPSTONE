import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Alert } from 'antd';
import {
  SafetyOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../api/user';
import { AdminUser, RolePermission } from '../../types/user';
import { normalizeApiError } from '../../api/client';

interface AssignRoleModalProps {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
  roles: RolePermission[];
  isLastActiveHeadOfHr: boolean;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
  open,
  onClose,
  user,
  roles,
  isLastActiveHeadOfHr,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (user && open) {
      const currentRole = roles.find((r) => user.roles.includes(r.name));
      form.setFieldsValue({
        roleId: currentRole?.id,
      });
      setErrorBanner(null);
    }
  }, [user, open, roles, form]);

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      userApi.assignRole(userId, { roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      form.resetFields();
      setErrorBanner(null);
      onClose();
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      setErrorBanner(normalized.message);
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!user) return;

      const selectedRole = roles.find((r) => r.id === values.roleId);
      if (
        isLastActiveHeadOfHr &&
        user.roles.includes('HEAD_OF_HR') &&
        selectedRole?.name !== 'HEAD_OF_HR'
      ) {
        setErrorBanner(
          'Cannot demote the last active administrator (HEAD_OF_HR). Another administrator must be active before changing this role.',
        );
        return;
      }

      assignMutation.mutate({
        userId: user.id,
        roleId: values.roleId,
      });
    } catch {
      // validation error
    }
  };

  return (
    <Modal
      title={
        <span>
          <SafetyOutlined style={{ color: '#1677ff', marginRight: 8 }} />
          Assign Role - {user?.email}
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={() => {
        setErrorBanner(null);
        form.resetFields();
        onClose();
      }}
      confirmLoading={assignMutation.isPending}
      okText="Confirm Role Assignment"
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

      {isLastActiveHeadOfHr && user?.roles.includes('HEAD_OF_HR') && (
        <Alert
          type="warning"
          icon={<ExclamationCircleOutlined />}
          message="Sole Active Head of HR Notice"
          description="This user is currently the only active administrator in the organization. Demoting this account to another role is prevented to avoid system lockout."
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Alert
        type="info"
        icon={<InfoCircleOutlined />}
        message="Session Notice"
        description="Assigned role updates take effect upon the user's next login or session token refresh. Stale client sessions do not automatically receive escalated permissions."
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="roleId"
          label="Designated System Role"
          rules={[{ required: true, message: 'Please select a system role' }]}
        >
          <Select
            placeholder="Select a verified role"
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
