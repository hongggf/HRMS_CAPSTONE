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
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  DeleteOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { UnifiedTask, TaskStatus, TaskPriority } from '../../types/tasks';

const { Text, Paragraph } = Typography;

interface TaskDetailDrawerProps {
  open: boolean;
  task: UnifiedTask | null;
  onClose: () => void;
  onApprove: (task: UnifiedTask) => void;
  onOpenReject: (task: UnifiedTask) => void;
  onDeleteDraft: (task: UnifiedTask) => void;
  onSubmitDraft: (task: UnifiedTask) => void;
  onFollowUp?: (task: UnifiedTask) => void;
  isActionPending: boolean;
  isHeadOfHr?: boolean;
}

const getStatusTag = (status: TaskStatus) => {
  switch (status) {
    case 'DRAFT':
      return <Tag color="default">DRAFT</Tag>;
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

const getPriorityTag = (priority: TaskPriority) => {
  switch (priority) {
    case 'HIGH':
      return <Tag color="red">HIGH PRIORITY</Tag>;
    case 'MEDIUM':
      return <Tag color="orange">MEDIUM PRIORITY</Tag>;
    case 'LOW':
      return <Tag color="green">LOW PRIORITY</Tag>;
    default:
      return <Tag>{priority}</Tag>;
  }
};

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  open,
  task,
  onClose,
  onApprove,
  onOpenReject,
  onDeleteDraft,
  onSubmitDraft,
  onFollowUp,
  isActionPending,
  isHeadOfHr = true,
}) => {
  if (!task) return null;

  const isPending =
    task.status === 'PENDING_APPROVAL' || task.status === 'SUBMITTED';
  const isDraft = task.status === 'DRAFT';

  return (
    <Drawer
      title={
        <Space>
          <span>Task Review: {task.id}</span>
          <Tag color="geekblue">{task.typeLabel}</Tag>
          {getStatusTag(task.status)}
        </Space>
      }
      placement="right"
      width={580}
      open={open}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {/* Executive Approver Actions: HEAD_OF_HR only */}
          {isPending && isHeadOfHr && (
            <>
              <Popconfirm
                title="Approve Task"
                description={`Are you sure you want to approve "${task.title}"?`}
                okText="Approve"
                cancelText="Cancel"
                okButtonProps={{ loading: isActionPending }}
                onConfirm={() => onApprove(task)}
              >
                <Button
                  type="primary"
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  icon={<CheckCircleOutlined />}
                  loading={isActionPending}
                >
                  Approve Task
                </Button>
              </Popconfirm>

              <Button
                danger
                icon={<CloseCircleOutlined />}
                disabled={isActionPending}
                onClick={() => onOpenReject(task)}
              >
                Reject Task...
              </Button>
            </>
          )}

          {/* Submitter Follow-Up Action: Non-HEAD_OF_HR */}
          {isPending && !isHeadOfHr && onFollowUp && (
            <Popconfirm
              title="Send Follow-Up Reminder"
              description="Send an urgent notification alert to Head of HR to expedite review of this task?"
              okText="Send Follow-Up"
              cancelText="Cancel"
              okButtonProps={{ loading: isActionPending }}
              onConfirm={() => onFollowUp(task)}
            >
              <Button
                type="primary"
                ghost
                icon={<BellOutlined />}
                loading={isActionPending}
                disabled={task.canFollowUp === false}
              >
                {task.canFollowUp === false
                  ? 'Followed Up'
                  : 'Follow Up with Head HR'}
              </Button>
            </Popconfirm>
          )}

          {/* Draft Actions */}
          {isDraft && (
            <>
              <Popconfirm
                title="Submit Draft Task"
                description="Submit this draft task for executive review by Head of HR?"
                okText="Submit"
                cancelText="Cancel"
                okButtonProps={{ loading: isActionPending }}
                onConfirm={() => onSubmitDraft(task)}
              >
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={isActionPending}
                >
                  Submit Task
                </Button>
              </Popconfirm>

              <Popconfirm
                title="Delete Draft Task"
                description="Are you sure you want to permanently delete this draft?"
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true, loading: isActionPending }}
                onConfirm={() => onDeleteDraft(task)}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={isActionPending}
                >
                  Delete Draft
                </Button>
              </Popconfirm>
            </>
          )}

          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Follow-up Info Alert */}
        {task.lastFollowedUpAt && (
          <Alert
            type="warning"
            showIcon
            message="Executive Follow-Up Alert"
            description={`A follow-up reminder was sent to Head of HR on ${new Date(task.lastFollowedUpAt).toLocaleString()} (total ${task.followUpCount || 1} reminder(s)).`}
          />
        )}

        {/* Rejection Alert */}
        {task.status === 'REJECTED' && (
          <Alert
            type="error"
            showIcon
            message="Task Rejected"
            description={
              <div>
                <p style={{ margin: '4px 0' }}>
                  <strong>Reason:</strong>{' '}
                  {task.rejectionReason || 'No reason provided'}
                </p>
                {task.rejectedBy && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Rejected by {task.rejectedBy} on{' '}
                    {task.rejectedAt
                      ? new Date(task.rejectedAt).toLocaleString()
                      : ''}
                  </Text>
                )}
              </div>
            }
          />
        )}

        {/* Approval Alert */}
        {task.status === 'APPROVED' && (
          <Alert
            type="success"
            showIcon
            message="Task Approved"
            description={
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Approved by {task.approvedBy || 'Head of HR'} on{' '}
                  {task.approvedAt
                    ? new Date(task.approvedAt).toLocaleString()
                    : ''}
                </Text>
              </div>
            }
          />
        )}

        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Task ID">
            <Text strong>{task.id}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Module / Category">
            <Tag color="blue">{task.typeLabel}</Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Priority">
            {getPriorityTag(task.priority)}
          </Descriptions.Item>

          <Descriptions.Item label="Department">
            {task.departmentName || 'N/A'}
          </Descriptions.Item>

          <Descriptions.Item label="Requester">
            {task.requesterEmail || 'System'}
          </Descriptions.Item>

          {task.amountOrHeadcount && (
            <Descriptions.Item label="Scope / Volume">
              <Tag color="cyan">{task.amountOrHeadcount}</Tag>
            </Descriptions.Item>
          )}

          {isPending && task.pendingDays !== undefined && (
            <Descriptions.Item label="Pending Duration">
              <Tag color={task.pendingDays >= 3 ? 'volcano' : 'orange'}>
                Pending for {task.pendingDays} day(s)
              </Tag>
            </Descriptions.Item>
          )}

          <Descriptions.Item label="Created At">
            {new Date(task.createdAt).toLocaleString()}
          </Descriptions.Item>

          {task.updatedAt && (
            <Descriptions.Item label="Last Modified">
              {new Date(task.updatedAt).toLocaleString()}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Card title="Task Scope & Justification" size="small" bordered>
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {task.description || 'No description provided.'}
          </Paragraph>
        </Card>
      </Space>
    </Drawer>
  );
};
