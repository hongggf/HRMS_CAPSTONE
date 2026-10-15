import React from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Typography,
  Table,
  Space,
  Button,
  Divider,
} from 'antd';
import {
  SafetyCertificateOutlined,
  LockOutlined,
  FilePdfOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { Candidate, APPLICATION_STATUS_CONFIG, ApplicationStatus } from '../../types/recruitment';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text } = Typography;

interface CandidateDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onSelectApplication?: (applicationId: number) => void;
}

export const maskContactInfo = (value?: string | null, isEmail = false) => {
  if (!value) return '-';
  if (isEmail) {
    const parts = value.split('@');
    if (parts.length !== 2) return '***@***';
    const [name, domain] = parts;
    const masked =
      name.length > 2
        ? `${name[0]}***${name[name.length - 1]}`
        : `${name[0]}***`;
    return `${masked}@${domain}`;
  }
  if (value.length > 6) {
    return `${value.slice(0, 3)}****${value.slice(-2)}`;
  }
  return '***-****';
};

export const CandidateDetailDrawer: React.FC<CandidateDetailDrawerProps> = ({
  open,
  onClose,
  candidate,
  onSelectApplication,
}) => {
  const { user } = useAuthStore();
  const canViewSensitiveContact = user?.roles?.some((r) =>
    ['HEAD_OF_HR', 'HR_RECRUITMENT', 'HR_ADMIN'].includes(r),
  );

  if (!candidate) return null;

  return (
    <Drawer
      title={
        <Space>
          <span>
            {candidate.firstName} {candidate.lastName}
          </span>
          <Tag color="cyan">Candidate #{candidate.id}</Tag>
        </Space>
      }
      open={open}
      onClose={onClose}
      width={600}
    >
      <Descriptions title="Candidate Overview" bordered column={1} size="small">
        <Descriptions.Item label="Full Name">
          <Text strong>
            {candidate.firstName} {candidate.lastName}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <Space size={4}>
              <span>Email Address</span>
              {canViewSensitiveContact ? (
                <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
              ) : (
                <LockOutlined style={{ color: '#faad14' }} />
              )}
            </Space>
          }
        >
          {canViewSensitiveContact ? (
            <Text copyable>{candidate.email}</Text>
          ) : (
            <Space>
              <Text type="secondary">{maskContactInfo(candidate.email, true)}</Text>
              <Tag color="orange">Protected (RBAC)</Tag>
            </Space>
          )}
        </Descriptions.Item>

        <Descriptions.Item
          label={
            <Space size={4}>
              <span>Phone</span>
              {canViewSensitiveContact ? (
                <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
              ) : (
                <LockOutlined style={{ color: '#faad14' }} />
              )}
            </Space>
          }
        >
          {canViewSensitiveContact ? (
            candidate.phone || '-'
          ) : (
            <Space>
              <Text type="secondary">{maskContactInfo(candidate.phone, false)}</Text>
              <Tag color="orange">Protected (RBAC)</Tag>
            </Space>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Sourcing Source">
          <Tag color="blue">{candidate.source || 'Direct / Unspecified'}</Tag>
        </Descriptions.Item>

        <Descriptions.Item label="Resume URL">
          {candidate.resumeUrl ? (
            <a
              href={candidate.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <FilePdfOutlined />
              <span>View Submitted Resume</span>
              <LinkOutlined style={{ fontSize: 12 }} />
            </a>
          ) : (
            <Text type="secondary">No document provided</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Profile Created">
          {new Date(candidate.createdAt).toLocaleString()}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <Title level={5}>Application History & Associated Postings</Title>
      {candidate.applications && candidate.applications.length > 0 ? (
        <Table
          dataSource={candidate.applications}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            {
              title: 'Job Posting',
              key: 'jobPosting',
              render: (_, app) => (
                <div>
                  <Text strong>{app.jobPosting?.title || `Job #${app.jobPostingId}`}</Text>
                </div>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: ApplicationStatus) => {
                const conf = APPLICATION_STATUS_CONFIG[status] || {
                  label: status,
                  color: 'default',
                };
                return <Tag color={conf.color}>{conf.label}</Tag>;
              },
            },
            {
              title: 'Applied Date',
              dataIndex: 'createdAt',
              key: 'createdAt',
              render: (date) => new Date(date).toLocaleDateString(),
            },
            {
              title: 'Action',
              key: 'action',
              render: (_, app) =>
                onSelectApplication ? (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      onSelectApplication(app.id);
                      onClose();
                    }}
                  >
                    View App
                  </Button>
                ) : null,
            },
          ]}
        />
      ) : (
        <Text type="secondary">This candidate has not been submitted for any open job postings yet.</Text>
      )}
    </Drawer>
  );
};
