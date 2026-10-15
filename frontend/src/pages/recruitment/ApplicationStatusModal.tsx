import React, { useEffect } from 'react';
import { Modal, Form, Select, Input, Alert, Typography, Tag, Space } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentApi } from '../../api/recruitment';
import {
  Application,
  ApplicationStatus,
  APPLICATION_VALID_TRANSITIONS,
  APPLICATION_STATUS_CONFIG,
} from '../../types/recruitment';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

const { TextArea } = Input;
const { Text } = Typography;

interface ApplicationStatusModalProps {
  open: boolean;
  onClose: () => void;
  application: Application | null;
  onSuccess?: () => void;
}

export const ApplicationStatusModal: React.FC<ApplicationStatusModalProps> = ({
  open,
  onClose,
  application,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const isHeadOfHr = userRoles.includes('HEAD_OF_HR');
  const isRecruiter = userRoles.includes('HR_RECRUITMENT');

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: number;
      status: ApplicationStatus;
      notes?: string;
    }) => recruitmentApi.updateApplicationStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-applications'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-candidates'] });
      form.resetFields();
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  if (!application) return null;

  const validNextStatuses =
    APPLICATION_VALID_TRANSITIONS[application.status] || [];

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      statusMutation.mutate({
        id: application.id,
        status: values.status,
        notes: values.notes,
      });
    } catch {
      // Handled by Form
    }
  };

  const currentConfig =
    APPLICATION_STATUS_CONFIG[application.status] || {
      label: application.status,
      color: 'default',
    };

  const errorDetails = statusMutation.error
    ? normalizeApiError(statusMutation.error)
    : null;

  return (
    <Modal
      title="Update Application Screening Stage"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={statusMutation.isPending}
      okText="Update Status"
      destroyOnClose
      width={520}
    >
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <Space orientation="vertical" size={2} style={{ width: '100%' }}>
          <div>
            <Text type="secondary">Candidate: </Text>
            <Text strong>
              {application.candidate?.firstName} {application.candidate?.lastName}
            </Text>
          </div>
          <div>
            <Text type="secondary">Role: </Text>
            <Text>{application.jobPosting?.title}</Text>
          </div>
          <div style={{ marginTop: 6 }}>
            <Text type="secondary">Current Stage: </Text>
            <Tag color={currentConfig.color}>{currentConfig.label}</Tag>
          </div>
        </Space>
      </div>

      {errorDetails && (
        <Alert
          type="error"
          showIcon
          message={errorDetails.message}
          style={{ marginBottom: 16 }}
        />
      )}

      {validNextStatuses.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="Terminal Stage Reached"
          description={`Applications in '${currentConfig.label}' stage have reached a terminal lifecycle state and cannot be transitioned further.`}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Form form={form} layout="vertical">
          <Form.Item
            name="status"
            label="Target Stage / Status"
            rules={[{ required: true, message: 'Please select a new status' }]}
          >
            <Select
              placeholder="Select valid next stage..."
              options={validNextStatuses.map((st) => {
                const conf = APPLICATION_STATUS_CONFIG[st] || {
                  label: st,
                  color: 'default',
                };
                let disabled = false;
                let suffix = '';

                // Enforce RBAC rules in options
                if (st === 'SELECTED' && !isRecruiter && !isHeadOfHr) {
                  disabled = true;
                  suffix = ' (Requires Recruiter or Head of HR)';
                } else if (st === 'APPROVED' && !isHeadOfHr) {
                  disabled = true;
                  suffix = ' (Requires Head of HR authorization)';
                }

                return {
                  value: st,
                  label: `${conf.label}${suffix}`,
                  disabled,
                };
              })}
            />
          </Form.Item>

          <Form.Item name="notes" label="Transition Notes (Optional)">
            <TextArea
              rows={3}
              placeholder="Provide context or feedback regarding this screening decision..."
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};
