import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Button,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Select,
  Typography,
  Popconfirm,
  Badge,
  message,
} from 'antd';
import {
  RiseOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  EditOutlined,
  EyeOutlined,
  SendOutlined,
  TrophyOutlined,
  AlertOutlined,
  DollarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { performanceApi } from '../../api/performance';
import { employeeApi } from '../../api/employee';
import { positionApi } from '../../api/organization';
import { useAuthStore } from '../../store/useAuthStore';
import { normalizeApiError } from '../../api/client';
import {
  PerformanceReview,
  Goal,
  PromotionRequest,
  ImprovementPlan,
} from '../../types/performance';

import { ReviewScoringDrawer } from './components/ReviewScoringDrawer';
import { CreateCycleModal } from './components/CreateCycleModal';
import { CreateGoalModal } from './components/CreateGoalModal';
import { CreateReviewModal } from './components/CreateReviewModal';
import { RequestPromotionModal } from './components/RequestPromotionModal';
import { CreatePipModal } from './components/CreatePipModal';
import { PipDetailDrawer } from './components/PipDetailDrawer';

const { Title, Text } = Typography;

export const PerformancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const roles = user?.roles ?? [];
  const isHeadOfHr = roles.includes('HEAD_OF_HR');
  const canManagePerformance = isHeadOfHr || roles.includes('HR_PERFORMANCE');
  const canManagePip = isHeadOfHr || roles.includes('HR_PERFORMANCE');

  // State
  const [activeTab, setActiveTab] = useState('cycles');
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>(
    undefined,
  );
  const [reviewStatusFilter, setReviewStatusFilter] = useState<
    string | undefined
  >(undefined);

  // Modals / Drawers
  const [createCycleModalOpen, setCreateCycleModalOpen] = useState(false);
  const [createGoalModalOpen, setCreateGoalModalOpen] = useState(false);
  const [createReviewModalOpen, setCreateReviewModalOpen] = useState(false);
  const [requestPromoModalOpen, setRequestPromoModalOpen] = useState(false);
  const [createPipModalOpen, setCreatePipModalOpen] = useState(false);

  const [activeScoringReview, setActiveScoringReview] =
    useState<PerformanceReview | null>(null);
  const [scoringDrawerOpen, setScoringDrawerOpen] = useState(false);

  const [activeDetailPip, setActiveDetailPip] =
    useState<ImprovementPlan | null>(null);
  const [pipDrawerOpen, setPipDrawerOpen] = useState(false);

  // Queries
  const { data: cycles = [], refetch: refetchCycles } = useQuery({
    queryKey: ['performance-cycles'],
    queryFn: performanceApi.getCycles,
  });

  // Default selected cycle to first cycle if available
  React.useEffect(() => {
    if (cycles.length > 0 && !selectedCycleId) {
      setSelectedCycleId(cycles[0].id);
    }
  }, [cycles, selectedCycleId]);

  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['performance-goals', selectedCycleId],
    queryFn: () => performanceApi.getGoals(selectedCycleId),
    enabled: !!selectedCycleId,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['performance-reviews', selectedCycleId, reviewStatusFilter],
    queryFn: () =>
      performanceApi.getReviews({
        cycleId: selectedCycleId,
        status: reviewStatusFilter,
      }),
  });

  const { data: promotions = [], isLoading: promosLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => performanceApi.getPromotions(),
  });

  const { data: pips = [], isLoading: pipsLoading } = useQuery({
    queryKey: ['pips'],
    queryFn: () => performanceApi.getPips(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-directory'],
    queryFn: employeeApi.list,
  });

  const { data: positionsData } = useQuery({
    queryKey: ['positions-list'],
    queryFn: () => positionApi.list(),
  });
  const positions = positionsData?.positions || [];

  // Mutations
  const createCycleMutation = useMutation({
    mutationFn: performanceApi.createCycle,
    onSuccess: (newCycle) => {
      message.success('Performance cycle created successfully');
      queryClient.invalidateQueries({ queryKey: ['performance-cycles'] });
      setSelectedCycleId(newCycle.id);
      setCreateCycleModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const createGoalMutation = useMutation({
    mutationFn: performanceApi.createGoal,
    onSuccess: () => {
      message.success('Goal created successfully');
      queryClient.invalidateQueries({ queryKey: ['performance-goals'] });
      setCreateGoalModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const createReviewMutation = useMutation({
    mutationFn: performanceApi.createReview,
    onSuccess: () => {
      message.success('Review initiated successfully');
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      setCreateReviewModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const evaluateReviewMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      performanceApi.evaluateReview(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
    },
  });

  const approveReviewMutation = useMutation({
    mutationFn: (id: number) => performanceApi.approveReview(id),
    onSuccess: () => {
      message.success('Review submitted for executive sign-off');
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const finalizeReviewMutation = useMutation({
    mutationFn: (id: number) => performanceApi.finalizeReview(id),
    onSuccess: () => {
      message.success('Review finalized and locked as official record');
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const requestPromotionMutation = useMutation({
    mutationFn: performanceApi.requestPromotion,
    onSuccess: () => {
      message.success('Promotion request submitted for executive approval');
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setRequestPromoModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const approvePromoMutation = useMutation({
    mutationFn: (id: number) => performanceApi.approvePromotion(id),
    onSuccess: () => {
      message.success(
        'Promotion approved! Employee position & compensation updated.',
      );
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['employees-directory'] });
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const rejectPromoMutation = useMutation({
    mutationFn: (id: number) => performanceApi.rejectPromotion(id),
    onSuccess: () => {
      message.warning('Promotion request rejected');
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const createPipMutation = useMutation({
    mutationFn: performanceApi.createPip,
    onSuccess: () => {
      message.success('Performance Improvement Plan initiated');
      queryClient.invalidateQueries({ queryKey: ['pips'] });
      setCreatePipModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const addPipItemMutation = useMutation({
    mutationFn: ({ pipId, payload }: { pipId: number; payload: any }) =>
      performanceApi.addPipItem(pipId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pips'] });
      if (activeDetailPip) {
        performanceApi
          .getPipById(activeDetailPip.id)
          .then((fresh) => setActiveDetailPip(fresh));
      }
    },
  });

  const updatePipProgressMutation = useMutation({
    mutationFn: ({ itemId, progress }: { itemId: number; progress: number }) =>
      performanceApi.updatePipProgress(itemId, { progress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pips'] });
      if (activeDetailPip) {
        performanceApi
          .getPipById(activeDetailPip.id)
          .then((fresh) => setActiveDetailPip(fresh));
      }
    },
  });

  // Scoring submission handler
  const handleScoreReviewSubmit = async (payload: any) => {
    if (!activeScoringReview) return;
    await evaluateReviewMutation.mutateAsync({
      id: activeScoringReview.id,
      payload,
    });
  };

  // Helper status tags
  const renderReviewStatusTag = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Tag color="default">Draft</Tag>;
      case 'SUBMITTED':
        return <Tag color="processing">Submitted</Tag>;
      case 'UNDER_REVIEW':
        return <Tag color="cyan">Under Review</Tag>;
      case 'HEAD_OF_HR_REVIEW':
        return <Tag color="purple">Pending HR Sign-off</Tag>;
      case 'FINALIZED':
        return (
          <Tag color="success" icon={<LockOutlined />}>
            Finalized
          </Tag>
        );
      case 'REJECTED':
        return <Tag color="error">Rejected</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const renderPromoStatusTag = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Tag color="blue">Submitted</Tag>;
      case 'PENDING_APPROVAL':
        return <Tag color="orange">Pending Approval</Tag>;
      case 'APPROVED':
        return (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Approved
          </Tag>
        );
      case 'REJECTED':
        return (
          <Tag color="red" icon={<CloseCircleOutlined />}>
            Rejected
          </Tag>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Metrics
  const activeCycle = cycles.find((c) => c.id === selectedCycleId);
  const totalReviewsCount = reviews.length;
  const finalizedReviewsCount = reviews.filter(
    (r) => r.status === 'FINALIZED',
  ).length;
  const activePipsCount = pips.filter((p) => p.status === 'ACTIVE').length;

  return (
    <div style={{ padding: '24px 0' }}>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Performance Management & Governance
          </Title>
          <Text type="secondary">
            Appraisal cycles, goal weighting, review scoring, promotions, and
            improvement plans
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetchCycles()}>
            Refresh
          </Button>
          {canManagePerformance && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateCycleModalOpen(true)}
            >
              New Appraisal Cycle
            </Button>
          )}
        </Space>
      </div>

      {/* KPI Overview Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Cycles"
              value={cycles.length}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Active Cycle Reviews"
              value={totalReviewsCount}
              prefix={<TrophyOutlined />}
              suffix={`(${finalizedReviewsCount} Finalized)`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Promotion Requests"
              value={promotions.length}
              prefix={<DollarOutlined />}
              styles={{ content: { color: '#1677ff' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Active PIPs"
              value={activePipsCount}
              prefix={<AlertOutlined />}
              styles={{
                content: { color: activePipsCount > 0 ? '#cf1322' : '#3f8600' },
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            // Tab 1: Cycles & Goals
            {
              key: 'cycles',
              label: 'Evaluation Cycles & Goals',
              children: (
                <div>
                  <div
                    style={{
                      marginBottom: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Space>
                      <Text strong>Active Evaluation Cycle:</Text>
                      <Select
                        style={{ width: 320 }}
                        value={selectedCycleId}
                        onChange={setSelectedCycleId}
                        placeholder="Select Cycle"
                      >
                        {cycles.map((c) => (
                          <Select.Option key={c.id} value={c.id}>
                            {c.name} ({dayjs(c.startDate).format('YYYY-MM-DD')}{' '}
                            - {dayjs(c.endDate).format('YYYY-MM-DD')})
                          </Select.Option>
                        ))}
                      </Select>
                      {activeCycle && (
                        <Tag
                          color={
                            activeCycle.status === 'CLOSED'
                              ? 'default'
                              : 'green'
                          }
                        >
                          {activeCycle.status}
                        </Tag>
                      )}
                    </Space>
                    {canManagePerformance && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateGoalModalOpen(true)}
                        disabled={!selectedCycleId}
                      >
                        Add Employee Goal
                      </Button>
                    )}
                  </div>

                  <Table
                    loading={goalsLoading}
                    dataSource={goals}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Employee',
                        key: 'employee',
                        render: (_: any, record: Goal) => (
                          <Text strong>
                            {record.employee?.firstName}{' '}
                            {record.employee?.lastName} (
                            {record.employee?.employeeId})
                          </Text>
                        ),
                      },
                      {
                        title: 'Goal Title',
                        dataIndex: 'title',
                        key: 'title',
                      },
                      {
                        title: 'Weight',
                        dataIndex: 'weight',
                        key: 'weight',
                        render: (w: number) => <Tag color="blue">{w}%</Tag>,
                      },
                      {
                        title: 'Target Outcome',
                        dataIndex: 'target',
                        key: 'target',
                        render: (t: string) => t || '-',
                      },
                      {
                        title: 'Target Due Date',
                        dataIndex: 'dueDate',
                        key: 'dueDate',
                        render: (d: string) => dayjs(d).format('YYYY-MM-DD'),
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (st: string) => <Tag>{st}</Tag>,
                      },
                    ]}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },

            // Tab 2: Reviews & Appraisals
            {
              key: 'reviews',
              label: 'Employee Reviews & Scoring',
              children: (
                <div>
                  <div
                    style={{
                      marginBottom: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Space>
                      <Select
                        placeholder="Filter by Status"
                        allowClear
                        style={{ width: 180 }}
                        value={reviewStatusFilter}
                        onChange={setReviewStatusFilter}
                      >
                        <Select.Option value="DRAFT">Draft</Select.Option>
                        <Select.Option value="SUBMITTED">
                          Submitted
                        </Select.Option>
                        <Select.Option value="HEAD_OF_HR_REVIEW">
                          Pending Sign-off
                        </Select.Option>
                        <Select.Option value="FINALIZED">
                          Finalized
                        </Select.Option>
                      </Select>
                    </Space>
                    {canManagePerformance && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateReviewModalOpen(true)}
                      >
                        Initiate Review
                      </Button>
                    )}
                  </div>

                  <Table
                    loading={reviewsLoading}
                    dataSource={reviews}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Review ID',
                        dataIndex: 'id',
                        key: 'id',
                        render: (id: number) => `#REV-${id}`,
                      },
                      {
                        title: 'Employee',
                        key: 'employee',
                        render: (_: any, record: PerformanceReview) => (
                          <div>
                            <Text strong>
                              {record.employee?.firstName}{' '}
                              {record.employee?.lastName}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {record.employee?.employeeId} |{' '}
                              {record.employee?.position?.title || 'N/A'}
                            </Text>
                          </div>
                        ),
                      },
                      {
                        title: 'Reviewer',
                        key: 'reviewer',
                        render: (_: any, record: PerformanceReview) =>
                          record.reviewer ? (
                            <span>
                              {record.reviewer.firstName}{' '}
                              {record.reviewer.lastName}
                            </span>
                          ) : (
                            <Text type="secondary">Unassigned</Text>
                          ),
                      },
                      {
                        title: 'Overall Score (0-5)',
                        dataIndex: 'overallScore',
                        key: 'overallScore',
                        render: (score: number | null | undefined) =>
                          score !== null && score !== undefined ? (
                            <Tag
                              color="cyan"
                              style={{ fontSize: 13, fontWeight: 'bold' }}
                            >
                              {score.toFixed(2)} / 5.0
                            </Tag>
                          ) : (
                            <Text type="secondary">-</Text>
                          ),
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: renderReviewStatusTag,
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_: any, record: PerformanceReview) => {
                          const isFinal = record.status === 'FINALIZED';
                          return (
                            <Space size="small">
                              <Button
                                size="small"
                                icon={
                                  isFinal ? <EyeOutlined /> : <EditOutlined />
                                }
                                onClick={() => {
                                  setActiveScoringReview(record);
                                  setScoringDrawerOpen(true);
                                }}
                              >
                                {isFinal ? 'View (Locked)' : 'Score / Evaluate'}
                              </Button>

                              {/* Advance to HR Review if submitted */}
                              {record.status === 'SUBMITTED' &&
                                canManagePerformance && (
                                  <Button
                                    size="small"
                                    type="dashed"
                                    icon={<SendOutlined />}
                                    onClick={() =>
                                      approveReviewMutation.mutate(record.id)
                                    }
                                  >
                                    Submit to HR
                                  </Button>
                                )}

                              {/* Executive Finalization (HEAD_OF_HR only) */}
                              {record.status === 'HEAD_OF_HR_REVIEW' &&
                                isHeadOfHr && (
                                  <Popconfirm
                                    title="Finalize Review"
                                    description="This will lock ratings and officially finalize the evaluation. Continue?"
                                    okText="Yes, Finalize"
                                    onConfirm={() => {
                                      console.log(
                                        'ONCONFIRM FINALIZE CALLED FOR RECORD ID:',
                                        record.id,
                                      );
                                      finalizeReviewMutation.mutate(record.id);
                                    }}
                                  >
                                    <Button
                                      size="small"
                                      type="primary"
                                      icon={<LockOutlined />}
                                    >
                                      Finalize
                                    </Button>
                                  </Popconfirm>
                                )}
                            </Space>
                          );
                        },
                      },
                    ]}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },

            // Tab 3: Promotions & Salary
            {
              key: 'promotions',
              label: 'Promotion & Salary Increases',
              children: (
                <div>
                  <div
                    style={{
                      marginBottom: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text type="secondary">
                      Executive promotion workflow with position elevation and
                      salary calibration
                    </Text>
                    {canManagePerformance && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setRequestPromoModalOpen(true)}
                      >
                        Recommend Promotion
                      </Button>
                    )}
                  </div>

                  <Table
                    loading={promosLoading}
                    dataSource={promotions}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Employee',
                        key: 'employee',
                        render: (_: any, record: PromotionRequest) => (
                          <div>
                            <Text strong>
                              {record.employee?.firstName}{' '}
                              {record.employee?.lastName}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {record.employee?.employeeId}
                            </Text>
                          </div>
                        ),
                      },
                      {
                        title: 'Current Position',
                        key: 'currentPos',
                        render: (_: any, record: PromotionRequest) =>
                          record.currentPosition?.title || 'N/A',
                      },
                      {
                        title: 'Proposed Position',
                        key: 'proposedPos',
                        render: (_: any, record: PromotionRequest) => (
                          <Tag color="purple">
                            {record.proposedPosition?.title || 'N/A'}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Proposed Salary',
                        dataIndex: 'proposedSalary',
                        key: 'proposedSalary',
                        render: (salary?: number | null) =>
                          salary ? (
                            <Text strong style={{ color: '#389e0d' }}>
                              ${salary.toLocaleString()}
                            </Text>
                          ) : (
                            <Text type="secondary">Unchanged</Text>
                          ),
                      },
                      {
                        title: 'Effective Date',
                        dataIndex: 'effectiveDate',
                        key: 'effectiveDate',
                        render: (d: string) => dayjs(d).format('YYYY-MM-DD'),
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: renderPromoStatusTag,
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_: any, record: PromotionRequest) => {
                          const canApprove =
                            isHeadOfHr &&
                            (record.status === 'SUBMITTED' ||
                              record.status === 'PENDING_APPROVAL');
                          if (!canApprove) return null;
                          return (
                            <Space size="small">
                              <Popconfirm
                                title="Approve Promotion"
                                description="This will update position and salary history in database. Proceed?"
                                okText="Yes, Approve"
                                onConfirm={() =>
                                  approvePromoMutation.mutate(record.id)
                                }
                              >
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<CheckCircleOutlined />}
                                >
                                  Approve
                                </Button>
                              </Popconfirm>
                              <Popconfirm
                                title="Reject Promotion"
                                description="Reject this recommendation?"
                                okText="Yes, Reject"
                                onConfirm={() =>
                                  rejectPromoMutation.mutate(record.id)
                                }
                              >
                                <Button
                                  size="small"
                                  danger
                                  icon={<CloseCircleOutlined />}
                                >
                                  Reject
                                </Button>
                              </Popconfirm>
                            </Space>
                          );
                        },
                      },
                    ]}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },

            // Tab 4: Performance Improvement Plans (PIP)
            {
              key: 'pips',
              label: 'Performance Improvement Plans (PIP)',
              children: (
                <div>
                  <div
                    style={{
                      marginBottom: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text type="secondary">
                      Structured remediation plans with milestone tracking and
                      progress audits
                    </Text>
                    {canManagePip && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreatePipModalOpen(true)}
                      >
                        Initiate Improvement Plan
                      </Button>
                    )}
                  </div>

                  <Table
                    loading={pipsLoading}
                    dataSource={pips}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Employee',
                        key: 'employee',
                        render: (_: any, record: ImprovementPlan) => (
                          <div>
                            <Text strong>
                              {record.employee?.firstName}{' '}
                              {record.employee?.lastName}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {record.employee?.employeeId}
                            </Text>
                          </div>
                        ),
                      },
                      {
                        title: 'Target Objective',
                        dataIndex: 'objective',
                        key: 'objective',
                        render: (obj: string) => (
                          <Text ellipsis style={{ maxWidth: 280 }}>
                            {obj}
                          </Text>
                        ),
                      },
                      {
                        title: 'Plan Window',
                        key: 'dates',
                        render: (_: any, record: ImprovementPlan) => (
                          <span>
                            {dayjs(record.startDate).format('YYYY-MM-DD')} ~{' '}
                            {dayjs(record.endDate).format('YYYY-MM-DD')}
                          </span>
                        ),
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (st: string) => (
                          <Tag color={st === 'ACTIVE' ? 'orange' : 'green'}>
                            {st}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Action Items',
                        key: 'itemsCount',
                        render: (_: any, record: ImprovementPlan) => (
                          <Badge
                            count={record.items?.length || 0}
                            style={{ backgroundColor: '#108ee9' }}
                          />
                        ),
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_: any, record: ImprovementPlan) => (
                          <Button
                            size="small"
                            type="primary"
                            ghost
                            onClick={() => {
                              setActiveDetailPip(record);
                              setPipDrawerOpen(true);
                            }}
                          >
                            View & Update Milestones
                          </Button>
                        ),
                      },
                    ]}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Modals & Drawers */}
      <CreateCycleModal
        visible={createCycleModalOpen}
        onCancel={() => setCreateCycleModalOpen(false)}
        onSubmit={async (values) => {
          await createCycleMutation.mutateAsync(values);
        }}
        loading={createCycleMutation.isPending}
      />

      <CreateGoalModal
        visible={createGoalModalOpen}
        onCancel={() => setCreateGoalModalOpen(false)}
        onSubmit={async (values) => {
          await createGoalMutation.mutateAsync(values);
        }}
        cycles={cycles}
        employees={employees}
        selectedCycleId={selectedCycleId}
        loading={createGoalMutation.isPending}
      />

      <CreateReviewModal
        visible={createReviewModalOpen}
        onCancel={() => setCreateReviewModalOpen(false)}
        onSubmit={async (values) => {
          await createReviewMutation.mutateAsync(values);
        }}
        cycles={cycles}
        employees={employees}
        selectedCycleId={selectedCycleId}
        loading={createReviewMutation.isPending}
      />

      <ReviewScoringDrawer
        visible={scoringDrawerOpen}
        onClose={() => {
          setScoringDrawerOpen(false);
          setActiveScoringReview(null);
        }}
        review={activeScoringReview}
        goals={
          activeScoringReview
            ? goals.filter(
                (g) => g.employeeId === activeScoringReview.employeeId,
              )
            : []
        }
        onSubmitScores={handleScoreReviewSubmit}
        isSubmitting={evaluateReviewMutation.isPending}
      />

      <RequestPromotionModal
        visible={requestPromoModalOpen}
        onCancel={() => setRequestPromoModalOpen(false)}
        onSubmit={async (values) => {
          await requestPromotionMutation.mutateAsync(values);
        }}
        employees={employees}
        positions={positions}
        reviews={reviews}
        loading={requestPromotionMutation.isPending}
      />

      <CreatePipModal
        visible={createPipModalOpen}
        onCancel={() => setCreatePipModalOpen(false)}
        onSubmit={async (values) => {
          await createPipMutation.mutateAsync(values);
        }}
        employees={employees}
        loading={createPipMutation.isPending}
      />

      <PipDetailDrawer
        visible={pipDrawerOpen}
        onClose={() => {
          setPipDrawerOpen(false);
          setActiveDetailPip(null);
        }}
        pip={activeDetailPip}
        onAddItem={async (pipId, item) => {
          await addPipItemMutation.mutateAsync({ pipId, payload: item });
        }}
        onUpdateProgress={async (itemId, progress) => {
          await updatePipProgressMutation.mutateAsync({ itemId, progress });
        }}
        canUpdate={canManagePip}
      />
    </div>
  );
};
