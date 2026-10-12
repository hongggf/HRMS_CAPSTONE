import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Popconfirm,
  message,
  Typography,
  Card,
  Alert,
  Row,
  Col,
  Statistic,
  Tabs,
  Badge,
  DatePicker,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SendOutlined,
  FilterOutlined,
  ClearOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  BellOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TableRowSelection } from 'antd/es/table/interface';
import { tasksApi } from '../../api/tasks';
import { departmentApi } from '../../api/organization';
import {
  UnifiedTask,
  TaskType,
  TaskStatus,
  TaskPriority,
} from '../../types/tasks';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { TaskRejectModal } from './TaskRejectModal';
import { CreateTaskModal } from './CreateTaskModal';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isHeadOfHr = Boolean(user?.roles?.includes('HEAD_OF_HR'));

  // Active Tab: 'PENDING' | 'DRAFT' | 'ALL'
  const [activeTabKey, setActiveTabKey] = useState<string>('PENDING');

  // Filters State
  const [searchText, setSearchText] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<TaskType | 'ALL'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<number | undefined>(
    undefined,
  );
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'ALL'>(
    'ALL',
  );
  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    undefined,
  );
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Selected row keys for bulk operations
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Drawer & Modal states
  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null);

  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [rejectingTask, setRejectingTask] = useState<UnifiedTask | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);

  // Fetch departments for department filter
  const { data: deptData } = useQuery({
    queryKey: ['departments-tasks-filter'],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  // Fetch unified tasks
  const {
    data: allTasks = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['unified-tasks', isHeadOfHr],
    queryFn: () => tasksApi.getUnifiedTasks({ onlyMyTasks: !isHeadOfHr }),
  });

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ['unified-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['workforce-requests'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  };

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (task: UnifiedTask) => tasksApi.approveTask(task),
    onSuccess: () => {
      message.success('Task approved successfully');
      invalidateTasks();
      if (selectedTask) {
        setSelectedTask({ ...selectedTask, status: 'APPROVED' });
      }
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ task, reason }: { task: UnifiedTask; reason: string }) =>
      tasksApi.rejectTask(task, reason),
    onSuccess: (_, { reason }) => {
      message.success('Task rejected');
      invalidateTasks();
      setRejectModalOpen(false);
      setRejectingTask(null);
      if (selectedTask) {
        setSelectedTask({
          ...selectedTask,
          status: 'REJECTED',
          rejectionReason: reason,
        });
      }
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (task: UnifiedTask) => tasksApi.deleteDraftTask(task),
    onSuccess: () => {
      message.success('Draft task deleted successfully');
      invalidateTasks();
      setDetailDrawerOpen(false);
      setSelectedTask(null);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const submitDraftMutation = useMutation({
    mutationFn: (task: UnifiedTask) => tasksApi.submitDraftTask(task),
    onSuccess: () => {
      message.success('Draft submitted for review by Head of HR');
      invalidateTasks();
      if (selectedTask) {
        setSelectedTask({ ...selectedTask, status: 'PENDING_APPROVAL' });
      }
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const followUpMutation = useMutation({
    mutationFn: (task: UnifiedTask) => tasksApi.followUpTask(task),
    onSuccess: (data) => {
      message.success(
        data?.message || 'Follow-up notification sent to Head of HR',
      );
      invalidateTasks();
      if (selectedTask) {
        setSelectedTask({
          ...selectedTask,
          canFollowUp: false,
          lastFollowedUpAt: data?.followedUpAt || new Date().toISOString(),
        });
      }
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const isAnyActionPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    deleteDraftMutation.isPending ||
    submitDraftMutation.isPending ||
    followUpMutation.isPending;

  // Counts for tabs and metrics
  const pendingCount = useMemo(
    () =>
      allTasks.filter(
        (t) => t.status === 'PENDING_APPROVAL' || t.status === 'SUBMITTED',
      ).length,
    [allTasks],
  );
  const draftCount = useMemo(
    () => allTasks.filter((t) => t.status === 'DRAFT').length,
    [allTasks],
  );
  const approvedCount = useMemo(
    () => allTasks.filter((t) => t.status === 'APPROVED').length,
    [allTasks],
  );

  // Filter tasks based on activeTab, search, year, date range, and advanced filters
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      // 1. Tab filter
      if (
        activeTabKey === 'PENDING' &&
        task.status !== 'PENDING_APPROVAL' &&
        task.status !== 'SUBMITTED'
      ) {
        return false;
      }
      if (activeTabKey === 'DRAFT' && task.status !== 'DRAFT') {
        return false;
      }

      // 2. Search keyword
      if (searchText) {
        const term = searchText.toLowerCase();
        const matchesId = task.id.toLowerCase().includes(term);
        const matchesNumber = task.taskNumber?.toLowerCase().includes(term);
        const matchesTitle = task.title.toLowerCase().includes(term);
        const matchesDesc = task.description.toLowerCase().includes(term);
        const matchesReq = task.requesterEmail?.toLowerCase().includes(term);
        const matchesDept = task.departmentName?.toLowerCase().includes(term);
        if (
          !matchesId &&
          !matchesNumber &&
          !matchesTitle &&
          !matchesDesc &&
          !matchesReq &&
          !matchesDept
        ) {
          return false;
        }
      }

      // 3. Task Type filter
      if (typeFilter !== 'ALL' && task.type !== typeFilter) {
        return false;
      }

      // 4. Department filter
      if (departmentFilter && task.departmentId !== departmentFilter) {
        return false;
      }

      // 5. Priority filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
        return false;
      }

      // 6. Year filter
      if (selectedYear) {
        const itemYear = new Date(task.createdAt).getFullYear();
        if (itemYear !== selectedYear) {
          return false;
        }
      }

      // 7. Date range filter
      if (dateRange && dateRange[0] && dateRange[1]) {
        const itemDate = new Date(task.createdAt).getTime();
        const startDate = new Date(dateRange[0]).setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange[1]).setHours(23, 59, 59, 999);
        if (itemDate < startDate || itemDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [
    allTasks,
    activeTabKey,
    searchText,
    typeFilter,
    departmentFilter,
    priorityFilter,
    selectedYear,
    dateRange,
  ]);

  const handleClearFilters = () => {
    setSearchText('');
    setTypeFilter('ALL');
    setDepartmentFilter(undefined);
    setPriorityFilter('ALL');
    setSelectedYear(undefined);
    setDateRange(null);
  };

  const handleOpenDetail = (task: UnifiedTask) => {
    setSelectedTask(task);
    setDetailDrawerOpen(true);
  };

  const handleOpenReject = (task: UnifiedTask) => {
    setRejectingTask(task);
    setRejectModalOpen(true);
  };

  // Bulk actions
  const selectedTasks = useMemo(() => {
    return filteredTasks.filter((t) => selectedRowKeys.includes(t.id));
  }, [filteredTasks, selectedRowKeys]);

  const handleBulkApprove = async () => {
    const pendings = selectedTasks.filter(
      (t) => t.status === 'PENDING_APPROVAL' || t.status === 'SUBMITTED',
    );
    if (pendings.length === 0) {
      message.info('No pending approval tasks in selection');
      return;
    }
    for (const t of pendings) {
      try {
        await tasksApi.approveTask(t);
      } catch {
        // Individual error handled
      }
    }
    message.success(`Approved ${pendings.length} tasks`);
    setSelectedRowKeys([]);
    invalidateTasks();
  };

  const handleBulkDeleteDrafts = async () => {
    const drafts = selectedTasks.filter((t) => t.status === 'DRAFT');
    if (drafts.length === 0) {
      message.info('No draft tasks in selection');
      return;
    }
    for (const t of drafts) {
      try {
        await tasksApi.deleteDraftTask(t);
      } catch {
        // Individual error handled
      }
    }
    message.success(`Deleted ${drafts.length} draft tasks`);
    setSelectedRowKeys([]);
    invalidateTasks();
  };

  const rowSelection: TableRowSelection<UnifiedTask> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  const formatPriorityTag = (p: TaskPriority) => {
    switch (p) {
      case 'HIGH':
        return <Tag color="red">HIGH</Tag>;
      case 'MEDIUM':
        return <Tag color="orange">MED</Tag>;
      case 'LOW':
        return <Tag color="green">LOW</Tag>;
      default:
        return <Tag>{p}</Tag>;
    }
  };

  const formatStatusTag = (s: TaskStatus) => {
    switch (s) {
      case 'PENDING_APPROVAL':
      case 'SUBMITTED':
        return <Tag color="warning">PENDING APPROVAL</Tag>;
      case 'DRAFT':
        return <Tag color="default">DRAFT</Tag>;
      case 'APPROVED':
        return <Tag color="success">APPROVED</Tag>;
      case 'REJECTED':
        return <Tag color="error">REJECTED</Tag>;
      case 'CANCELLED':
        return <Tag color="magenta">CANCELLED</Tag>;
      default:
        return <Tag>{s}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Task ID',
      dataIndex: 'id',
      key: 'id',
      width: 140,
      render: (id: string, record: UnifiedTask) => (
        <div>
          <Text strong>{record.taskNumber || id}</Text>
          <div>
            <Tag color="geekblue" style={{ fontSize: 11 }}>
              {record.typeLabel}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Title & Justification',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: UnifiedTask) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>
            {title}
          </Text>
          {record.description && (
            <div>
              <Text
                type="secondary"
                ellipsis
                style={{ fontSize: 12, maxWidth: 360, display: 'block' }}
              >
                {record.description}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'departmentName',
      key: 'department',
      width: 150,
      render: (dept?: string) => <span>{dept || 'General'}</span>,
    },
    {
      title: 'Requester',
      dataIndex: 'requesterEmail',
      key: 'requester',
      width: 160,
      render: (email?: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {email || 'System'}
        </Text>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (p: TaskPriority) => formatPriorityTag(p),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s: TaskStatus) => formatStatusTag(s),
    },
    {
      title: 'Created Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (d: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(d).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_: unknown, record: UnifiedTask) => {
        const isPending =
          record.status === 'PENDING_APPROVAL' || record.status === 'SUBMITTED';
        const isDraft = record.status === 'DRAFT';

        return (
          <Space size="small" wrap>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenDetail(record)}
            >
              View
            </Button>

            {/* HEAD_OF_HR Approval & Rejection */}
            {isPending && isHeadOfHr && (
              <>
                <Popconfirm
                  title="Approve Task"
                  description="Approve this task request?"
                  okText="Approve"
                  cancelText="Cancel"
                  okButtonProps={{ loading: approveMutation.isPending }}
                  onConfirm={() => approveMutation.mutate(record)}
                >
                  <Button
                    size="small"
                    type="primary"
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    icon={<CheckCircleOutlined />}
                    disabled={isAnyActionPending}
                  >
                    Approve
                  </Button>
                </Popconfirm>

                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleOpenReject(record)}
                  disabled={isAnyActionPending}
                >
                  Reject
                </Button>
              </>
            )}

            {/* Non-HEAD_OF_HR Follow-Up Button */}
            {isPending && !isHeadOfHr && (
              <Popconfirm
                title="Send Follow-Up Reminder"
                description="Send an urgent notification alert to Head of HR to expedite this task review?"
                okText="Send Follow-Up"
                cancelText="Cancel"
                okButtonProps={{ loading: followUpMutation.isPending }}
                onConfirm={() => followUpMutation.mutate(record)}
              >
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<BellOutlined />}
                  loading={followUpMutation.isPending}
                  disabled={isAnyActionPending || record.canFollowUp === false}
                >
                  {record.canFollowUp === false ? 'Followed Up' : 'Follow Up'}
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
                  okButtonProps={{ loading: submitDraftMutation.isPending }}
                  onConfirm={() => submitDraftMutation.mutate(record)}
                >
                  <Button
                    size="small"
                    type="primary"
                    icon={<SendOutlined />}
                    disabled={isAnyActionPending}
                  >
                    Submit
                  </Button>
                </Popconfirm>

                <Popconfirm
                  title="Delete Draft Task"
                  description="Permanently delete this draft?"
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{
                    danger: true,
                    loading: deleteDraftMutation.isPending,
                  }}
                  onConfirm={() => deleteDraftMutation.mutate(record)}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={isAnyActionPending}
                  >
                    Delete
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {/* Header Bar */}
      <div
        style={{
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Space align="center" wrap>
            <Title level={4} style={{ margin: 0 }}>
              {isHeadOfHr
                ? 'Executive Tasks & Approvals Center'
                : 'My Tasks & Workflow Tracker'}
            </Title>
            <Tag color={isHeadOfHr ? 'geekblue' : 'cyan'}>
              {isHeadOfHr
                ? 'Head of HR Desk'
                : user?.roles?.[0] || 'HR Officer'}
            </Tag>
          </Space>
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {isHeadOfHr
                ? 'Unified review workbench for pending approvals, drafts, and requests across organization'
                : 'Track your submitted tasks, draft workflows, and follow up on pending approvals with Head of HR'}
            </Text>
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          New Task Request
        </Button>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered hoverable onClick={() => setActiveTabKey('PENDING')}>
            <Statistic
              title="Pending Approval"
              value={pendingCount}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: pendingCount > 0 ? '#fa8c16' : undefined }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Awaiting executive action
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered hoverable onClick={() => setActiveTabKey('DRAFT')}>
            <Statistic
              title="Draft Tasks"
              value={draftCount}
              prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Unsubmitted drafts
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered hoverable onClick={() => setActiveTabKey('ALL')}>
            <Statistic
              title="Approved Requests"
              value={approvedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Successfully authorized
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered hoverable onClick={() => setActiveTabKey('ALL')}>
            <Statistic
              title={isHeadOfHr ? 'Total System Tasks' : 'My Total Tasks'}
              value={allTasks.length}
              prefix={<CheckSquareOutlined style={{ color: '#722ed1' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {isHeadOfHr ? 'Aggregated task history' : 'All personal tasks'}
            </Text>
          </Card>
        </Col>
      </Row>

      <Card bordered={false}>
        {/* Tabs Bar */}
        <Tabs
          activeKey={activeTabKey}
          onChange={(k) => {
            setActiveTabKey(k);
            setSelectedRowKeys([]);
          }}
          items={[
            {
              key: 'PENDING',
              label: (
                <Space>
                  <span>Pending Approvals</span>
                  <Badge
                    count={pendingCount}
                    overflowCount={99}
                    style={{
                      backgroundColor: pendingCount > 0 ? '#fa8c16' : '#d9d9d9',
                    }}
                  />
                </Space>
              ),
            },
            {
              key: 'DRAFT',
              label: (
                <Space>
                  <span>Draft Tasks</span>
                  <Badge
                    count={draftCount}
                    overflowCount={99}
                    style={{ backgroundColor: '#1677ff' }}
                  />
                </Space>
              ),
            },
            {
              key: 'ALL',
              label: 'All Tasks & History',
            },
          ]}
        />

        {/* Filter Controls Bar */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={8} lg={6}>
              <Input
                placeholder="Search ID, title, requester..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={4}>
              <DatePicker
                picker="year"
                placeholder="Filter by Year"
                style={{ width: '100%' }}
                onChange={(date) => {
                  setSelectedYear(date ? date.year() : undefined);
                }}
              />
            </Col>

            <Col xs={24} sm={12} md={10} lg={6}>
              <RangePicker
                placeholder={['Start Date', 'End Date']}
                style={{ width: '100%' }}
                onChange={(dates, dateStrings) => {
                  if (dates && dateStrings[0] && dateStrings[1]) {
                    setDateRange([dateStrings[0], dateStrings[1]]);
                  } else {
                    setDateRange(null);
                  }
                }}
              />
            </Col>

            <Col xs={24} md={8} lg={8}>
              <Space wrap>
                <Button
                  icon={<FilterOutlined />}
                  type={showAdvanced ? 'primary' : 'default'}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Hide Advanced' : 'Advanced Filters'}
                </Button>

                <Button icon={<ClearOutlined />} onClick={handleClearFilters}>
                  Reset
                </Button>

                <Button
                  icon={<ReloadOutlined spin={isFetching} />}
                  onClick={() => refetch()}
                  loading={isFetching}
                >
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Advanced Filters Expandable Panel */}
          {showAdvanced && (
            <Card
              size="small"
              bordered
              style={{ marginTop: 12, backgroundColor: '#fafafa' }}
            >
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} md={8}>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    Task Module:
                  </Text>
                  <Select
                    style={{ width: '100%' }}
                    value={typeFilter}
                    onChange={(val) => setTypeFilter(val)}
                    options={[
                      { label: 'All Modules', value: 'ALL' },
                      {
                        label: 'Workforce Headcount',
                        value: 'WORKFORCE_REQUEST',
                      },
                      { label: 'Payroll Cycle', value: 'PAYROLL_PERIOD' },
                    ]}
                  />
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    Target Department:
                  </Text>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="All Departments"
                    allowClear
                    value={departmentFilter}
                    onChange={(val) => setDepartmentFilter(val)}
                    showSearch
                    optionFilterProp="label"
                    options={(deptData?.departments || []).map((d) => ({
                      label: `${d.name} (${d.code})`,
                      value: d.id,
                    }))}
                  />
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    Priority Level:
                  </Text>
                  <Select
                    style={{ width: '100%' }}
                    value={priorityFilter}
                    onChange={(val) => setPriorityFilter(val)}
                    options={[
                      { label: 'All Priorities', value: 'ALL' },
                      { label: 'High Priority', value: 'HIGH' },
                      { label: 'Medium Priority', value: 'MEDIUM' },
                      { label: 'Low Priority', value: 'LOW' },
                    ]}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </div>

        {/* Bulk Action Bar if rows are checked */}
        {selectedRowKeys.length > 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <span>
                  Selected <strong>{selectedRowKeys.length}</strong> task
                  {selectedRowKeys.length > 1 ? 's' : ''}
                </span>

                <Space>
                  {isHeadOfHr && activeTabKey === 'PENDING' && (
                    <Popconfirm
                      title="Bulk Approve"
                      description={`Approve all ${selectedRowKeys.length} selected tasks?`}
                      okText="Yes, Approve All"
                      cancelText="Cancel"
                      onConfirm={handleBulkApprove}
                    >
                      <Button
                        size="small"
                        type="primary"
                        style={{
                          background: '#52c41a',
                          borderColor: '#52c41a',
                        }}
                        icon={<CheckCircleOutlined />}
                      >
                        Bulk Approve
                      </Button>
                    </Popconfirm>
                  )}

                  {activeTabKey === 'DRAFT' && (
                    <Popconfirm
                      title="Bulk Delete Drafts"
                      description={`Permanently delete ${selectedRowKeys.length} selected draft tasks?`}
                      okText="Yes, Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                      onConfirm={handleBulkDeleteDrafts}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />}>
                        Bulk Delete Drafts
                      </Button>
                    </Popconfirm>
                  )}

                  <Button size="small" onClick={() => setSelectedRowKeys([])}>
                    Clear Selection
                  </Button>
                </Space>
              </div>
            }
          />
        )}

        {/* Error Alert */}
        {isError && (
          <Alert
            type="error"
            message="Failed to load tasks"
            description={
              (error as Error)?.message || 'An error occurred retrieving tasks.'
            }
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" type="primary" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {/* Tasks Table */}
        <Table
          rowKey="id"
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredTasks}
          loading={isLoading || isFetching}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} tasks`,
          }}
        />

        {/* Task Detail Drawer */}
        <TaskDetailDrawer
          open={detailDrawerOpen}
          task={selectedTask}
          onClose={() => {
            setDetailDrawerOpen(false);
            setSelectedTask(null);
          }}
          onApprove={(t) => approveMutation.mutate(t)}
          onOpenReject={(t) => handleOpenReject(t)}
          onDeleteDraft={(t) => deleteDraftMutation.mutate(t)}
          onSubmitDraft={(t) => submitDraftMutation.mutate(t)}
          onFollowUp={(t) => followUpMutation.mutate(t)}
          isActionPending={isAnyActionPending}
          isHeadOfHr={isHeadOfHr}
        />

        {/* Task Rejection Modal */}
        <TaskRejectModal
          open={rejectModalOpen}
          task={rejectingTask}
          isSubmitting={rejectMutation.isPending}
          onSubmit={async (t, reason) => {
            await rejectMutation.mutateAsync({ task: t, reason });
          }}
          onCancel={() => {
            setRejectModalOpen(false);
            setRejectingTask(null);
          }}
        />

        {/* Create Task Modal */}
        <CreateTaskModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => refetch()}
        />
      </Card>
    </div>
  );
};
