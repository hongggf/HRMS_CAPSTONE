import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Typography,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  UserAddOutlined,
  ReloadOutlined,
  ClearOutlined,
  ApartmentOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { employeeApi } from '../../api/employee';
import { departmentApi } from '../../api/organization';
import {
  Employee,
  EmployeeStatus,
  OnboardingStatus,
  EmployeeFilterQuery,
} from '../../types/employee';
import { CreateEmployeeModal } from './CreateEmployeeModal';
import { EmployeeDetailDrawer } from './EmployeeDetailDrawer';
import { UpdatePositionModal } from './UpdatePositionModal';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text } = Typography;

export const EmployeePage: React.FC = () => {
  const { user } = useAuthStore();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const isExecutive = userRoles.includes('HEAD_OF_HR') || userRoles.includes('HR_ADMIN');

  // Filter states
  const [filters, setFilters] = useState<EmployeeFilterQuery>({});
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const [updatePosModalOpen, setUpdatePosModalOpen] = useState<boolean>(false);
  const [positionTargetEmp, setPositionTargetEmp] = useState<Employee | null>(null);

  // Fetch employees list
  const {
    data: employees = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<Employee[]>({
    queryKey: ['employees-list'],
    queryFn: () => employeeApi.list(),
  });

  // Fetch departments for filter
  const { data: deptData } = useQuery({
    queryKey: ['departments-filter'],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  // Filtered employee records
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Text Search (Employee ID, First Name, Last Name, Email)
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const empId = (emp.employeeId || '').toLowerCase();
        const email = (emp.email || '').toLowerCase();
        if (!fullName.includes(q) && !empId.includes(q) && !email.includes(q)) {
          return false;
        }
      }

      // 2. Department filter
      if (filters.departmentId && emp.departmentId !== filters.departmentId) {
        return false;
      }

      // 3. Status filter
      if (filters.status && emp.status !== filters.status) {
        return false;
      }

      // 4. Onboarding Status filter
      if (filters.onboardingStatus && emp.onboardingStatus !== filters.onboardingStatus) {
        return false;
      }

      return true;
    });
  }, [employees, filters]);

  // KPI Metrics
  const totalEmployees = employees.length;
  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const onboardingCount = employees.filter(
    (e) => e.status === 'PENDING_ONBOARDING' || e.onboardingStatus !== 'ACTIVE',
  ).length;
  const inactiveCount = employees.filter(
    (e) => e.status === 'INACTIVE' || e.status === 'TERMINATED',
  ).length;

  const handleClearFilters = () => {
    setFilters({});
  };

  const getStatusColor = (status: EmployeeStatus): string => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING_ONBOARDING':
        return 'warning';
      case 'INACTIVE':
        return 'default';
      case 'TERMINATED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getOnboardingColor = (status: OnboardingStatus): string => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'PROFILE_COMPLETED':
        return 'cyan';
      case 'DOCUMENT_COLLECTION':
        return 'blue';
      case 'PENDING_ONBOARDING':
        return 'orange';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<Employee> = [
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 130,
      render: (id: string, record) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 600 }}
          onClick={() => {
            setSelectedEmployeeId(record.id);
            setDetailDrawerOpen(true);
          }}
        >
          {id}
        </Button>
      ),
    },
    {
      title: 'Full Name',
      key: 'name',
      render: (_, r) => (
        <Space>
          <UserOutlined style={{ color: '#8c8c8c' }} />
          <Text strong>
            {r.firstName} {r.lastName}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Department',
      key: 'department',
      render: (_, r) => r.department?.name || `Dept #${r.departmentId}`,
    },
    {
      title: 'Position Title',
      key: 'position',
      render: (_, r) => r.position?.title || `Position #${r.positionId}`,
    },
    {
      title: 'Type',
      dataIndex: 'employmentType',
      key: 'employmentType',
      width: 120,
      render: (t) => <Tag color="cyan">{t || 'FULL_TIME'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s: EmployeeStatus) => (
        <Tag color={getStatusColor(s)}>{s}</Tag>
      ),
    },
    {
      title: 'Onboarding Phase',
      dataIndex: 'onboardingStatus',
      key: 'onboardingStatus',
      width: 160,
      render: (s: OnboardingStatus) => (
        <Tag color={getOnboardingColor(s)}>{s}</Tag>
      ),
    },
    {
      title: 'Hire Date',
      dataIndex: 'hireDate',
      key: 'hireDate',
      width: 120,
      render: (d) => (d ? new Date(d).toLocaleDateString() : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Profile & Documents">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedEmployeeId(record.id);
                setDetailDrawerOpen(true);
              }}
            >
              Details
            </Button>
          </Tooltip>

          {isExecutive && (
            <Tooltip title="Update Position / Transfer">
              <Button
                size="small"
                icon={<ApartmentOutlined />}
                onClick={() => {
                  setPositionTargetEmp(record);
                  setUpdatePosModalOpen(true);
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Employee Directory & Workforce Management
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Personnel records, lifecycle status, documents, and placement history
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

          {isExecutive && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              Onboard New Employee
            </Button>
          )}
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered hoverable>
            <Statistic
              title="Total Headcount"
              value={totalEmployees}
              prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Registered employee records
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered hoverable>
            <Statistic
              title="Active Workforce"
              value={activeCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Operational staff members
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered hoverable>
            <Statistic
              title="In Onboarding"
              value={onboardingCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Pending document or review
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered hoverable>
            <Statistic
              title="Inactive / Terminated"
              value={inactiveCount}
              valueStyle={{ color: '#8c8c8c' }}
              prefix={<StopOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Former or suspended staff
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Filter and Table Container */}
      <Card bordered>
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={8} md={6}>
              <Input
                placeholder="Search by Name, ID, Email..."
                prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
                allowClear
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </Col>

            <Col xs={24} sm={8} md={5}>
              <Select
                placeholder="Filter by Department"
                style={{ width: '100%' }}
                allowClear
                value={filters.departmentId}
                onChange={(val) =>
                  setFilters((prev) => ({ ...prev, departmentId: val }))
                }
                options={(deptData?.departments || []).map((d) => ({
                  value: d.id,
                  label: `${d.name} (${d.code})`,
                }))}
              />
            </Col>

            <Col xs={24} sm={8} md={5}>
              <Select
                placeholder="Filter by Status"
                style={{ width: '100%' }}
                allowClear
                value={filters.status}
                onChange={(val) =>
                  setFilters((prev) => ({ ...prev, status: val }))
                }
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'PENDING_ONBOARDING', label: 'Pending Onboarding' },
                  { value: 'INACTIVE', label: 'Inactive' },
                  { value: 'TERMINATED', label: 'Terminated' },
                ]}
              />
            </Col>

            <Col xs={24} sm={8} md={5}>
              <Select
                placeholder="Filter by Onboarding"
                style={{ width: '100%' }}
                allowClear
                value={filters.onboardingStatus}
                onChange={(val) =>
                  setFilters((prev) => ({ ...prev, onboardingStatus: val }))
                }
                options={[
                  { value: 'PENDING_ONBOARDING', label: 'Pending Onboarding' },
                  { value: 'DOCUMENT_COLLECTION', label: 'Document Collection' },
                  { value: 'PROFILE_COMPLETED', label: 'Profile Completed' },
                  { value: 'ACTIVE', label: 'Active' },
                ]}
              />
            </Col>

            <Col xs={24} sm={8} md={3}>
              <Button
                icon={<ClearOutlined />}
                onClick={handleClearFilters}
                block
              >
                Reset
              </Button>
            </Col>
          </Row>
        </div>

        <Table
          dataSource={filteredEmployees}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} employees`,
          }}
        />
      </Card>

      {/* Create Employee Modal */}
      <CreateEmployeeModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          refetch();
        }}
      />

      {/* Employee Detail Drawer */}
      <EmployeeDetailDrawer
        open={detailDrawerOpen}
        employeeId={selectedEmployeeId}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedEmployeeId(null);
        }}
        onEmployeeUpdated={() => refetch()}
      />

      {/* Quick Update Position Modal from Table Action */}
      {positionTargetEmp && (
        <UpdatePositionModal
          open={updatePosModalOpen}
          employeeId={positionTargetEmp.id}
          employeeName={`${positionTargetEmp.firstName} ${positionTargetEmp.lastName}`}
          currentDepartmentId={positionTargetEmp.departmentId}
          currentPositionId={positionTargetEmp.positionId}
          onClose={() => {
            setUpdatePosModalOpen(false);
            setPositionTargetEmp(null);
          }}
          onSuccess={() => {
            setUpdatePosModalOpen(false);
            setPositionTargetEmp(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};
