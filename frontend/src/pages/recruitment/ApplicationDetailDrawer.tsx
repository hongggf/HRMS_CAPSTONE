import React, { useState } from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Button,
  Space,
  Timeline,
  Divider,
  Alert,
  Popconfirm,
  Typography,
  Card,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  FormOutlined,
  FilePdfOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Application,
  APPLICATION_STATUS_CONFIG,
  Interview,
} from '../../types/recruitment';
import { recruitmentApi } from '../../api/recruitment';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { maskContactInfo } from './CandidateDetailDrawer';
import { ApplicationStatusModal } from './ApplicationStatusModal';
import { InterviewScheduleModal } from './InterviewScheduleModal';
import { InterviewEvaluationModal } from './InterviewEvaluationModal';

const { Title, Text, Paragraph } = Typography;

interface ApplicationDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  application: Application | null;
  onSuccess?: () => void;
}

export const ApplicationDetailDrawer: React.FC<ApplicationDetailDrawerProps> = ({
  open,
  onClose,
  application,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const isHeadOfHr = userRoles.includes('HEAD_OF_HR');
  const canViewSensitive = userRoles.some((r) =>
    ['HEAD_OF_HR', 'HR_RECRUITMENT', 'HR_ADMIN'].includes(r),
  );

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [selectedInterviewForEval, setSelectedInterviewForEval] =
    useState<Interview | null>(null);

  const approveMutation = useMutation({
    mutationFn: (id: number) => recruitmentApi.approveCandidate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-applications'] });
      if (onSuccess) onSuccess();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => recruitmentApi.rejectCandidate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-applications'] });
      if (onSuccess) onSuccess();
    },
  });

  if (!application) return null;

  const currentConfig =
    APPLICATION_STATUS_CONFIG[application.status] || {
      label: application.status,
      color: 'default',
    };

  const isPendingApproval =
    application.status === 'PENDING_HEAD_OF_HR_APPROVAL';
  const isTerminal = ['APPROVED', 'REJECTED', 'WITHDRAWN', 'HIRED'].includes(
    application.status,
  );
  const canSchedule = ['SHORTLISTED', 'INTERVIEW'].includes(
    application.status,
  );

  const activeMutation = approveMutation.isPending
    ? approveMutation
    : rejectMutation;
  const errorDetails = activeMutation.error
    ? normalizeApiError(activeMutation.error)
    : null;

  return (
    <>
      <Drawer
        title={
          <Space>
            <span>Application #{application.id}</span>
            <Tag color={currentConfig.color}>{currentConfig.label}</Tag>
          </Space>
        }
        open={open}
        onClose={onClose}
        width={680}
        extra={
          <Space wrap>
            {!isTerminal && (
              <Button
                icon={<FormOutlined />}
                onClick={() => setStatusModalOpen(true)}
              >
                Advance Stage
              </Button>
            )}

            {canSchedule && (
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                onClick={() => setScheduleModalOpen(true)}
              >
                Schedule Interview
              </Button>
            )}

            {isPendingApproval && isHeadOfHr && (
              <>
                <Button
                  type="primary"
                  style={{ backgroundColor: '#52c41a' }}
                  icon={<CheckCircleOutlined />}
                  loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(application.id)}
                >
                  Approve (Head of HR)
                </Button>
                <Popconfirm
                  title="Reject Candidate"
                  description="Are you sure you want to reject this candidate at the final approval stage?"
                  onConfirm={() => rejectMutation.mutate(application.id)}
                  okText="Yes, Reject"
                  cancelText="Cancel"
                >
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    loading={rejectMutation.isPending}
                  >
                    Reject
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        }
      >
        {errorDetails && (
          <Alert
            type="error"
            showIcon
            message="Operation Rejected by Server"
            description={errorDetails.message}
            style={{ marginBottom: 16 }}
          />
        )}

        {isPendingApproval && !isHeadOfHr && (
          <Alert
            type="warning"
            showIcon
            message="Awaiting Executive Approval"
            description="This candidate has passed departmental interviews and is pending Head of HR review and final hiring approval."
            style={{ marginBottom: 16 }}
          />
        )}

        <Descriptions
          title="Candidate Profile & Contact"
          bordered
          column={2}
          size="small"
        >
          <Descriptions.Item label="Candidate Name" span={2}>
            <Text strong style={{ fontSize: 16 }}>
              {application.candidate?.firstName}{' '}
              {application.candidate?.lastName}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={4}>
                <span>Email</span>
                {canViewSensitive ? (
                  <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <LockOutlined style={{ color: '#faad14' }} />
                )}
              </Space>
            }
          >
            {canViewSensitive ? (
              <Text copyable>{application.candidate?.email}</Text>
            ) : (
              <Space>
                <Text type="secondary">
                  {maskContactInfo(application.candidate?.email, true)}
                </Text>
                <Tag color="orange">Protected</Tag>
              </Space>
            )}
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={4}>
                <span>Phone</span>
                {canViewSensitive ? (
                  <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <LockOutlined style={{ color: '#faad14' }} />
                )}
              </Space>
            }
          >
            {canViewSensitive ? (
              application.candidate?.phone || '-'
            ) : (
              <Space>
                <Text type="secondary">
                  {maskContactInfo(application.candidate?.phone, false)}
                </Text>
                <Tag color="orange">Protected</Tag>
              </Space>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Sourcing Source">
            <Tag color="blue">
              {application.candidate?.source || 'Direct Sourcing'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Resume Document">
            {application.candidate?.resumeUrl ? (
              <a
                href={application.candidate.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FilePdfOutlined /> View Resume
              </a>
            ) : (
              <Text type="secondary">None provided</Text>
            )}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Descriptions
          title="Applied Vacancy Overview"
          bordered
          column={2}
          size="small"
        >
          <Descriptions.Item label="Position Title" span={2}>
            <Text strong>{application.jobPosting?.title}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Work Location">
            {application.jobPosting?.location || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Employment Type">
            {application.jobPosting?.employmentType || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="Applied Timestamp" span={2}>
            {new Date(application.createdAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Title level={5}>Interviews & Candidate Evaluations</Title>
        {application.interviews && application.interviews.length > 0 ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {application.interviews.map((iv) => (
              <Card
                key={iv.id}
                size="small"
                title={
                  <Space>
                    <Text strong>
                      {iv.type} Interview #{iv.id}
                    </Text>
                    <Tag
                      color={
                        iv.status === 'COMPLETED'
                          ? 'green'
                          : iv.status === 'SCHEDULED'
                            ? 'blue'
                            : 'default'
                      }
                    >
                      {iv.status}
                    </Tag>
                  </Space>
                }
                extra={
                  iv.status === 'SCHEDULED' && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        setSelectedInterviewForEval(iv);
                        setEvalModalOpen(true);
                      }}
                    >
                      Submit Evaluation
                    </Button>
                  )
                }
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary">Interviewer: </Text>
                    <Text>{iv.interviewer?.email || `User #${iv.interviewerId}`}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Scheduled: </Text>
                    <Text>{new Date(iv.scheduledAt).toLocaleString()}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Location: </Text>
                    <Text>{iv.location || 'Remote'}</Text>
                  </div>

                  {iv.evaluation && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 12,
                        background: 'rgba(0,0,0,0.02)',
                        borderRadius: 6,
                      }}
                    >
                      <Space
                        align="center"
                        style={{
                          width: '100%',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <Space>
                          <Text strong>Score:</Text>
                          <Tag
                            color={
                              iv.evaluation.score >= 70
                                ? 'green'
                                : iv.evaluation.score >= 50
                                  ? 'orange'
                                  : 'red'
                            }
                          >
                            {iv.evaluation.score} / 100
                          </Tag>
                        </Space>
                        <Tag color="purple">
                          {iv.evaluation.recommendation}
                        </Tag>
                      </Space>
                      <div>
                        <Text type="secondary">Strengths: </Text>
                        <Paragraph style={{ margin: 0 }}>
                          {iv.evaluation.strengths}
                        </Paragraph>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">Weaknesses: </Text>
                        <Paragraph style={{ margin: 0 }}>
                          {iv.evaluation.weaknesses}
                        </Paragraph>
                      </div>
                      {iv.evaluation.comments && (
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary">Notes: </Text>
                          <Text>{iv.evaluation.comments}</Text>
                        </div>
                      )}
                    </div>
                  )}
                </Space>
              </Card>
            ))}
          </Space>
        ) : (
          <Text type="secondary">No interviews scheduled yet for this application.</Text>
        )}

        <Divider />

        <Title level={5}>Screening Lifecycle Timeline</Title>
        {application.statusHistory && application.statusHistory.length > 0 ? (
          <Timeline
            style={{ marginTop: 12 }}
            items={application.statusHistory.map((h) => {
              const conf =
                APPLICATION_STATUS_CONFIG[h.status] || {
                  label: h.status,
                  color: 'blue',
                };
              return {
                color: conf.color,
                children: (
                  <div>
                    <Space size={8}>
                      <Tag color={conf.color}>{conf.label}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(h.createdAt).toLocaleString()}
                      </Text>
                      {h.changedBy && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          by {h.changedBy.email}
                        </Text>
                      )}
                    </Space>
                    {h.notes && (
                      <div style={{ marginTop: 4 }}>
                        <Text style={{ fontSize: 13 }}>{h.notes}</Text>
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        ) : (
          <Text type="secondary">No transition history recorded.</Text>
        )}
      </Drawer>

      <ApplicationStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        application={application}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ['recruitment-applications'],
          });
          if (onSuccess) onSuccess();
        }}
      />

      <InterviewScheduleModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        preselectedApplication={application}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ['recruitment-applications'],
          });
          queryClient.invalidateQueries({
            queryKey: ['recruitment-interviews'],
          });
          if (onSuccess) onSuccess();
        }}
      />

      <InterviewEvaluationModal
        open={evalModalOpen}
        onClose={() => {
          setEvalModalOpen(false);
          setSelectedInterviewForEval(null);
        }}
        interview={selectedInterviewForEval}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ['recruitment-applications'],
          });
          queryClient.invalidateQueries({
            queryKey: ['recruitment-interviews'],
          });
          if (onSuccess) onSuccess();
        }}
      />
    </>
  );
};
