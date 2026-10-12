import React from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Typography,
  Space,
  Button,
  Popconfirm,
  Alert,
  Card,
  Steps,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  StopOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { WorkforceRequest, WorkforceStatus } from '../../types/workforce';
import { useAuthStore } from '../../store/useAuthStore';

const { Text, Paragraph } = Typography;

interface WorkforceDetailDrawerProps {
  open: boolean;
  request: WorkforceRequest | null;
  onClose: () => void;
  onSubmit: (id: number) => void;
  onApprove: (id: number) => void;
  onOpenReject: (id: number) => void;
  onCancelRequest: (id: number) => void;
  onEdit: (request: WorkforceRequest) => void;
  onDelete: (id: number) => void;
  isActionPending: boolean;
}

const getStatusTag = (status: WorkforceStatus) => {
  switch (status) {
    case 'DRAFT':
      return <Tag color="default">DRAFT</Tag>;
    case 'SUBMITTED':
      return <Tag color="blue">SUBMITTED</Tag>;
    case 'PENDING_APPROVAL':
      return <Tag color="warning">PENDING APPROVAL</Tag>;
    case 'APPROVED':
      return <Tag color="success">APPROVED</Tag>;
    case 'REJECTED':
      return <Tag color="error">REJECTED</Tag>;
    case 'CANCELLED':
      return <Tag color="magenta">CANCELLED</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

const getStepCurrent = (status: WorkforceStatus) => {
  switch (status) {
    case 'DRAFT':
      return 0;
    case 'SUBMITTED':
    case 'PENDING_APPROVAL':
      return 1;
    case 'APPROVED':
      return 2;
    case 'REJECTED':
      return 2;
    case 'CANCELLED':
      return 2;
    default:
      return 0;
  }
};

export const WorkforceDetailDrawer: React.FC<WorkforceDetailDrawerProps> = ({
  open,
  request,
  onClose,
  onSubmit,
  onApprove,
  onOpenReject,
  onCancelRequest,
  onEdit,
  onDelete,
  isActionPending,
}) => {
  const { user } = useAuthStore();
  const isHeadOfHr = user?.roles?.includes('HEAD_OF_HR');

  if (!request) return null;

  const isDraft = request.status === 'DRAFT';
  const isPending = request.status === 'PENDING_APPROVAL';
  const isCancellable = ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL'].includes(
    request.status,
  );

  return (
    <Drawer
      title={
        <Space>
          <span>Headcount Request #{request.id}</span>
          {getStatusTag(request.status)}
        </Space>
      }
      placement="right"
      width={560}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          {isDraft && (
            <>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  onClose();
                  onEdit(request);
                }}
                disabled={isActionPending}
              >
                Edit Draft
              </Button>
              <Popconfirm
                title="Delete Draft"
                description="Are you sure you want to delete this draft request?"
                okText="Yes, Delete"
                cancelText="No"
                okButtonProps={{ danger: true, loading: isActionPending }}
                onConfirm={() => onDelete(request.id)}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={isActionPending}
                >
                  Delete
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {isDraft && (
            <Popconfirm
              title="Submit Request"
              description="Submit this headcount request for Head of HR approval?"
              okText="Yes, Submit"
              cancelText="No"
              onConfirm={() => onSubmit(request.id)}
            >
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={isActionPending}
              >
                Submit for Approval
              </Button>
            </Popconfirm>
          )}

          {isPending && isHeadOfHr && (
            <>
              <Popconfirm
                title="Approve Request"
                description={`Approve request for ${request.headcount} headcount in ${request.department?.name || 'department'}?`}
                okText="Yes, Approve"
                cancelText="Cancel"
                onConfirm={() => onApprove(request.id)}
              >
                <Button
                  type="primary"
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  icon={<CheckCircleOutlined />}
                  loading={isActionPending}
                >
                  Approve
                </Button>
              </Popconfirm>

              <Button
                danger
                icon={<CloseCircleOutlined />}
                disabled={isActionPending}
                onClick={() => onOpenReject(request.id)}
              >
                Reject...
              </Button>
            </>
          )}

          {isCancellable && (
            <Popconfirm
              title="Cancel Request"
              description="Are you sure you want to cancel this request?"
              okText="Yes, Cancel"
              cancelText="No"
              okButtonProps={{ danger: true, loading: isActionPending }}
              onConfirm={() => onCancelRequest(request.id)}
            >
              <Button danger loading={isActionPending} icon={<StopOutlined />}>
                Cancel Request
              </Button>
            </Popconfirm>
          )}

          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Status Lifecycle Steps */}
        <Card size="small" bordered>
          <Steps
            size="small"
            current={getStepCurrent(request.status)}
            status={
              request.status === 'REJECTED' || request.status === 'CANCELLED'
                ? 'error'
                : 'process'
            }
            items={[
              { title: 'Draft' },
              { title: 'Pending Approval' },
              {
                title:
                  request.status === 'APPROVED'
                    ? 'Approved'
                    : request.status === 'REJECTED'
                      ? 'Rejected'
                      : request.status === 'CANCELLED'
                        ? 'Cancelled'
                        : 'Decision',
              },
            ]}
          />
        </Card>

        {/* Rejection Banner */}
        {request.status === 'REJECTED' && (
          <Alert
            type="error"
            showIcon
            message="Request Rejected"
            description={
              <div>
                <p style={{ margin: '4px 0' }}>
                  <strong>Reason:</strong>{' '}
                  {request.rejectionReason || 'No reason specified'}
                </p>
                {request.rejector && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Rejected by: {request.rejector.email} on{' '}
                    {request.rejectedAt
                      ? new Date(request.rejectedAt).toLocaleString()
                      : ''}
                  </Text>
                )}
              </div>
            }
          />
        )}

        {/* Approval Banner */}
        {request.status === 'APPROVED' && (
          <Alert
            type="success"
            showIcon
            message="Request Approved"
            description={
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Approved by: {request.approver?.email || 'Executive HR'} on{' '}
                  {request.approvedAt
                    ? new Date(request.approvedAt).toLocaleString()
                    : ''}
                </Text>
              </div>
            }
          />
        )}

        {/* Request Details */}
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Target Department">
            <Text strong>
              {request.department?.name || `ID #${request.departmentId}`}
            </Text>{' '}
            {request.department?.code && (
              <Tag color="blue">{request.department.code}</Tag>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Position Title">
            <Text strong>
              {request.position?.title || `ID #${request.positionId}`}
            </Text>{' '}
            {request.position?.code && (
              <Tag color="purple">{request.position.code}</Tag>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Requested Headcount">
            <Tag color="cyan" style={{ fontSize: 14, padding: '2px 8px' }}>
              {request.headcount}{' '}
              {request.headcount === 1 ? 'Person' : 'Persons'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Requested By">
            {request.requester?.email || `User #${request.requestedBy}`}
          </Descriptions.Item>

          <Descriptions.Item label="Date Created">
            {new Date(request.createdAt).toLocaleString()}
          </Descriptions.Item>

          <Descriptions.Item label="Last Updated">
            {new Date(request.updatedAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>

        {/* Business Justification */}
        <Card title="Business Justification" size="small" bordered>
          <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {request.justification}
          </Paragraph>
        </Card>
      </Space>
    </Drawer>
  );
};
