import React, { useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Card,
  Statistic,
  Row,
  Col,
  Radio,
  Typography,
  Popconfirm,
  Badge,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  CalendarOutlined,
  FormOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  UserOutlined,
  FolderOpenOutlined,
  EditOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentApi } from '../../api/recruitment';
import {
  JobRequisition,
  JobPosting,
  Candidate,
  Application,
  Interview,
  RequisitionStatus,
  JobPostingStatus,
  ApplicationStatus,
  InterviewStatus,
  APPLICATION_STATUS_CONFIG,
} from '../../types/recruitment';
import { useAuthStore } from '../../store/useAuthStore';
import { maskContactInfo } from './CandidateDetailDrawer';
import { RequisitionModal } from './RequisitionModal';
import { RequisitionDetailDrawer } from './RequisitionDetailDrawer';
import { JobPostingModal } from './JobPostingModal';
import { JobPostingDetailDrawer } from './JobPostingDetailDrawer';
import { CandidateModal } from './CandidateModal';
import { CandidateDetailDrawer } from './CandidateDetailDrawer';
import { ApplicationModal } from './ApplicationModal';
import { ApplicationStatusModal } from './ApplicationStatusModal';
import { ApplicationDetailDrawer } from './ApplicationDetailDrawer';
import { InterviewScheduleModal } from './InterviewScheduleModal';
import { InterviewEvaluationModal } from './InterviewEvaluationModal';

const { Title, Text } = Typography;

export const RecruitmentPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const isHeadOfHr = userRoles.includes('HEAD_OF_HR');
  const isRecruiter = userRoles.includes('HR_RECRUITMENT');
  const canViewSensitive = userRoles.some((r) =>
    ['HEAD_OF_HR', 'HR_RECRUITMENT', 'HR_ADMIN'].includes(r),
  );

  const [activeTab, setActiveTab] = useState<string>('applications');

  // --- Applications state ---
  const [appViewMode, setAppViewMode] = useState<'table' | 'kanban'>('table');
  const [appSearch, setAppSearch] = useState<string>('');
  const [appPostingFilter, setAppPostingFilter] = useState<number | undefined>();
  const [appStatusFilter, setAppStatusFilter] = useState<ApplicationStatus | undefined>();
  const [appPage, setAppPage] = useState<number>(1);
  const [appPageSize, setAppPageSize] = useState<number>(10);

  // --- Requisitions state ---
  const [reqStatusFilter, setReqStatusFilter] = useState<RequisitionStatus | undefined>();
  const [reqPage, setReqPage] = useState<number>(1);
  const [reqPageSize, setReqPageSize] = useState<number>(10);

  // --- Job Postings state ---
  const [postingStatusFilter, setPostingStatusFilter] = useState<JobPostingStatus | undefined>();
  const [postingPage, setPostingPage] = useState<number>(1);
  const [postingPageSize, setPostingPageSize] = useState<number>(10);

  // --- Candidates state ---
  const [candidateSearch, setCandidateSearch] = useState<string>('');
  const [candidatePage, setCandidatePage] = useState<number>(1);
  const [candidatePageSize, setCandidatePageSize] = useState<number>(10);

  // --- Interviews state ---
  const [interviewStatusFilter, setInterviewStatusFilter] = useState<InterviewStatus | undefined>();
  const [interviewPage, setInterviewPage] = useState<number>(1);
  const [interviewPageSize, setInterviewPageSize] = useState<number>(10);

  // --- Modal & Drawer Visibility ---
  const [requisitionModalOpen, setRequisitionModalOpen] = useState(false);
  const [requisitionDrawerOpen, setRequisitionDrawerOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<JobRequisition | null>(null);

  const [jobPostingModalOpen, setJobPostingModalOpen] = useState(false);
  const [postingToEdit, setPostingToEdit] = useState<JobPosting | null>(null);
  const [jobPostingDrawerOpen, setJobPostingDrawerOpen] = useState(false);
  const [selectedPosting, setSelectedPosting] = useState<JobPosting | null>(null);

  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [candidateDrawerOpen, setCandidateDrawerOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const [applicationModalOpen, setApplicationModalOpen] = useState(false);
  const [preselectedPostingId, setPreselectedPostingId] = useState<number | null>(null);
  const [applicationStatusModalOpen, setApplicationStatusModalOpen] = useState(false);
  const [applicationDrawerOpen, setApplicationDrawerOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [selectedInterviewForEval, setSelectedInterviewForEval] = useState<Interview | null>(null);

  // ================= QUERIES =================
  const { data: appsData, isLoading: isLoadingApps, refetch: refetchApps } = useQuery({
    queryKey: ['recruitment-applications', appPage, appPageSize, appPostingFilter, appStatusFilter, appSearch],
    queryFn: () =>
      recruitmentApi.listApplications({
        page: appPage,
        limit: appPageSize,
        jobPostingId: appPostingFilter,
        status: appStatusFilter,
        search: appSearch || undefined,
      }),
  });

  const { data: reqsData, isLoading: isLoadingReqs, refetch: refetchReqs } = useQuery({
    queryKey: ['recruitment-requisitions', reqPage, reqPageSize, reqStatusFilter],
    queryFn: () =>
      recruitmentApi.listRequisitions({
        page: reqPage,
        limit: reqPageSize,
        status: reqStatusFilter,
      }),
  });

  const { data: postingsData, isLoading: isLoadingPostings, refetch: refetchPostings } = useQuery({
    queryKey: ['recruitment-postings', postingPage, postingPageSize, postingStatusFilter],
    queryFn: () =>
      recruitmentApi.listJobPostings({
        page: postingPage,
        limit: postingPageSize,
        status: postingStatusFilter,
      }),
  });

  const { data: candidatesData, isLoading: isLoadingCandidates, refetch: refetchCandidates } = useQuery({
    queryKey: ['recruitment-candidates', candidatePage, candidatePageSize, candidateSearch],
    queryFn: () =>
      recruitmentApi.listCandidates({
        page: candidatePage,
        limit: candidatePageSize,
        search: candidateSearch || undefined,
      }),
  });

  const { data: interviewsData, isLoading: isLoadingInterviews, refetch: refetchInterviews } = useQuery({
    queryKey: ['recruitment-interviews', interviewPage, interviewPageSize, interviewStatusFilter],
    queryFn: () =>
      recruitmentApi.listInterviews({
        page: interviewPage,
        limit: interviewPageSize,
        status: interviewStatusFilter,
      }),
  });

  // KPI Calculations
  const openVacanciesCount =
    postingsData?.postings.filter((p) => p.status === 'PUBLISHED').length || 0;
  const activeApplicationsCount =
    appsData?.applications.filter(
      (a) => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(a.status),
    ).length || 0;
  const scheduledInterviewsCount =
    interviewsData?.interviews.filter((i) => i.status === 'SCHEDULED').length || 0;
  const pendingApprovalsCount =
    appsData?.applications.filter(
      (a) => a.status === 'PENDING_HEAD_OF_HR_APPROVAL',
    ).length || 0;

  // Head of HR approval mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => recruitmentApi.approveCandidate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-applications'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => recruitmentApi.rejectCandidate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-applications'] });
    },
  });

  // Kanban Columns
  const KANBAN_STAGES: ApplicationStatus[] = [
    'APPLIED',
    'SCREENING',
    'SHORTLISTED',
    'INTERVIEW',
    'SELECTED',
    'PENDING_HEAD_OF_HR_APPROVAL',
    'APPROVED',
    'HIRED',
  ];

  return (
    <div style={{ padding: '0 8px 32px 8px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Recruitment & Applicant Tracking (ATS)
          </Title>
          <Text type="secondary">
            Manage job requisitions, vacancies, candidate screening pipelines, interview sessions, and executive hiring approvals.
          </Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              refetchApps();
              refetchReqs();
              refetchPostings();
              refetchCandidates();
              refetchInterviews();
            }}
          >
            Refresh
          </Button>
          {(isRecruiter || isHeadOfHr) && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                if (activeTab === 'requisitions') setRequisitionModalOpen(true);
                else if (activeTab === 'postings') {
                  setPostingToEdit(null);
                  setJobPostingModalOpen(true);
                } else if (activeTab === 'candidates') setCandidateModalOpen(true);
                else if (activeTab === 'interviews') setScheduleModalOpen(true);
                else {
                  setPreselectedPostingId(null);
                  setApplicationModalOpen(true);
                }
              }}
            >
              {activeTab === 'requisitions'
                ? 'New Requisition'
                : activeTab === 'postings'
                  ? 'New Job Posting'
                  : activeTab === 'candidates'
                    ? 'New Candidate'
                    : activeTab === 'interviews'
                      ? 'Schedule Interview'
                      : 'New Application'}
            </Button>
          )}
        </Space>
      </div>

      {/* KPI Overview Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ background: '#f0f5ff', borderRadius: 8 }}>
            <Statistic
              title={<Text type="secondary">Open Vacancies</Text>}
              value={openVacanciesCount}
              valueStyle={{ color: '#1677ff', fontWeight: 700 }}
              prefix={<FolderOpenOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ background: '#f6ffed', borderRadius: 8 }}>
            <Statistic
              title={<Text type="secondary">Active Pipeline</Text>}
              value={activeApplicationsCount}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ background: '#f9f0ff', borderRadius: 8 }}>
            <Statistic
              title={<Text type="secondary">Scheduled Interviews</Text>}
              value={scheduledInterviewsCount}
              valueStyle={{ color: '#722ed1', fontWeight: 700 }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              background: pendingApprovalsCount > 0 ? '#fffbe6' : '#fafafa',
              borderRadius: 8,
              border: pendingApprovalsCount > 0 ? '1px solid #ffe58f' : undefined,
            }}
          >
            <Statistic
              title={<Text type="secondary">Pending Head of HR Approval</Text>}
              value={pendingApprovalsCount}
              valueStyle={{
                color: pendingApprovalsCount > 0 ? '#faad14' : '#8c8c8c',
                fontWeight: 700,
              }}
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          // ================= TAB 1: APPLICATIONS & PIPELINE =================
          {
            key: 'applications',
            label: (
              <span>
                <UserOutlined />
                Applications & Pipeline
                {appsData?.meta?.total !== undefined && (
                  <Badge
                    count={appsData.meta.total}
                    style={{ marginLeft: 8, backgroundColor: '#1677ff' }}
                  />
                )}
              </span>
            ),
            children: (
              <div>
                {/* Applications Filter Bar */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <Space wrap size="middle">
                    <Input
                      placeholder="Search candidate name, email, or role..."
                      prefix={<SearchOutlined />}
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      style={{ width: 280 }}
                      allowClear
                    />

                    <Select
                      placeholder="Filter by Job Posting..."
                      style={{ width: 220 }}
                      value={appPostingFilter}
                      onChange={setAppPostingFilter}
                      allowClear
                      options={postingsData?.postings.map((p) => ({
                        value: p.id,
                        label: p.title,
                      }))}
                    />

                    <Select
                      placeholder="Filter by Stage..."
                      style={{ width: 200 }}
                      value={appStatusFilter}
                      onChange={setAppStatusFilter}
                      allowClear
                      options={Object.entries(APPLICATION_STATUS_CONFIG).map(
                        ([statusKey, conf]) => ({
                          value: statusKey,
                          label: conf.label,
                        }),
                      )}
                    />

                    {(appSearch || appPostingFilter || appStatusFilter) && (
                      <Button
                        type="link"
                        onClick={() => {
                          setAppSearch('');
                          setAppPostingFilter(undefined);
                          setAppStatusFilter(undefined);
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </Space>

                  <Space>
                    <Radio.Group
                      value={appViewMode}
                      onChange={(e) => setAppViewMode(e.target.value)}
                      buttonStyle="solid"
                    >
                      <Radio.Button value="table">
                        <UnorderedListOutlined /> Table View
                      </Radio.Button>
                      <Radio.Button value="kanban">
                        <AppstoreOutlined /> Pipeline Board
                      </Radio.Button>
                    </Radio.Group>
                  </Space>
                </div>

                {/* Primary Table View */}
                {appViewMode === 'table' ? (
                  <Table
                    dataSource={appsData?.applications || []}
                    rowKey="id"
                    loading={isLoadingApps}
                    pagination={{
                      current: appPage,
                      pageSize: appPageSize,
                      total: appsData?.meta?.total || 0,
                      showSizeChanger: true,
                      onChange: (p, ps) => {
                        setAppPage(p);
                        setAppPageSize(ps);
                      },
                    }}
                    columns={[
                      {
                        title: 'Candidate',
                        key: 'candidate',
                        render: (_, app) => (
                          <div>
                            <Text strong style={{ fontSize: 14 }}>
                              {app.candidate?.firstName} {app.candidate?.lastName}
                            </Text>
                            <div>
                              <Tag color="cyan" style={{ fontSize: 11, marginTop: 2 }}>
                                {app.candidate?.source || 'Direct'}
                              </Tag>
                            </div>
                          </div>
                        ),
                      },
                      {
                        title: 'Target Vacancy',
                        key: 'jobPosting',
                        render: (_, app) => (
                          <div>
                            <Text strong>{app.jobPosting?.title}</Text>
                            <div style={{ fontSize: 12, color: '#888' }}>
                              {app.jobPosting?.location} · {app.jobPosting?.employmentType}
                            </div>
                          </div>
                        ),
                      },
                      {
                        title: 'Contact Information',
                        key: 'contact',
                        render: (_, app) => (
                          <div>
                            <div>
                              {canViewSensitive ? (
                                <Text copyable style={{ fontSize: 13 }}>
                                  {app.candidate?.email}
                                </Text>
                              ) : (
                                <Tooltip title="Protected candidate email">
                                  <Space size={4}>
                                    <LockOutlined style={{ color: '#faad14' }} />
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                      {maskContactInfo(app.candidate?.email, true)}
                                    </Text>
                                  </Space>
                                </Tooltip>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#888' }}>
                              {canViewSensitive
                                ? app.candidate?.phone || '-'
                                : maskContactInfo(app.candidate?.phone, false)}
                            </div>
                          </div>
                        ),
                      },
                      {
                        title: 'Stage',
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
                        title: 'Interviews & Rating',
                        key: 'interviews',
                        render: (_, app) => {
                          const count = app.interviews?.length || 0;
                          const evaluated = app.interviews?.find((i) => i.evaluation);
                          return (
                            <div>
                              <Text style={{ fontSize: 12 }}>
                                {count} session{count === 1 ? '' : 's'}
                              </Text>
                              {evaluated?.evaluation && (
                                <div>
                                  <Tag
                                    color={
                                      evaluated.evaluation.score >= 70
                                        ? 'green'
                                        : 'orange'
                                    }
                                    style={{ fontSize: 11 }}
                                  >
                                    Score: {evaluated.evaluation.score}
                                  </Tag>
                                </div>
                              )}
                            </div>
                          );
                        },
                      },
                      {
                        title: 'Applied Date',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        render: (date) => new Date(date).toLocaleDateString(),
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_, app) => {
                          const isPendingApproval =
                            app.status === 'PENDING_HEAD_OF_HR_APPROVAL';
                          const canSchedule = ['SHORTLISTED', 'INTERVIEW'].includes(
                            app.status,
                          );
                          const isTerminal = [
                            'APPROVED',
                            'REJECTED',
                            'WITHDRAWN',
                            'HIRED',
                          ].includes(app.status);

                          return (
                            <Space size="small" wrap>
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => {
                                  setSelectedApplication(app);
                                  setApplicationDrawerOpen(true);
                                }}
                              >
                                View
                              </Button>

                              {!isTerminal && (
                                <Button
                                  size="small"
                                  icon={<FormOutlined />}
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setApplicationStatusModalOpen(true);
                                  }}
                                >
                                  Advance
                                </Button>
                              )}

                              {canSchedule && (
                                <Button
                                  size="small"
                                  icon={<CalendarOutlined />}
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setScheduleModalOpen(true);
                                  }}
                                >
                                  Interview
                                </Button>
                              )}

                              {isPendingApproval && isHeadOfHr && (
                                <>
                                  <Button
                                    size="small"
                                    type="primary"
                                    style={{ backgroundColor: '#52c41a' }}
                                    icon={<CheckCircleOutlined />}
                                    loading={approveMutation.isPending}
                                    onClick={() => approveMutation.mutate(app.id)}
                                  >
                                    Approve
                                  </Button>
                                  <Popconfirm
                                    title="Reject Candidate"
                                    description="Reject this candidate at final approval stage?"
                                    onConfirm={() => rejectMutation.mutate(app.id)}
                                    okText="Yes, Reject"
                                    cancelText="Cancel"
                                  >
                                    <Button
                                      size="small"
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
                          );
                        },
                      },
                    ]}
                  />
                ) : (
                  // Kanban Pipeline Board
                  <div
                    style={{
                      display: 'flex',
                      gap: 16,
                      overflowX: 'auto',
                      paddingBottom: 16,
                      minHeight: 520,
                    }}
                  >
                    {KANBAN_STAGES.map((stageKey) => {
                      const conf = APPLICATION_STATUS_CONFIG[stageKey];
                      const stageApps =
                        appsData?.applications.filter((a) => a.status === stageKey) ||
                        [];

                      return (
                        <div
                          key={stageKey}
                          style={{
                            flex: '0 0 280px',
                            background: '#f8f9fa',
                            borderRadius: 8,
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          {/* Column Header */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 12,
                              paddingBottom: 8,
                              borderBottom: '2px solid rgba(0,0,0,0.06)',
                            }}
                          >
                            <Space size={6}>
                              <Tag color={conf.color}>{conf.label}</Tag>
                            </Space>
                            <Badge count={stageApps.length} overflowCount={99} />
                          </div>

                          {/* Candidate Cards */}
                          <div style={{ flex: 1, overflowY: 'auto' }}>
                            {stageApps.length === 0 ? (
                              <div
                                style={{
                                  textAlign: 'center',
                                  padding: '24px 0',
                                  color: '#aaa',
                                  fontSize: 13,
                                }}
                              >
                                No candidates in stage
                              </div>
                            ) : (
                              stageApps.map((app) => (
                                <Card
                                  key={app.id}
                                  size="small"
                                  style={{
                                    marginBottom: 10,
                                    borderRadius: 6,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                  }}
                                  actions={[
                                    <Button
                                      type="link"
                                      size="small"
                                      key="view"
                                      onClick={() => {
                                        setSelectedApplication(app);
                                        setApplicationDrawerOpen(true);
                                      }}
                                    >
                                      Detail
                                    </Button>,
                                    <Button
                                      type="link"
                                      size="small"
                                      key="advance"
                                      onClick={() => {
                                        setSelectedApplication(app);
                                        setApplicationStatusModalOpen(true);
                                      }}
                                    >
                                      Move
                                    </Button>,
                                  ]}
                                >
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                                    {app.candidate?.firstName} {app.candidate?.lastName}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: '#666',
                                      marginTop: 2,
                                    }}
                                  >
                                    {app.jobPosting?.title}
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      marginTop: 8,
                                    }}
                                  >
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      {new Date(app.createdAt).toLocaleDateString()}
                                    </Text>
                                    {app.interviews && app.interviews.length > 0 && (
                                      <Tag color="geekblue" style={{ fontSize: 10 }}>
                                        {app.interviews.length} Int.
                                      </Tag>
                                    )}
                                  </div>
                                </Card>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ),
          },

          // ================= TAB 2: JOB REQUISITIONS =================
          {
            key: 'requisitions',
            label: (
              <span>
                <FolderOpenOutlined />
                Job Requisitions
                {reqsData?.meta?.total !== undefined && (
                  <Badge
                    count={reqsData.meta.total}
                    style={{ marginLeft: 8, backgroundColor: '#722ed1' }}
                  />
                )}
              </span>
            ),
            children: (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Space>
                    <Select
                      placeholder="Filter by Requisition Status..."
                      style={{ width: 220 }}
                      value={reqStatusFilter}
                      onChange={setReqStatusFilter}
                      allowClear
                      options={[
                        { label: 'Draft', value: 'DRAFT' },
                        { label: 'Submitted', value: 'SUBMITTED' },
                        { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
                        { label: 'Approved', value: 'APPROVED' },
                        { label: 'Rejected', value: 'REJECTED' },
                        { label: 'Closed', value: 'CLOSED' },
                      ]}
                    />
                  </Space>
                  {(isRecruiter || isHeadOfHr) && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setRequisitionModalOpen(true)}
                    >
                      New Requisition
                    </Button>
                  )}
                </div>

                <Table
                  dataSource={reqsData?.requisitions || []}
                  rowKey="id"
                  loading={isLoadingReqs}
                  pagination={{
                    current: reqPage,
                    pageSize: reqPageSize,
                    total: reqsData?.meta?.total || 0,
                    showSizeChanger: true,
                    onChange: (p, ps) => {
                      setReqPage(p);
                      setReqPageSize(ps);
                    },
                  }}
                  columns={[
                    {
                      title: 'Req ID',
                      dataIndex: 'id',
                      key: 'id',
                      render: (id) => <Text strong>#{id}</Text>,
                    },
                    {
                      title: 'Position Title',
                      key: 'position',
                      render: (_, req) => (
                        <div>
                          <Text strong>
                            {req.workforceRequest?.position?.title || 'Position'}
                          </Text>
                          <div style={{ fontSize: 12, color: '#888' }}>
                            Code: {req.workforceRequest?.position?.code || '-'}
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: 'Department',
                      key: 'department',
                      render: (_, req) => (
                        <Tag color="blue">
                          {req.workforceRequest?.department?.name || 'Dept'}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Approved Headcount',
                      key: 'headcount',
                      render: (_, req) => (
                        <Text strong style={{ color: '#1677ff' }}>
                          {req.workforceRequest?.headcount || 1}
                        </Text>
                      ),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (st: RequisitionStatus) => {
                        const colors: Record<RequisitionStatus, string> = {
                          DRAFT: 'default',
                          SUBMITTED: 'processing',
                          PENDING_APPROVAL: 'warning',
                          APPROVED: 'success',
                          REJECTED: 'error',
                          CLOSED: 'purple',
                        };
                        return <Tag color={colors[st] || 'default'}>{st}</Tag>;
                      },
                    },
                    {
                      title: 'Requested By',
                      key: 'requester',
                      render: (_, req) =>
                        req.requester?.email || `User #${req.requestedBy}`,
                    },
                    {
                      title: 'Created Date',
                      dataIndex: 'createdAt',
                      key: 'createdAt',
                      render: (date) => new Date(date).toLocaleDateString(),
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_, req) => (
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => {
                            setSelectedRequisition(req);
                            setRequisitionDrawerOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },

          // ================= TAB 3: JOB POSTINGS =================
          {
            key: 'postings',
            label: (
              <span>
                <FolderOpenOutlined />
                Job Postings
                {postingsData?.meta?.total !== undefined && (
                  <Badge
                    count={postingsData.meta.total}
                    style={{ marginLeft: 8, backgroundColor: '#52c41a' }}
                  />
                )}
              </span>
            ),
            children: (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Space>
                    <Select
                      placeholder="Filter by Status..."
                      style={{ width: 180 }}
                      value={postingStatusFilter}
                      onChange={setPostingStatusFilter}
                      allowClear
                      options={[
                        { label: 'Draft', value: 'DRAFT' },
                        { label: 'Published', value: 'PUBLISHED' },
                        { label: 'Closed', value: 'CLOSED' },
                      ]}
                    />
                  </Space>
                  {(isRecruiter || isHeadOfHr) && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setPostingToEdit(null);
                        setJobPostingModalOpen(true);
                      }}
                    >
                      Create Job Posting
                    </Button>
                  )}
                </div>

                <Table
                  dataSource={postingsData?.postings || []}
                  rowKey="id"
                  loading={isLoadingPostings}
                  pagination={{
                    current: postingPage,
                    pageSize: postingPageSize,
                    total: postingsData?.meta?.total || 0,
                    showSizeChanger: true,
                    onChange: (p, ps) => {
                      setPostingPage(p);
                      setPostingPageSize(ps);
                    },
                  }}
                  columns={[
                    {
                      title: 'Job Title',
                      key: 'title',
                      render: (_, p) => (
                        <div>
                          <Text strong style={{ fontSize: 14 }}>
                            {p.title}
                          </Text>
                          <div style={{ fontSize: 12, color: '#888' }}>
                            Req #{p.requisitionId} · {p.location}
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: 'Type',
                      dataIndex: 'employmentType',
                      key: 'employmentType',
                      render: (type) => <Tag color="blue">{type}</Tag>,
                    },
                    {
                      title: 'Opening Date',
                      dataIndex: 'openingDate',
                      key: 'openingDate',
                      render: (date) => new Date(date).toLocaleDateString(),
                    },
                    {
                      title: 'Closing Date',
                      dataIndex: 'closingDate',
                      key: 'closingDate',
                      render: (date) =>
                        date ? new Date(date).toLocaleDateString() : 'Continuous',
                    },
                    {
                      title: 'Applications',
                      key: 'appsCount',
                      render: (_, p) => (
                        <Badge
                          count={p._count?.applications || p.applications?.length || 0}
                          showZero
                          style={{ backgroundColor: '#108ee9' }}
                        />
                      ),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (st: JobPostingStatus) => {
                        const conf: Record<JobPostingStatus, { label: string; color: string }> = {
                          DRAFT: { label: 'Draft', color: 'orange' },
                          PUBLISHED: { label: 'Published', color: 'green' },
                          CLOSED: { label: 'Closed', color: 'red' },
                        };
                        return <Tag color={conf[st].color}>{conf[st].label}</Tag>;
                      },
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_, p) => (
                        <Space size="small">
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => {
                              setSelectedPosting(p);
                              setJobPostingDrawerOpen(true);
                            }}
                          >
                            View
                          </Button>
                          {(isRecruiter || isHeadOfHr) && (
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setPostingToEdit(p);
                                setJobPostingModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                        </Space>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },

          // ================= TAB 4: CANDIDATE PROFILES =================
          {
            key: 'candidates',
            label: (
              <span>
                <UserOutlined />
                Candidate Profiles
                {candidatesData?.meta?.total !== undefined && (
                  <Badge
                    count={candidatesData.meta.total}
                    style={{ marginLeft: 8, backgroundColor: '#13c2c2' }}
                  />
                )}
              </span>
            ),
            children: (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Space>
                    <Input
                      placeholder="Search candidate name, email, or phone..."
                      prefix={<SearchOutlined />}
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      style={{ width: 320 }}
                      allowClear
                    />
                  </Space>
                  {(isRecruiter || isHeadOfHr) && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setCandidateModalOpen(true)}
                    >
                      New Candidate Profile
                    </Button>
                  )}
                </div>

                <Table
                  dataSource={candidatesData?.candidates || []}
                  rowKey="id"
                  loading={isLoadingCandidates}
                  pagination={{
                    current: candidatePage,
                    pageSize: candidatePageSize,
                    total: candidatesData?.meta?.total || 0,
                    showSizeChanger: true,
                    onChange: (p, ps) => {
                      setCandidatePage(p);
                      setCandidatePageSize(ps);
                    },
                  }}
                  columns={[
                    {
                      title: 'Candidate Name',
                      key: 'name',
                      render: (_, c) => (
                        <Text strong>
                          {c.firstName} {c.lastName}
                        </Text>
                      ),
                    },
                    {
                      title: 'Email Address',
                      key: 'email',
                      render: (_, c) =>
                        canViewSensitive ? (
                          <Text copyable>{c.email}</Text>
                        ) : (
                          <Space size={4}>
                            <LockOutlined style={{ color: '#faad14' }} />
                            <Text type="secondary">
                              {maskContactInfo(c.email, true)}
                            </Text>
                          </Space>
                        ),
                    },
                    {
                      title: 'Phone',
                      key: 'phone',
                      render: (_, c) =>
                        canViewSensitive
                          ? c.phone || '-'
                          : maskContactInfo(c.phone, false),
                    },
                    {
                      title: 'Sourcing Source',
                      dataIndex: 'source',
                      key: 'source',
                      render: (src) => <Tag color="blue">{src || 'Direct'}</Tag>,
                    },
                    {
                      title: 'Total Applications',
                      key: 'appsCount',
                      render: (_, c) => (
                        <Badge
                          count={c.applications?.length || 0}
                          showZero
                          style={{ backgroundColor: '#52c41a' }}
                        />
                      ),
                    },
                    {
                      title: 'Profile Created',
                      dataIndex: 'createdAt',
                      key: 'createdAt',
                      render: (date) => new Date(date).toLocaleDateString(),
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_, c) => (
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => {
                            setSelectedCandidate(c);
                            setCandidateDrawerOpen(true);
                          }}
                        >
                          View Profile
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },

          // ================= TAB 5: INTERVIEWS =================
          {
            key: 'interviews',
            label: (
              <span>
                <CalendarOutlined />
                Interviews & Evaluations
                {interviewsData?.meta?.total !== undefined && (
                  <Badge
                    count={interviewsData.meta.total}
                    style={{ marginLeft: 8, backgroundColor: '#faad14' }}
                  />
                )}
              </span>
            ),
            children: (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Space>
                    <Select
                      placeholder="Filter by Status..."
                      style={{ width: 180 }}
                      value={interviewStatusFilter}
                      onChange={setInterviewStatusFilter}
                      allowClear
                      options={[
                        { label: 'Scheduled', value: 'SCHEDULED' },
                        { label: 'Completed', value: 'COMPLETED' },
                        { label: 'Cancelled', value: 'CANCELLED' },
                      ]}
                    />
                  </Space>
                  {(isRecruiter || isHeadOfHr) && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setSelectedApplication(null);
                        setScheduleModalOpen(true);
                      }}
                    >
                      Schedule Interview
                    </Button>
                  )}
                </div>

                <Table
                  dataSource={interviewsData?.interviews || []}
                  rowKey="id"
                  loading={isLoadingInterviews}
                  pagination={{
                    current: interviewPage,
                    pageSize: interviewPageSize,
                    total: interviewsData?.meta?.total || 0,
                    showSizeChanger: true,
                    onChange: (p, ps) => {
                      setInterviewPage(p);
                      setInterviewPageSize(ps);
                    },
                  }}
                  columns={[
                    {
                      title: 'Candidate',
                      key: 'candidate',
                      render: (_, iv) => (
                        <Text strong>
                          {iv.application?.candidate?.firstName}{' '}
                          {iv.application?.candidate?.lastName}
                        </Text>
                      ),
                    },
                    {
                      title: 'Role Position',
                      key: 'role',
                      render: (_, iv) => iv.application?.jobPosting?.title,
                    },
                    {
                      title: 'Interviewer',
                      key: 'interviewer',
                      render: (_, iv) =>
                        iv.interviewer?.email || `User #${iv.interviewerId}`,
                    },
                    {
                      title: 'Session Type',
                      dataIndex: 'type',
                      key: 'type',
                      render: (type) => <Tag color="purple">{type}</Tag>,
                    },
                    {
                      title: 'Scheduled Time',
                      dataIndex: 'scheduledAt',
                      key: 'scheduledAt',
                      render: (time) => new Date(time).toLocaleString(),
                    },
                    {
                      title: 'Location / Link',
                      dataIndex: 'location',
                      key: 'location',
                      render: (loc) => loc || 'Remote meeting',
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (st: InterviewStatus) => {
                        const colors: Record<InterviewStatus, string> = {
                          SCHEDULED: 'blue',
                          COMPLETED: 'green',
                          CANCELLED: 'default',
                        };
                        return <Tag color={colors[st]}>{st}</Tag>;
                      },
                    },
                    {
                      title: 'Evaluation',
                      key: 'evaluation',
                      render: (_, iv) =>
                        iv.evaluation ? (
                          <Space>
                            <Tag
                              color={
                                iv.evaluation.score >= 70
                                  ? 'green'
                                  : iv.evaluation.score >= 50
                                    ? 'orange'
                                    : 'red'
                              }
                            >
                              {iv.evaluation.score}/100
                            </Tag>
                            <Text style={{ fontSize: 12 }}>
                              {iv.evaluation.recommendation}
                            </Text>
                          </Space>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Pending
                          </Text>
                        ),
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_, iv) => (
                        <Space size="small">
                          {iv.status === 'SCHEDULED' && (
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => {
                                setSelectedInterviewForEval(iv);
                                setEvalModalOpen(true);
                              }}
                            >
                              Evaluate
                            </Button>
                          )}
                          <Button
                            size="small"
                            onClick={() => {
                              if (iv.application) {
                                setSelectedApplication(iv.application);
                                setApplicationDrawerOpen(true);
                              }
                            }}
                          >
                            App Detail
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Modal & Drawer Mounts */}
      <RequisitionModal
        open={requisitionModalOpen}
        onClose={() => setRequisitionModalOpen(false)}
        onSuccess={() => refetchReqs()}
      />

      <RequisitionDetailDrawer
        open={requisitionDrawerOpen}
        onClose={() => setRequisitionDrawerOpen(false)}
        requisition={selectedRequisition}
        onStatusChangeSuccess={() => refetchReqs()}
      />

      <JobPostingModal
        open={jobPostingModalOpen}
        onClose={() => {
          setJobPostingModalOpen(false);
          setPostingToEdit(null);
        }}
        postingToEdit={postingToEdit}
        onSuccess={() => refetchPostings()}
      />

      <JobPostingDetailDrawer
        open={jobPostingDrawerOpen}
        onClose={() => setJobPostingDrawerOpen(false)}
        posting={selectedPosting}
        onEdit={(p) => {
          setPostingToEdit(p);
          setJobPostingModalOpen(true);
        }}
        onStatusChangeSuccess={() => refetchPostings()}
      />

      <CandidateModal
        open={candidateModalOpen}
        onClose={() => setCandidateModalOpen(false)}
        onSuccess={() => refetchCandidates()}
      />

      <CandidateDetailDrawer
        open={candidateDrawerOpen}
        onClose={() => setCandidateDrawerOpen(false)}
        candidate={selectedCandidate}
        onSelectApplication={(appId) => {
          const app = appsData?.applications.find((a) => a.id === appId);
          if (app) {
            setSelectedApplication(app);
            setApplicationDrawerOpen(true);
          }
        }}
      />

      <ApplicationModal
        open={applicationModalOpen}
        onClose={() => setApplicationModalOpen(false)}
        preselectedPostingId={preselectedPostingId}
        onSuccess={() => {
          refetchApps();
          refetchCandidates();
        }}
      />

      <ApplicationStatusModal
        open={applicationStatusModalOpen}
        onClose={() => setApplicationStatusModalOpen(false)}
        application={selectedApplication}
        onSuccess={() => refetchApps()}
      />

      <ApplicationDetailDrawer
        open={applicationDrawerOpen}
        onClose={() => setApplicationDrawerOpen(false)}
        application={selectedApplication}
        onSuccess={() => {
          refetchApps();
          refetchInterviews();
        }}
      />

      <InterviewScheduleModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        preselectedApplication={selectedApplication}
        onSuccess={() => {
          refetchApps();
          refetchInterviews();
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
          refetchApps();
          refetchInterviews();
        }}
      />
    </div>
  );
};
export default RecruitmentPage;
