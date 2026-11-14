import React, { useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Popconfirm,
  Tooltip,
  Alert,
} from 'antd';
import {
  UserAddOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../api/user';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminUser, RolePermission } from '../../types/user';
import { CreateUserModal } from './CreateUserModal';
import { AssignRoleModal } from './AssignRoleModal';
import { normalizeApiError } from '../../api/client';

const { Title, Text } = Typography;

const getRoleTagColor = (role: string) => {
  switch (role) {
    case 'HEAD_OF_HR':
      return 'purple';
    case 'HR_ADMIN':
      return 'blue';
    case 'HR_RECRUITMENT':
      return 'cyan';
    case 'HR_ATTENDANCE':
      return 'geekblue';
    case 'HR_PAYROLL':
      return 'green';
    case 'HR_PERFORMANCE':
      return 'gold';
    case 'HR_LND':
      return 'orange';
    default:
      return 'default';
  }
};

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null);
  const [feedbackAlert, setFeedbackAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fetch verified roles from backend
  const { data: roles = [] } = useQuery<RolePermission[]>({
    queryKey: ['roles'],
    queryFn: userApi.listRoles,
    staleTime: 60000,
  });

  // Fetch paginated users
  const {
    data: userData,
    isLoading: usersLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users', page, pageSize],
    queryFn: () => userApi.listUsers(page, pageSize),
    staleTime: 5000,
  });

  const users = userData?.users || [];
  const total = userData?.meta?.total || 0;

  // Activation & Deactivation mutations
  const activateMutation = useMutation({
    mutationFn: userApi.activateUser,
    onSuccess: (res) => {
      setFeedbackAlert({ type: 'success', message: res.message });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      setFeedbackAlert({ type: 'error', message: normalized.message });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: userApi.deactivateUser,
    onSuccess: (res) => {
      setFeedbackAlert({ type: 'success', message: res.message });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      setFeedbackAlert({ type: 'error', message: normalized.message });
    },
  });

  // Calculate statistics and lockout safeguards
  const activeAdminsCount = users.filter(
    (u) => u.isActive && u.roles.includes('HEAD_OF_HR'),
  ).length;

  const totalActive = users.filter((u) => u.isActive).length;
  const totalInactive = users.filter((u) => !u.isActive).length;

  // Client-side filtering on current page slice
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      searchText.trim() === '' ||
      u.email.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.isActive) ||
      (statusFilter === 'INACTIVE' && !u.isActive);
    const matchesRole =
      roleFilter === 'ALL' || u.roles.includes(roleFilter as any);
    return matchesSearch && matchesStatus && matchesRole;
  });

  const canManageUsers = currentUser?.roles.includes('HEAD_OF_HR');

  const columns = [
    {
      title: 'User ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (id: number) => <Text code>#{id}</Text>,
    },
    {
      title: 'Corporate Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string, record: AdminUser) => (
        <Space direction="vertical" size={0}>
          <Text strong>{email}</Text>
          {record.id === currentUser?.id && (
            <Tag
              color="blue"
              style={{
                fontSize: 10,
                lineHeight: '16px',
                padding: '0 4px',
                width: 'fit-content',
              }}
            >
              Your Account
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Assigned Role(s)',
      dataIndex: 'roles',
      key: 'roles',
      render: (userRoles: string[]) => (
        <Space orientation="horizontal" size={[0, 4]} wrap>
          {userRoles.length > 0 ? (
            userRoles.map((role) => (
              <Tag color={getRoleTagColor(role)} key={role}>
                {role}
              </Tag>
            ))
          ) : (
            <Tag color="default">Unassigned</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (isActive: boolean) => (
        <Tag
          icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
          color={isActive ? 'success' : 'error'}
        >
          {isActive ? 'Active' : 'Deactivated'}
        </Tag>
      ),
    },
    {
      title: 'Administrative Actions',
      key: 'actions',
      width: 260,
      render: (_: unknown, record: AdminUser) => {
        const isSelf = record.id === currentUser?.id;
        const isSoleHead =
          record.isActive &&
          record.roles.includes('HEAD_OF_HR') &&
          activeAdminsCount <= 1;

        return (
          <Space size="small">
            {/* Role Assignment */}
            <Button
              size="small"
              icon={<UserSwitchOutlined />}
              onClick={() => setRoleModalUser(record)}
              disabled={!canManageUsers}
            >
              Role
            </Button>

            {/* Toggle Status (Activate / Deactivate) */}
            {record.isActive ? (
              <Tooltip
                title={
                  isSelf
                    ? 'You cannot deactivate your own account'
                    : isSoleHead
                      ? 'Cannot deactivate the last active administrator'
                      : undefined
                }
              >
                <span>
                  <Popconfirm
                    title="Deactivate User Account"
                    description={
                      <div>
                        Are you sure you want to deactivate{' '}
                        <Text strong>{record.email}</Text>?
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Their active session will be immediately invalidated
                          and login blocked.
                        </Text>
                      </div>
                    }
                    onConfirm={() => deactivateMutation.mutate(record.id)}
                    okText="Yes, Deactivate"
                    cancelText="Cancel"
                    okButtonProps={{
                      danger: true,
                      loading: deactivateMutation.isPending,
                    }}
                    disabled={isSelf || isSoleHead || !canManageUsers}
                  >
                    <Button
                      size="small"
                      danger
                      disabled={isSelf || isSoleHead || !canManageUsers}
                    >
                      Deactivate
                    </Button>
                  </Popconfirm>
                </span>
              </Tooltip>
            ) : (
              <Popconfirm
                title="Activate User Account"
                description={`Restore access and enable authentication for ${record.email}?`}
                onConfirm={() => activateMutation.mutate(record.id)}
                okText="Yes, Activate"
                cancelText="Cancel"
                okButtonProps={{ loading: activateMutation.isPending }}
                disabled={!canManageUsers}
              >
                <Button
                  size="small"
                  type="primary"
                  ghost
                  disabled={!canManageUsers}
                >
                  Activate
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Top Header */}
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
            <TeamOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            User Administration
          </Title>
          <Text type="secondary">
            Role-Based Access Control, Identity Directory & Account Security
          </Text>
        </div>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={usersLoading}
          >
            Refresh
          </Button>
          {canManageUsers && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create User
            </Button>
          )}
        </Space>
      </div>

      {feedbackAlert && (
        <Alert
          type={feedbackAlert.type}
          message={feedbackAlert.message}
          closable
          onClose={() => setFeedbackAlert(null)}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Summary KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Accounts"
              value={total}
              prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Active Accounts"
              value={totalActive}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Deactivated Accounts"
              value={totalInactive}
              valueStyle={{ color: totalInactive > 0 ? '#cf1322' : '#8c8c8c' }}
              prefix={<StopOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Active Master Admins"
              value={activeAdminsCount}
              prefix={
                <SafetyCertificateOutlined style={{ color: '#722ed1' }} />
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={10}>
            <Input
              placeholder="Search by corporate email..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={7}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: 'ALL', label: 'All Account Statuses' },
                { value: 'ACTIVE', label: 'Active Accounts Only' },
                { value: 'INACTIVE', label: 'Deactivated Accounts Only' },
              ]}
            />
          </Col>
          <Col xs={12} sm={7}>
            <Select
              style={{ width: '100%' }}
              value={roleFilter}
              onChange={(v) => setRoleFilter(v)}
              options={[
                { value: 'ALL', label: 'All System Roles' },
                ...roles.map((r) => ({
                  value: r.name,
                  label: r.name,
                })),
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      {isError && (
        <Alert
          type="error"
          message="Failed to load user directory"
          description={(error as Error)?.message}
          action={
            <Button size="small" type="primary" onClick={() => refetch()}>
              Retry
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={usersLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* Create User Modal */}
      <CreateUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        roles={roles}
      />

      {/* Assign Role Modal */}
      <AssignRoleModal
        open={!!roleModalUser}
        onClose={() => setRoleModalUser(null)}
        user={roleModalUser}
        roles={roles}
        isLastActiveHeadOfHr={
          roleModalUser?.roles.includes('HEAD_OF_HR') && activeAdminsCount <= 1
            ? true
            : false
        }
      />
    </div>
  );
};
