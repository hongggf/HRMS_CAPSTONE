import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Tabs,
  Progress,
  Space,
  Empty,
  Statistic,
  Modal,
  Form,
  Rate,
  Input,
  Drawer,
  Descriptions,
  List,
  Timeline,
  Alert,
  Tooltip,
  theme,
  message,
} from 'antd';
import {
  ReadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  BookOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  UserOutlined,
  StarOutlined,
  ReloadOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lndApi } from '../../api/lnd';
import {
  EmployeeLearningSummary,
  EmployeeAssignedTraining,
  SkillLevel,
} from '../../types/lnd';
import { normalizeApiError } from '../../api/client';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const EmployeeLearningPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState<string>('assigned');

  // Drawer & Modal states
  const [selectedTraining, setSelectedTraining] = useState<EmployeeAssignedTraining | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);
  const [evaluatingTraining, setEvaluatingTraining] = useState<EmployeeAssignedTraining | null>(null);
  const [evalModalOpen, setEvalModalOpen] = useState<boolean>(false);
  const [evalForm] = Form.useForm();

  // Search & filter for available trainings
  const [availableSearch, setAvailableSearch] = useState<string>('');

  // Fetch employee learning summary securely
  const {
    data: learningData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<EmployeeLearningSummary>({
    queryKey: ['my-learning-summary'],
    queryFn: () => lndApi.getMyLearning(),
    staleTime: 30000,
  });

  // Self-enroll mutation
  const enrollMutation = useMutation({
    mutationFn: (trainingId: number) => lndApi.joinTraining(trainingId),
    onSuccess: (data) => {
      message.success(data.message || 'Successfully enrolled in training course');
      queryClient.invalidateQueries({ queryKey: ['my-learning-summary'] });
    },
    onError: (err: unknown) => {
      const normalized = normalizeApiError(err);
      message.error(normalized.message || 'Failed to enroll in training course');
    },
  });

  // Submit evaluation mutation
  const evalMutation = useMutation({
    mutationFn: ({
      trainingId,
      payload,
    }: {
      trainingId: number;
      payload: { rating: number; feedback?: string; comments?: string };
    }) => lndApi.submitEvaluation(trainingId, payload),
    onSuccess: () => {
      message.success('Course evaluation submitted successfully. Thank you for your feedback!');
      setEvalModalOpen(false);
      setEvaluatingTraining(null);
      evalForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['my-learning-summary'] });
    },
    onError: (err: unknown) => {
      const normalized = normalizeApiError(err);
      message.error(normalized.message || 'Failed to submit evaluation');
    },
  });

  const handleOpenEvaluation = (training: EmployeeAssignedTraining) => {
    setEvaluatingTraining(training);
    evalForm.resetFields();
    setEvalModalOpen(true);
  };

  const handleOpenDetail = (training: EmployeeAssignedTraining) => {
    setSelectedTraining(training);
    setDetailDrawerOpen(true);
  };

  const assignedTrainings = learningData?.assignedTrainings || [];
  const inProgressTrainings = useMemo(
    () => assignedTrainings.filter((t) => !t.isCompleted),
    [assignedTrainings],
  );
  const completedTrainings = useMemo(
    () => assignedTrainings.filter((t) => t.isCompleted),
    [assignedTrainings],
  );
  const upcomingSessions = learningData?.upcomingSessions || [];
  const trainingHistory = learningData?.trainingHistory || [];
  const availableTrainings = learningData?.availableTrainings || [];
  const skills = learningData?.skills || [];

  const filteredAvailable = useMemo(() => {
    if (!availableSearch.trim()) return availableTrainings;
    const q = availableSearch.toLowerCase();
    return availableTrainings.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.provider && t.provider.toLowerCase().includes(q)),
    );
  }, [availableTrainings, availableSearch]);

  const getSkillTagColor = (level: SkillLevel): string => {
    switch (level) {
      case 'EXPERT':
        return 'purple';
      case 'ADVANCED':
        return 'blue';
      case 'INTERMEDIATE':
        return 'cyan';
      case 'BEGINNER':
      default:
        return 'green';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <ReadOutlined style={{ color: '#1677ff', marginRight: 8 }} />
            My Learning & Professional Development
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Authorized course enrollments, interactive schedules, attendance tracking, and verified competencies
          </Text>
        </div>

        <Space>
          <Button
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Error state */}
      {isError && (
        <Alert
          type="error"
          showIcon
          message="Unable to Load Learning Records"
          description={
            (error as any)?.message ||
            'Failed to securely retrieve your training records from the HRMS server.'
          }
          action={
            <Button size="small" type="primary" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {/* 2. Top KPI Metric Summary Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            loading={isLoading}
            style={{
              borderRadius: token.borderRadiusLG,
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Statistic
              title="Assigned Courses"
              value={assignedTrainings.length}
              prefix={<BookOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            loading={isLoading}
            style={{
              borderRadius: token.borderRadiusLG,
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Statistic
              title="Completed Courses"
              value={completedTrainings.length}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            loading={isLoading}
            style={{
              borderRadius: token.borderRadiusLG,
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Statistic
              title="Upcoming Sessions"
              value={upcomingSessions.length}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            loading={isLoading}
            style={{
              borderRadius: token.borderRadiusLG,
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Statistic
              title="Verified Skills"
              value={skills.length}
              prefix={<TrophyOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 3. Main Navigation Tabs */}
      <Card
        style={{
          borderRadius: token.borderRadiusLG,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'assigned',
              label: (
                <span>
                  <BookOutlined /> My Assigned Training ({assignedTrainings.length})
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  {assignedTrainings.length > 0 ? (
                    <Row gutter={[16, 16]}>
                      {assignedTrainings.map((t) => (
                        <Col xs={24} md={12} key={t.assignmentId}>
                          <Card
                            size="small"
                            hoverable
                            style={{
                              borderRadius: 8,
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              border: `1px solid ${token.colorBorderSecondary}`,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  marginBottom: 8,
                                }}
                              >
                                <Tag color="blue">{t.category}</Tag>
                                <Space>
                                  {t.isCompleted ? (
                                    <Tag color="success">COMPLETED</Tag>
                                  ) : (
                                    <Tag color="processing">IN PROGRESS</Tag>
                                  )}
                                  {t.evaluation && (
                                    <Tag color="gold" icon={<StarOutlined />}>
                                      {t.evaluation.rating} ★
                                    </Tag>
                                  )}
                                </Space>
                              </div>

                              <Title level={4} style={{ margin: '4px 0 6px 0' }}>
                                {t.title}
                              </Title>

                              <Paragraph
                                ellipsis={{ rows: 2 }}
                                style={{ color: token.colorTextSecondary, fontSize: 13 }}
                              >
                                {t.description || 'No description provided.'}
                              </Paragraph>

                              <Space
                                wrap
                                size="middle"
                                style={{
                                  fontSize: 12,
                                  color: token.colorTextSecondary,
                                  marginBottom: 12,
                                }}
                              >
                                {t.provider && (
                                  <span>
                                    <UserOutlined style={{ marginRight: 4 }} />
                                    {t.provider}
                                  </span>
                                )}
                                <span>
                                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                                  {t.type}
                                </span>
                                {t.startDate && (
                                  <span>
                                    <CalendarOutlined style={{ marginRight: 4 }} />
                                    {new Date(t.startDate).toLocaleDateString()}
                                  </span>
                                )}
                              </Space>

                              <div style={{ marginBottom: 12 }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: 12,
                                    marginBottom: 4,
                                  }}
                                >
                                  <Text type="secondary">Attendance Progress</Text>
                                  <Text strong>
                                    {t.attendedSessions} / {t.totalSessions} Sessions ({t.progress}%)
                                  </Text>
                                </div>
                                <Progress
                                  percent={t.progress}
                                  size="small"
                                  status={t.isCompleted ? 'success' : 'active'}
                                />
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderTop: `1px solid ${token.colorBorderSecondary}`,
                                paddingTop: 10,
                                marginTop: 8,
                              }}
                            >
                              <Button
                                size="small"
                                type="link"
                                onClick={() => handleOpenDetail(t)}
                                style={{ padding: 0 }}
                              >
                                View Details & Sessions &rarr;
                              </Button>

                              {!t.evaluation ? (
                                <Button
                                  size="small"
                                  icon={<StarOutlined />}
                                  onClick={() => handleOpenEvaluation(t)}
                                >
                                  Evaluate
                                </Button>
                              ) : (
                                <Tooltip title="Feedback already submitted">
                                  <Button size="small" disabled icon={<CheckCircleOutlined />}>
                                    Evaluated
                                  </Button>
                                </Tooltip>
                              )}
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="You currently have no training programs assigned."
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'upcoming',
              label: (
                <span>
                  <ClockCircleOutlined /> Upcoming Sessions ({upcomingSessions.length})
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  {upcomingSessions.length > 0 ? (
                    <List
                      itemLayout="horizontal"
                      dataSource={upcomingSessions}
                      renderItem={(session) => (
                        <List.Item
                          style={{
                            padding: '12px 16px',
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                          }}
                        >
                          <List.Item.Meta
                            avatar={
                              <div
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 8,
                                  background: '#e6f4ff',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#1677ff',
                                  fontWeight: 'bold',
                                }}
                              >
                                <span style={{ fontSize: 11 }}>
                                  {new Date(session.date).toLocaleString('en-US', { month: 'short' })}
                                </span>
                                <span style={{ fontSize: 16 }}>
                                  {new Date(session.date).getDate()}
                                </span>
                              </div>
                            }
                            title={
                              <Space>
                                <Text strong style={{ fontSize: 15 }}>
                                  {session.title}
                                </Text>
                                <Tag color="blue">{session.category}</Tag>
                              </Space>
                            }
                            description={
                              <Space size="middle" wrap style={{ fontSize: 13, marginTop: 4 }}>
                                <span>
                                  <BookOutlined style={{ marginRight: 4 }} />
                                  Course: {session.trainingTitle}
                                </span>
                                <span>
                                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                                  Time: {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {session.location && (
                                  <span>
                                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                                    {session.location}
                                  </span>
                                )}
                              </Space>
                            }
                          />
                          <Tag
                            color={
                              session.attendanceStatus === 'ATTENDED'
                                ? 'success'
                                : session.attendanceStatus === 'ABSENT'
                                  ? 'error'
                                  : 'processing'
                            }
                          >
                            {session.attendanceStatus}
                          </Tag>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No upcoming training sessions scheduled."
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'inprogress',
              label: (
                <span>
                  <ClockCircleOutlined /> In Progress ({inProgressTrainings.length})
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  {inProgressTrainings.length > 0 ? (
                    <List
                      itemLayout="horizontal"
                      dataSource={inProgressTrainings}
                      renderItem={(t) => (
                        <List.Item
                          actions={[
                            <Button size="small" type="primary" onClick={() => handleOpenDetail(t)}>
                              View Sessions
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            title={<Text strong>{t.title}</Text>}
                            description={
                              <Space size="middle" wrap>
                                <Tag color="blue">{t.category}</Tag>
                                <Text type="secondary">
                                  {t.attendedSessions} of {t.totalSessions} sessions completed
                                </Text>
                                <Progress
                                  percent={t.progress}
                                  size="small"
                                  style={{ width: 140 }}
                                />
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No training programs currently in progress."
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'completed',
              label: (
                <span>
                  <CheckCircleOutlined /> Completed ({completedTrainings.length})
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  {completedTrainings.length > 0 ? (
                    <List
                      itemLayout="horizontal"
                      dataSource={completedTrainings}
                      renderItem={(t) => (
                        <List.Item
                          actions={[
                            t.evaluation ? (
                              <Tag color="gold" icon={<StarOutlined />}>
                                {t.evaluation.rating} / 5 Stars
                              </Tag>
                            ) : (
                              <Button
                                size="small"
                                icon={<StarOutlined />}
                                onClick={() => handleOpenEvaluation(t)}
                              >
                                Submit Evaluation
                              </Button>
                            ),
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              <CheckCircleOutlined
                                style={{ fontSize: 24, color: '#52c41a', marginTop: 4 }}
                              />
                            }
                            title={<Text strong>{t.title}</Text>}
                            description={
                              <Space size="middle" wrap>
                                <Tag color="blue">{t.category}</Tag>
                                <span>Completed all {t.totalSessions} sessions</span>
                                {t.provider && <span>Provider: {t.provider}</span>}
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No completed training programs found."
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'history',
              label: (
                <span>
                  <FileTextOutlined /> Training History
                </span>
              ),
              children: (
                <div style={{ marginTop: 12 }}>
                  {trainingHistory.length > 0 ? (
                    <Timeline
                      items={trainingHistory.map((item) => ({
                        color:
                          item.status === 'ATTENDED'
                            ? 'green'
                            : item.status === 'ABSENT'
                              ? 'red'
                              : 'blue',
                        children: (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Text strong style={{ fontSize: 14 }}>
                                {item.sessionTitle}
                              </Text>
                              <Tag
                                color={
                                  item.status === 'ATTENDED'
                                    ? 'success'
                                    : item.status === 'ABSENT'
                                      ? 'error'
                                      : 'default'
                                }
                              >
                                {item.status}
                              </Tag>
                            </div>
                            <div style={{ color: token.colorTextSecondary, fontSize: 12, marginTop: 4 }}>
                              <span>Course: {item.trainingTitle}</span> &bull;{' '}
                              <span>Date: {new Date(item.sessionDate).toLocaleDateString()}</span>
                              {item.location && <span> &bull; Location: {item.location}</span>}
                            </div>
                          </div>
                        ),
                      }))}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No recorded session attendance history available."
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'available',
              label: (
                <span>
                  <PlusCircleOutlined /> Available Training ({availableTrainings.length})
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 16, maxWidth: 360 }}>
                    <Input.Search
                      placeholder="Search available courses or categories..."
                      allowClear
                      value={availableSearch}
                      onChange={(e) => setAvailableSearch(e.target.value)}
                    />
                  </div>

                  {filteredAvailable.length > 0 ? (
                    <Row gutter={[16, 16]}>
                      {filteredAvailable.map((t) => (
                        <Col xs={24} md={12} key={t.id}>
                          <Card
                            size="small"
                            style={{
                              borderRadius: 8,
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              border: `1px solid ${token.colorBorderSecondary}`,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: 8,
                                }}
                              >
                                <Tag color="blue">{t.category}</Tag>
                                {t.seatsRemaining !== null && t.seatsRemaining !== undefined && (
                                  <Tag color={t.seatsRemaining > 0 ? 'green' : 'red'}>
                                    {t.seatsRemaining > 0
                                      ? `${t.seatsRemaining} seats left`
                                      : 'Full capacity'}
                                  </Tag>
                                )}
                              </div>

                              <Title level={4} style={{ margin: '4px 0 6px 0' }}>
                                {t.title}
                              </Title>

                              <Paragraph
                                ellipsis={{ rows: 2 }}
                                style={{ color: token.colorTextSecondary, fontSize: 13 }}
                              >
                                {t.description || 'No description provided.'}
                              </Paragraph>

                              <Space
                                wrap
                                size="middle"
                                style={{
                                  fontSize: 12,
                                  color: token.colorTextSecondary,
                                  marginBottom: 8,
                                }}
                              >
                                {t.provider && (
                                  <span>
                                    <UserOutlined style={{ marginRight: 4 }} />
                                    {t.provider}
                                  </span>
                                )}
                                <span>
                                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                                  {t.type}
                                </span>
                                <span>
                                  <CalendarOutlined style={{ marginRight: 4 }} />
                                  {t.sessionsCount} session(s)
                                </span>
                              </Space>
                            </div>

                            <div
                              style={{
                                borderTop: `1px solid ${token.colorBorderSecondary}`,
                                paddingTop: 10,
                                marginTop: 8,
                                textAlign: 'right',
                              }}
                            >
                              <Button
                                type="primary"
                                icon={<PlusCircleOutlined />}
                                loading={enrollMutation.isPending}
                                disabled={
                                  t.seatsRemaining !== null &&
                                  t.seatsRemaining !== undefined &&
                                  t.seatsRemaining <= 0
                                }
                                onClick={() => enrollMutation.mutate(t.id)}
                              >
                                Enroll in Course
                              </Button>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No additional courses available for self-enrollment at this time."
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'skills',
              label: (
                <span>
                  <TrophyOutlined /> Verified Skills ({skills.length})
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  {skills.length > 0 ? (
                    <List
                      grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
                      dataSource={skills}
                      renderItem={(skill) => (
                        <List.Item>
                          <Card
                            size="small"
                            style={{
                              borderRadius: 8,
                              border: `1px solid ${token.colorBorderSecondary}`,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text strong style={{ fontSize: 14 }}>
                                {skill.skillName}
                              </Text>
                              <Tag color={getSkillTagColor(skill.level)}>
                                {skill.level}
                              </Tag>
                            </div>
                            <Text
                              type="secondary"
                              style={{ fontSize: 11, display: 'block', marginTop: 6 }}
                            >
                              Acquired: {new Date(skill.acquiredAt).toLocaleDateString()}
                            </Text>
                          </Card>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No verified competencies recorded on your profile yet."
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'certificates',
              label: (
                <span>
                  <SafetyCertificateOutlined /> Certificates
                </span>
              ),
              children: (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Certificate generation is not currently issued for this module by the enterprise backend."
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 4. Course Details & Session Schedule Drawer */}
      <Drawer
        title={
          <Space>
            <BookOutlined style={{ color: '#1677ff' }} />
            <span>Course Details: {selectedTraining?.title}</span>
          </Space>
        }
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedTraining(null);
        }}
        width={620}
      >
        {selectedTraining && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Course Title">
                <Text strong>{selectedTraining.title}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                <Tag color="blue">{selectedTraining.category}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedTraining.isCompleted ? 'success' : 'processing'}>
                  {selectedTraining.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Instructor / Provider">
                {selectedTraining.provider || 'Internal Staff Trainer'}
              </Descriptions.Item>
              <Descriptions.Item label="Delivery Mode">
                {selectedTraining.type}
              </Descriptions.Item>
              <Descriptions.Item label="Schedule">
                {selectedTraining.startDate
                  ? `${new Date(selectedTraining.startDate).toLocaleDateString()} – ${selectedTraining.endDate ? new Date(selectedTraining.endDate).toLocaleDateString() : 'Ongoing'}`
                  : 'Flexible Schedule'}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedTraining.description || 'No additional syllabus notes recorded.'}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ margin: '8px 0 4px 0' }}>
              Scheduled Sessions & Attendance
            </Title>

            {selectedTraining.sessions && selectedTraining.sessions.length > 0 ? (
              <List
                size="small"
                bordered
                dataSource={selectedTraining.sessions}
                renderItem={(s, idx) => (
                  <List.Item
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <Text strong>
                        Session #{idx + 1}: {s.title}
                      </Text>
                      <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 2 }}>
                        <span>
                          <CalendarOutlined style={{ marginRight: 4 }} />
                          {new Date(s.date).toLocaleString()}
                        </span>
                        {s.location && (
                          <span style={{ marginLeft: 8 }}>
                            <EnvironmentOutlined style={{ marginRight: 4 }} />
                            {s.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Tag
                      color={
                        s.attendanceStatus === 'ATTENDED'
                          ? 'success'
                          : s.attendanceStatus === 'ABSENT'
                            ? 'error'
                            : 'processing'
                      }
                    >
                      {s.attendanceStatus}
                    </Tag>
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No specific session timestamps have been scheduled by HR."
              />
            )}

            {selectedTraining.evaluation && (
              <Card
                size="small"
                title="My Submitted Evaluation"
                style={{ borderRadius: 8, marginTop: 8 }}
              >
                <Rate disabled value={selectedTraining.evaluation.rating} />
                {selectedTraining.evaluation.feedback && (
                  <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                    "{selectedTraining.evaluation.feedback}"
                  </Paragraph>
                )}
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* 5. Course Evaluation Submission Modal */}
      <Modal
        title={
          <Space>
            <StarOutlined style={{ color: '#faad14' }} />
            <span>Course Evaluation: {evaluatingTraining?.title}</span>
          </Space>
        }
        open={evalModalOpen}
        onCancel={() => {
          setEvalModalOpen(false);
          setEvaluatingTraining(null);
        }}
        onOk={() => evalForm.submit()}
        confirmLoading={evalMutation.isPending}
        okText="Submit Evaluation"
      >
        <Form
          form={evalForm}
          layout="vertical"
          onFinish={(values) => {
            if (evaluatingTraining) {
              evalMutation.mutate({
                trainingId: evaluatingTraining.trainingId,
                payload: values,
              });
            }
          }}
          initialValues={{ rating: 5 }}
        >
          <Form.Item
            name="rating"
            label="Overall Course Quality & Delivery Rating"
            rules={[{ required: true, message: 'Please provide a star rating from 1 to 5' }]}
          >
            <Rate />
          </Form.Item>

          <Form.Item
            name="feedback"
            label="Key Learning Takeaways & Feedback"
            rules={[{ required: true, message: 'Please share your feedback' }]}
          >
            <TextArea
              rows={3}
              placeholder="What did you learn? How relevant was the content to your role?"
            />
          </Form.Item>

          <Form.Item name="comments" label="Additional Comments / Suggestions (Optional)">
            <TextArea rows={2} placeholder="Suggestions for the instructor or future sessions..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
