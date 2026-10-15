import React from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Button,
  Space,
  Alert,
  Popconfirm,
  Typography,
  Divider,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { JobRequisition, RequisitionStatus } from '../../types/recruitment';
import { recruitmentApi } from '../../api/recruitment';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text } = Typography;

interface RequisitionDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  requisition: JobRequisition | null;
  onStatusChangeSuccess?: () => void;
}

const REQUISITION_STATUS_TAG: Record<RequisitionStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'default' },
  SUBMITTED: { label: 'Submitted', color: 'processing' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'warning' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
  CLOSED: { label: 'Closed', color: 'purple' },
};

export const RequisitionDetailDrawer: React.FC<RequisitionDetailDrawerProps> = ({
  open,
  onClose,
  requisition,
  onStatusChangeSuccess,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isHeadOfHr = user?.roles?.includes('HEAD_OF_HR');

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RequisitionStatus }) =>
      recruitmentApi.updateRequisitionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-requisitions'] });
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      onClose();
    },
  });

  if (!requisition) return null;

  const wf = requisition.workforceRequest;
  const statusConfig =
    REQUISITION_STATUS_TAG[requisition.status] || {
      label: requisition.status,
      color: 'default',
    };

  const errorDetails = statusMutation.error
    ? normalizeApiError(statusMutation.error)
    : null;

  return (
    <Drawer
      title={
        <Space>
          <span>Job Requisition #{requisition.id}</span>
          <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
        </Space>
      }
      open={open}
      onClose={onClose}
      width={560}
      extra={
        <Space>
          {requisition.status === 'DRAFT' && (
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  id: requisition.id,
                  status: 'SUBMITTED',
                })
              }
            >
              Submit for Approval
            </Button>
          )}

          {isHeadOfHr &&
            (requisition.status === 'SUBMITTED' ||
              requisition.status === 'PENDING_APPROVAL') && (
              <>
                <Button
                  type="primary"
                  style={{ backgroundColor: '#52c41a' }}
                  icon={<CheckCircleOutlined />}
                  loading={statusMutation.isPending}
                  onClick={() =>
                    statusMutation.mutate({
                      id: requisition.id,
                      status: 'APPROVED',
                    })
                  }
                >
                  Approve
                </Button>
                <Popconfirm
                  title="Reject Requisition"
                  description="Are you sure you want to reject this requisition?"
                  onConfirm={() =>
                    statusMutation.mutate({
                      id: requisition.id,
                      status: 'REJECTED',
                    })
                  }
                  okText="Yes, Reject"
                  cancelText="Cancel"
                >
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    loading={statusMutation.isPending}
                  >
                    Reject
                  </Button>
                </Popconfirm>
              </>
            )}

          {requisition.status === 'APPROVED' && (
            <Popconfirm
              title="Close Requisition"
              description="Mark this requisition as closed?"
              onConfirm={() =>
                statusMutation.mutate({
                  id: requisition.id,
                  status: 'CLOSED',
                })
              }
              okText="Close"
              cancelText="Cancel"
            >
              <Button icon={<StopOutlined />} loading={statusMutation.isPending}>
                Close
              </Button>
            </Popconfirm>
          )}
        </Space>
      }
    >
      {errorDetails && (
        <Alert
          type="error"
          showIcon
          message={errorDetails.message}
          style={{ marginBottom: 16 }}
        />
      )}

      <Descriptions title="Requisition Overview" bordered column={1} size="small">
        <Descriptions.Item label="Requisition ID">#{requisition.id}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Created At">
          {new Date(requisition.createdAt).toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="Requested By">
          {requisition.requester?.email || `User #${requisition.requestedBy}`}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <Title level={5}>Workforce Request Details</Title>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Workforce Request ID">
          #{requisition.workforceRequestId}
        </Descriptions.Item>
        <Descriptions.Item label="Position">
          <Text strong>{wf?.position?.title || 'Unknown Position'}</Text>{' '}
          <Text type="secondary">({wf?.position?.code})</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Department">
          <Tag color="blue">{wf?.department?.name || 'Unknown Department'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Approved Headcount">
          <Text strong style={{ fontSize: 16, color: '#1677ff' }}>
            {wf?.headcount || '-'}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Business Justification">
          {wf?.justification || '-'}
        </Descriptions.Item>
      </Descriptions>

      {requisition.jobPosting && (
        <>
          <Divider />
          <Title level={5}>Linked Job Posting</Title>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Posting Title">
              {requisition.jobPosting.title}
            </Descriptions.Item>
            <Descriptions.Item label="Posting Status">
              <Tag color={requisition.jobPosting.status === 'PUBLISHED' ? 'green' : 'orange'}>
                {requisition.jobPosting.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Location">
              {requisition.jobPosting.location}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Drawer>
  );
};
