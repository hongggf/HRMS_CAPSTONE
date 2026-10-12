import React, { useState } from 'react';
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
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { positionApi, departmentApi } from '../../api/organization';
import {
  Position,
  PositionStatus,
  CreatePositionInput,
  UpdatePositionInput,
  EmploymentType,
} from '../../types/organization';
import { PositionModal } from './PositionModal';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

const { Text } = Typography;

export const PositionTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isHeadOfHr = user?.roles?.includes('HEAD_OF_HR');

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [departmentFilter, setDepartmentFilter] = useState<number | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<PositionStatus | undefined>(
    undefined,
  );
  const [searchText, setSearchText] = useState<string>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  // Departments for filter dropdown
  const { data: deptData } = useQuery({
    queryKey: ['active-departments-filter'],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  // Positions query
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['positions', page, pageSize, departmentFilter, statusFilter],
    queryFn: () =>
      positionApi.list({
        page,
        limit: pageSize,
        departmentId: departmentFilter,
        status: statusFilter,
      }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (values: CreatePositionInput) => positionApi.create(values),
    onSuccess: () => {
      message.success('Position created successfully');
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsModalOpen(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: UpdatePositionInput }) =>
      positionApi.update(id, values),
    onSuccess: () => {
      message.success('Position updated successfully');
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      setIsModalOpen(false);
      setEditingPosition(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => positionApi.delete(id),
    onSuccess: () => {
      message.success('Position deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      message.error(normalized.message);
    },
  });

  const handleOpenCreate = () => {
    setEditingPosition(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pos: Position) => {
    setEditingPosition(pos);
    setIsModalOpen(true);
  };

  const handleSubmitModal = async (
    values: CreatePositionInput | UpdatePositionInput,
  ) => {
    if (editingPosition) {
      await updateMutation.mutateAsync({
        id: editingPosition.id,
        values: values as UpdatePositionInput,
      });
    } else {
      await createMutation.mutateAsync(values as CreatePositionInput);
    }
  };

  const positionsList = data?.positions || [];
  const filteredPositions = positionsList.filter((pos) => {
    if (!searchText) return true;
    const term = searchText.toLowerCase();
    return (
      pos.title.toLowerCase().includes(term) ||
      pos.code.toLowerCase().includes(term) ||
      (pos.department?.name && pos.department.name.toLowerCase().includes(term))
    );
  });

  const formatEmploymentType = (type: EmploymentType) => {
    switch (type) {
      case 'FULL_TIME':
        return <Tag color="blue">Full Time</Tag>;
      case 'PART_TIME':
        return <Tag color="purple">Part Time</Tag>;
      case 'CONTRACT':
        return <Tag color="orange">Contract</Tag>;
      case 'INTERNSHIP':
        return <Tag color="cyan">Internship</Tag>;
      default:
        return <Tag>{type}</Tag>;
    }
  };

  const formatSalaryRange = (min?: number | null, max?: number | null) => {
    if (!min && !max) return <Text type="secondary">Not specified</Text>;
    const fmt = (n: number) =>
      `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    if (max) return `Up to ${fmt(max)}`;
    return '-';
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => <Tag color="purple">{code}</Tag>,
      sorter: (a: Position, b: Position) => a.code.localeCompare(b.code),
    },
    {
      title: 'Position Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Position) => (
        <div>
          <Text strong>{title}</Text>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      ),
      sorter: (a: Position, b: Position) => a.title.localeCompare(b.title),
    },
    {
      title: 'Department',
      dataIndex: ['department', 'name'],
      key: 'department',
      render: (_: unknown, record: Position) => (
        <Space size="small">
          <BankOutlined style={{ color: '#1677ff' }} />
          <span>{record.department?.name || `ID #${record.departmentId}`}</span>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'employmentType',
      key: 'employmentType',
      width: 120,
      render: (type: EmploymentType) => formatEmploymentType(type),
    },
    {
      title: 'Salary Range',
      key: 'salary',
      render: (_: unknown, record: Position) =>
        formatSalaryRange(record.salaryMin, record.salaryMax),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: PositionStatus) => {
        let color = 'default';
        if (status === 'OPEN') color = 'success';
        if (status === 'FROZEN') color = 'warning';
        if (status === 'CLOSED') color = 'error';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: Position) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            Edit
          </Button>
          {isHeadOfHr ? (
            <Popconfirm
              title="Delete Position"
              description={
                <div>
                  <p>
                    Are you sure you want to delete{' '}
                    <strong>{record.title}</strong>?
                  </p>
                  <p style={{ color: '#ff4d4f', fontSize: 12 }}>
                    Backend will reject deletion if workforce requests exist for
                    this position.
                  </p>
                </div>
              }
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{
                danger: true,
                loading: deleteMutation.isPending,
              }}
              onConfirm={() => deleteMutation.mutate(record.id)}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
              >
                Delete
              </Button>
            </Popconfirm>
          ) : (
            <Tooltip title="Deletion requires HEAD_OF_HR privileges">
              <Button size="small" disabled icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card bordered={false}>
      {/* Controls Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Space wrap>
          <Input
            placeholder="Search title, code..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
          <Select
            placeholder="Filter by Department"
            value={departmentFilter}
            onChange={(val) => {
              setDepartmentFilter(val);
              setPage(1);
            }}
            allowClear
            style={{ width: 200 }}
            showSearch
            optionFilterProp="label"
            options={(deptData?.departments || []).map((d) => ({
              label: d.name,
              value: d.id,
            }))}
          />
          <Select
            placeholder="Filter by Status"
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            allowClear
            style={{ width: 140 }}
            options={[
              { label: 'All Statuses', value: undefined },
              { label: 'Open', value: 'OPEN' },
              { label: 'Frozen', value: 'FROZEN' },
              { label: 'Closed', value: 'CLOSED' },
            ]}
          />
          <Button
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            Refresh
          </Button>
        </Space>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreate}
        >
          Add Position
        </Button>
      </div>

      {isError && (
        <Alert
          type="error"
          message="Failed to load positions"
          description={
            (error as Error)?.message || 'An error occurred fetching positions.'
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

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredPositions}
        loading={isLoading || isFetching}
        pagination={{
          current: page,
          pageSize,
          total: data?.meta?.total || filteredPositions.length,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} positions`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <PositionModal
        open={isModalOpen}
        position={editingPosition}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmitModal}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingPosition(null);
        }}
      />
    </Card>
  );
};
