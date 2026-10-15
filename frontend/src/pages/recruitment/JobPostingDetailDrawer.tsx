import React from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Popconfirm,
} from 'antd';
import {
  SendOutlined,
  StopOutlined,
  EditOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { JobPosting } from '../../types/recruitment';
import { recruitmentApi } from '../../api/recruitment';
import { normalizeApiError } from '../../api/client';

const { Title, Text, Paragraph } = Typography;

interface JobPostingDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  posting: JobPosting | null;
  onEdit?: (posting: JobPosting) => void;
  onStatusChangeSuccess?: () => void;
}

export const JobPostingDetailDrawer: React.FC<JobPostingDetailDrawerProps> = ({
  open,
  onClose,
  posting,
  onEdit,
  onStatusChangeSuccess,
}) => {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
    }) => recruitmentApi.updateJobPosting(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-postings'] });
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      onClose();
    },
  });

  if (!posting) return null;

  const errorDetails = statusMutation.error
    ? normalizeApiError(statusMutation.error)
    : null;

  return (
    <Drawer
      title={
        <Space>
          <span>{posting.title}</span>
          <Tag
            color={
              posting.status === 'PUBLISHED'
                ? 'green'
                : posting.status === 'CLOSED'
                  ? 'red'
                  : 'orange'
            }
          >
            {posting.status}
          </Tag>
        </Space>
      }
      open={open}
      onClose={onClose}
      width={600}
      extra={
        <Space>
          {onEdit && (
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                onEdit(posting);
                onClose();
              }}
            >
              Edit
            </Button>
          )}

          {posting.status === 'DRAFT' && (
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({ id: posting.id, status: 'PUBLISHED' })
              }
            >
              Publish Vacancy
            </Button>
          )}

          {posting.status === 'PUBLISHED' && (
            <Popconfirm
              title="Close Job Posting"
              description="Closing will stop new candidate applications from being submitted."
              onConfirm={() =>
                statusMutation.mutate({ id: posting.id, status: 'CLOSED' })
              }
              okText="Close Posting"
              cancelText="Cancel"
            >
              <Button
                danger
                icon={<StopOutlined />}
                loading={statusMutation.isPending}
              >
                Close Vacancy
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

      <Descriptions title="Posting Specifications" bordered column={1} size="small">
        <Descriptions.Item label="Posting ID">#{posting.id}</Descriptions.Item>
        <Descriptions.Item label="Linked Requisition">
          Requisition #{posting.requisitionId}
        </Descriptions.Item>
        <Descriptions.Item label="Employment Type">
          {posting.employmentType}
        </Descriptions.Item>
        <Descriptions.Item label="Work Location">
          <Space>
            <GlobalOutlined />
            <span>{posting.location}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Opening Date">
          {new Date(posting.openingDate).toLocaleDateString()}
        </Descriptions.Item>
        <Descriptions.Item label="Closing Date">
          {posting.closingDate
            ? new Date(posting.closingDate).toLocaleDateString()
            : 'Open until filled'}
        </Descriptions.Item>
        <Descriptions.Item label="Total Applications Received">
          <Text strong style={{ fontSize: 16, color: '#1677ff' }}>
            {posting._count?.applications || posting.applications?.length || 0}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <Title level={5}>Job Description</Title>
      <Paragraph style={{ whiteSpace: 'pre-line' }}>{posting.description}</Paragraph>

      <Divider />

      <Title level={5}>Role Requirements & Qualifications</Title>
      <Paragraph style={{ whiteSpace: 'pre-line' }}>{posting.requirements}</Paragraph>
    </Drawer>
  );
};
