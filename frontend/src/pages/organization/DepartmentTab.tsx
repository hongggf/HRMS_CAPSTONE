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
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentApi } from '../../api/organization';
import {
  Department,
  DepartmentStatus,
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from '../../types/organization';
import { DepartmentModal } from './DepartmentModal';
import { normalizeApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

const { Text } = Typography;

export const DepartmentTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isHeadOfHr = user?.roles?.includes('HEAD_OF_HR');

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<
    DepartmentStatus | undefined
  >(undefined);
  const [searchText, setSearchText] = useState<string>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );

  // Fetch departments query
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['departments', page, pageSize, statusFilter],
    queryFn: () =>
      departmentApi.list({
        page,
        limit: pageSize,
        status: statusFilter,
      }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (values: CreateDepartmentInput) => departmentApi.create(values),
    onSuccess: () => {
      message.success('Department created successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsModalOpen(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: UpdateDepartmentInput;
    }) => departmentApi.update(id, values),
    onSuccess: () => {
      message.success('Department updated successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsModalOpen(false);
      setEditingDepartment(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => departmentApi.delete(id),
    onSuccess: () => {
      message.success('Department deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      message.error(normalized.message);
    },
  });

  const handleOpenCreate = () => {
    setEditingDepartment(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setIsModalOpen(true);
  };

  const handleSubmitModal = async (
    values: CreateDepartmentInput | UpdateDepartmentInput,
  ) => {
    if (editingDepartment) {
      await updateMutation.mutateAsync({
        id: editingDepartment.id,
        values: values as UpdateDepartmentInput,
      });
    } else {
      await createMutation.mutateAsync(values as CreateDepartmentInput);
    }
  };

  const departmentsList = data?.departments || [];
  const filteredDepartments = departmentsList.filter((dept) => {
    if (!searchText) return true;
    const term = searchText.toLowerCase();
    return (
      dept.name.toLowerCase().includes(term) ||
      dept.code.toLowerCase().includes(term) ||
      (dept.description && dept.description.toLowerCase().includes(term))
    );
  });

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
      sorter: (a: Department, b: Department) => a.code.localeCompare(b.code),
    },
    {
      title: 'Department Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Department) => (
        <div>
          <Text strong>{name}</Text>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      ),
      sorter: (a: Department, b: Department) => a.name.localeCompare(b.name),
    },
    {
      title: 'Positions',
      key: 'positionsCount',
      width: 120,
      render: (_: unknown, record: Department) => {
        const count = record._count?.positions ?? 0;
        return (
          <Tag color={count > 0 ? 'cyan' : 'default'}>
            {count} {count === 1 ? 'position' : 'positions'}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: DepartmentStatus) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (dateStr: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(dateStr).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: Department) => {
        const posCount = record._count?.positions ?? 0;
        return (
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
                title="Delete Department"
                description={
                  <div>
                    <p>
                      Are you sure you want to delete{' '}
                      <strong>{record.name}</strong>?
                    </p>
                    {posCount > 0 && (
                      <p style={{ color: '#ff4d4f', fontSize: 12 }}>
                        <ExclamationCircleOutlined /> Notice: This department
                        currently has {posCount} position(s). Backend will
                        reject deletion if positions or workforce requests
                        exist.
                      </p>
                    )}
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
        );
      },
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
            placeholder="Search by name or code..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            allowClear
            style={{ width: 150 }}
            options={[
              { label: 'All Statuses', value: undefined },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Inactive', value: 'INACTIVE' },
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
          Add Department
        </Button>
      </div>

      {isError && (
        <Alert
          type="error"
          message="Failed to load departments"
          description={
            (error as Error)?.message ||
            'An error occurred fetching departments.'
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
        dataSource={filteredDepartments}
        loading={isLoading || isFetching}
        pagination={{
          current: page,
          pageSize,
          total: data?.meta?.total || filteredDepartments.length,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} departments`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <DepartmentModal
        open={isModalOpen}
        department={editingDepartment}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmitModal}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingDepartment(null);
        }}
      />
    </Card>
  );
};
