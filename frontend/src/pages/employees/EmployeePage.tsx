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
  Avatar,
  Segmented,
  Badge,
  Dropdown,
  Progress,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
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
  TableOutlined,
  AppstoreOutlined,
  DownloadOutlined,
  UploadOutlined,
  MoreOutlined,
  CopyOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  IdcardOutlined,
  FilterOutlined,
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
import { DocumentUploadModal } from './DocumentUploadModal';
import { useAuthStore } from '../../store/useAuthStore';
import { downloadCsv } from '../../utils/formatters';

const { Title, Text } = Typography;

// Color generator for avatar initials
const getAvatarColor = (name: string): string => {
  const colors = [
    '#1677ff',
    '#52c41a',
    '#722ed1',
    '#13c2c2',
    '#eb2f96',
    '#fa8c16',
    '#faad14',
    '#2f54eb',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getInitials = (firstName?: string, lastName?: string): string => {
  const f = (firstName || '').trim()[0] || '';
  const l = (lastName || '').trim()[0] || '';
  return (f + l).toUpperCase() || 'E';
};

export const EmployeePage: React.FC = () => {
  const { user } = useAuthStore();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const isExecutive =
    userRoles.includes('HEAD_OF_HR') || userRoles.includes('HR_ADMIN');

  // View mode: Table vs Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filter states
  const [filters, setFilters] = useState<EmployeeFilterQuery>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null,
  );

  const [updatePosModalOpen, setUpdatePosModalOpen] = useState<boolean>(false);
  const [positionTargetEmp, setPositionTargetEmp] = useState<Employee | null>(
    null,
  );

  const [uploadDocModalOpen, setUploadDocModalOpen] = useState<boolean>(false);
  const [uploadTargetEmp, setUploadTargetEmp] = useState<Employee | null>(null);

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
      if (
        filters.onboardingStatus &&
        emp.onboardingStatus !== filters.onboardingStatus
      ) {
        return false;
      }

      // 5. Employment Type filter
      if (
        filters.employmentType &&
        emp.employmentType !== filters.employmentType
      ) {
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

  const activePercent =
    totalEmployees > 0 ? Math.round((activeCount / totalEmployees) * 100) : 0;

  const handleClearFilters = () => {
    setFilters({});
    setSelectedRowKeys([]);
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

  const getEmploymentTypeColor = (type?: string): string => {
    switch (type) {
      case 'FULL_TIME':
        return 'geekblue';
      case 'PART_TIME':
        return 'purple';
      case 'CONTRACT':
        return 'orange';
      default:
        return 'cyan';
    }
  };

  // CSV Export handler
  const handleExportCsv = (selectedOnly = false) => {
    const dataset =
      selectedOnly && selectedRowKeys.length > 0
        ? filteredEmployees.filter((e) => selectedRowKeys.includes(e.id))
        : filteredEmployees;

    if (dataset.length === 0) {
      message.warning('No employee records available to export.');
      return;
    }

    const headers = [
      'Employee ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Department',
      'Position',
      'Employment Type',
      'Status',
      'Onboarding Status',
      'Hire Date',
    ];

    const rows = dataset.map((e) => [
      e.employeeId,
      e.firstName,
      e.lastName,
      e.email,
      e.phone || '',
      e.department?.name || `Dept #${e.departmentId}`,
      e.position?.title || `Position #${e.positionId}`,
      e.employmentType || 'FULL_TIME',
      e.status,
      e.onboardingStatus,
      e.hireDate ? new Date(e.hireDate).toISOString().split('T')[0] : '',
    ]);

    downloadCsv(
      `HRMS_Employee_Directory_${new Date().toISOString().split('T')[0]}`,
      headers,
      rows,
    );
    message.success(
      `Exported ${dataset.length} employee record${dataset.length === 1 ? '' : 's'} to CSV`,
    );
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Copied ${label} to clipboard`);
  };

  // Row actions menu items generator
  const getActionMenuItems = (record: Employee): MenuProps['items'] => [
    {
      key: 'copy-id',
      icon: <CopyOutlined />,
      label: 'Copy Employee ID',
      onClick: () => handleCopy(record.employeeId, 'Employee ID'),
    },
    {
      key: 'copy-email',
      icon: <MailOutlined />,
      label: 'Copy Email',
      onClick: () => handleCopy(record.email, 'Email address'),
    },
    ...(isExecutive
      ? [
          {
            type: 'divider' as const,
          },
          {
            key: 'update-pos',
            icon: <ApartmentOutlined />,
            label: 'Change Position / Transfer',
            onClick: () => {
              setPositionTargetEmp(record);
              setUpdatePosModalOpen(true);
            },
          },
          {
            key: 'upload-doc',
            icon: <UploadOutlined />,
            label: 'Upload Document',
            onClick: () => {
              setUploadTargetEmp(record);
              setUploadDocModalOpen(true);
            },
          },
        ]
      : []),
  ];

  // Table Columns
  const columns: ColumnsType<Employee> = [
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 130,
      render: (id: string, record) => (
        <Button
          type="link"
          style={{
            padding: 0,
            fontWeight: 600,
            fontFamily: 'monospace',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
          }}
          icon={<IdcardOutlined style={{ fontSize: 13, marginRight: 2 }} />}
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
      width: 250,
      render: (_, r) => {
        const initials = getInitials(r.firstName, r.lastName);
        const avatarBg = getAvatarColor(`${r.firstName} ${r.lastName}`);
        return (
          <Space size="middle" align="center" style={{ whiteSpace: 'nowrap' }}>
            <Avatar
              style={{
                backgroundColor: avatarBg,
                verticalAlign: 'middle',
                fontWeight: 600,
                fontSize: 12,
                flexShrink: 0,
              }}
              size={36}
            >
              {initials}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Text strong style={{ fontSize: 14, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                {r.firstName} {r.lastName}
              </Text>
              <Text
                type="secondary"
                style={{ fontSize: 12, marginTop: 2, lineHeight: 1.2, whiteSpace: 'nowrap' }}
              >
                {r.email}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Department',
      key: 'department',
      width: 160,
      render: (_, r) => (
        <Tag
          icon={<ApartmentOutlined />}
          style={{
            borderRadius: 12,
            padding: '2px 10px',
            fontSize: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap',
          }}
        >
          {r.department?.name || `Dept #${r.departmentId}`}
        </Tag>
      ),
    },
    {
      title: 'Position Title',
      key: 'position',
      width: 180,
      render: (_, r) => (
        <div style={{ whiteSpace: 'nowrap' }}>
          <Text strong style={{ display: 'block', whiteSpace: 'nowrap' }}>
            {r.position?.title || `Position #${r.positionId}`}
          </Text>
          {r.position?.code && (
            <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
              {r.position.code}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'employmentType',
      key: 'employmentType',
      width: 120,
      render: (t) => (
        <Tag
          color={getEmploymentTypeColor(t)}
          style={{ borderRadius: 10, padding: '1px 8px', fontWeight: 500, whiteSpace: 'nowrap' }}
        >
          {t || 'FULL_TIME'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (s: EmployeeStatus) => {
        let badgeStatus: 'success' | 'warning' | 'default' | 'error' =
          'default';
        if (s === 'ACTIVE') badgeStatus = 'success';
        else if (s === 'PENDING_ONBOARDING') badgeStatus = 'warning';
        else if (s === 'TERMINATED') badgeStatus = 'error';

        return (
          <Tag
            color={getStatusColor(s)}
            style={{
              borderRadius: 12,
              padding: '2px 10px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <Badge status={badgeStatus} style={{ marginRight: 6 }} />
            {s}
          </Tag>
        );
      },
    },
    {
      title: 'Onboarding Phase',
      dataIndex: 'onboardingStatus',
      key: 'onboardingStatus',
      width: 170,
      render: (s: OnboardingStatus) => (
        <Tag
          color={getOnboardingColor(s)}
          style={{
            borderRadius: 12,
            padding: '2px 10px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {s}
        </Tag>
      ),
    },
    {
      title: 'Hire Date',
      dataIndex: 'hireDate',
      key: 'hireDate',
      width: 130,
      render: (d) =>
        d ? (
          <span style={{ fontSize: 13, color: '#595959', whiteSpace: 'nowrap' }}>
            <CalendarOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
            {new Date(d).toLocaleDateString()}
          </span>
        ) : (
          <span style={{ color: '#bfbfbf', whiteSpace: 'nowrap' }}>—</span>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
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
                aria-label="Update Position / Transfer"
                onClick={() => {
                  setPositionTargetEmp(record);
                  setUpdatePosModalOpen(true);
                }}
              />
            </Tooltip>
          )}

          <Dropdown
            menu={{ items: getActionMenuItems(record) }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.departmentId ||
    filters.status ||
    filters.onboardingStatus ||
    filters.employmentType,
  );

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* 1. Header Bar with Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
            Employee Directory & Workforce Management
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Personnel records, lifecycle status, documents, and placement
            history
          </Text>
        </div>

        <Space wrap>
          {/* View mode toggle */}
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as 'table' | 'cards')}
            options={[
              {
                value: 'table',
                label: 'Table',
                icon: <TableOutlined />,
              },
              {
                value: 'cards',
                label: 'Cards',
                icon: <AppstoreOutlined />,
              },
            ]}
          />

          {/* Export CSV button */}
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleExportCsv(false)}
            disabled={filteredEmployees.length === 0}
          >
            Export Directory
          </Button>

          {/* Refresh button */}
          <Button
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            Refresh
          </Button>

          {/* Onboard New Employee button (executive only) */}
          {isExecutive && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setCreateModalOpen(true)}
              style={{
                boxShadow: '0 2px 4px rgba(22, 119, 255, 0.2)',
              }}
            >
              Onboard New Employee
            </Button>
          )}
        </Space>
      </div>

      {/* 2. Interactive KPI Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Total Headcount */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered
            hoverable
            style={{
              borderRadius: 8,
              cursor: 'pointer',
              border:
                filters.status === undefined ? '1px solid #1677ff' : undefined,
              transition: 'all 0.3s ease',
            }}
            onClick={() =>
              setFilters((prev) => ({ ...prev, status: undefined }))
            }
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <Statistic
                  title="Total Headcount"
                  value={totalEmployees}
                  prefix={
                    <TeamOutlined
                      style={{ color: '#1677ff', marginRight: 8 }}
                    />
                  }
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Registered employee records
                </Text>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(22, 119, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: '#1677ff',
                }}
              >
                <TeamOutlined />
              </div>
            </div>
          </Card>
        </Col>

        {/* Active Workforce */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered
            hoverable
            style={{
              borderRadius: 8,
              cursor: 'pointer',
              border:
                filters.status === 'ACTIVE' ? '1px solid #52c41a' : undefined,
              transition: 'all 0.3s ease',
            }}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                status: prev.status === 'ACTIVE' ? undefined : 'ACTIVE',
              }))
            }
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <Statistic
                  title="Active Workforce"
                  value={activeCount}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined style={{ marginRight: 8 }} />}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 2,
                  }}
                >
                  <Progress
                    percent={activePercent}
                    size="small"
                    strokeColor="#52c41a"
                    showInfo={false}
                    style={{ width: 80, margin: 0 }}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {activePercent}% of staff
                  </Text>
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(82, 196, 26, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: '#52c41a',
                }}
              >
                <CheckCircleOutlined />
              </div>
            </div>
          </Card>
        </Col>

        {/* In Onboarding */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered
            hoverable
            style={{
              borderRadius: 8,
              cursor: 'pointer',
              border:
                filters.status === 'PENDING_ONBOARDING'
                  ? '1px solid #faad14'
                  : undefined,
              transition: 'all 0.3s ease',
            }}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                status:
                  prev.status === 'PENDING_ONBOARDING'
                    ? undefined
                    : 'PENDING_ONBOARDING',
              }))
            }
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <Statistic
                  title="In Onboarding"
                  value={onboardingCount}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<ClockCircleOutlined style={{ marginRight: 8 }} />}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Pending document or review
                </Text>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(250, 173, 20, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: '#faad14',
                }}
              >
                <ClockCircleOutlined />
              </div>
            </div>
          </Card>
        </Col>

        {/* Inactive / Terminated */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered
            hoverable
            style={{
              borderRadius: 8,
              cursor: 'pointer',
              border:
                filters.status === 'INACTIVE' ? '1px solid #8c8c8c' : undefined,
              transition: 'all 0.3s ease',
            }}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                status: prev.status === 'INACTIVE' ? undefined : 'INACTIVE',
              }))
            }
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <Statistic
                  title="Inactive / Terminated"
                  value={inactiveCount}
                  valueStyle={{ color: '#8c8c8c' }}
                  prefix={<StopOutlined style={{ marginRight: 8 }} />}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Former or suspended staff
                </Text>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: '#8c8c8c',
                }}
              >
                <StopOutlined />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. Filter and Table Container */}
      <Card
        bordered
        style={{
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
        bodyStyle={{ padding: 20 }}
      >
        {/* Filter Controls Row */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            {/* Search Input */}
            <Col xs={24} sm={12} md={7} lg={7}>
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

            {/* Department Select */}
            <Col xs={24} sm={12} md={5} lg={4}>
              <Select
                placeholder="Department"
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

            {/* Employment Type Select */}
            <Col xs={24} sm={12} md={4} lg={4}>
              <Select
                placeholder="Type"
                style={{ width: '100%' }}
                allowClear
                value={filters.employmentType}
                onChange={(val) =>
                  setFilters((prev) => ({ ...prev, employmentType: val }))
                }
                options={[
                  { value: 'FULL_TIME', label: 'Full Time' },
                  { value: 'PART_TIME', label: 'Part Time' },
                  { value: 'CONTRACT', label: 'Contract' },
                ]}
              />
            </Col>

            {/* Status Select */}
            <Col xs={24} sm={12} md={4} lg={4}>
              <Select
                placeholder="Status"
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

            {/* Onboarding Phase Select */}
            <Col xs={24} sm={12} md={4} lg={3}>
              <Select
                placeholder="Onboarding"
                style={{ width: '100%' }}
                allowClear
                value={filters.onboardingStatus}
                onChange={(val) =>
                  setFilters((prev) => ({ ...prev, onboardingStatus: val }))
                }
                options={[
                  { value: 'PENDING_ONBOARDING', label: 'Pending' },
                  { value: 'DOCUMENT_COLLECTION', label: 'Doc Collection' },
                  { value: 'PROFILE_COMPLETED', label: 'Profile Ready' },
                  { value: 'ACTIVE', label: 'Active' },
                ]}
              />
            </Col>

            {/* Reset Button */}
            <Col xs={24} sm={12} md={4} lg={2}>
              <Button
                icon={<ClearOutlined />}
                onClick={handleClearFilters}
                block
                disabled={!hasActiveFilters}
              >
                Reset
              </Button>
            </Col>
          </Row>

          {/* Active Filter Tags & Bulk Action Strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 12,
              paddingTop: 8,
              borderTop: '1px solid #f0f0f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              <Text type="secondary" style={{ fontSize: 12, marginRight: 4 }}>
                <FilterOutlined style={{ marginRight: 4 }} />
                Showing {filteredEmployees.length} of {totalEmployees} personnel
              </Text>

              {filters.search && (
                <Tag
                  closable
                  onClose={() =>
                    setFilters((p) => ({ ...p, search: undefined }))
                  }
                  color="blue"
                >
                  Search: "{filters.search}"
                </Tag>
              )}
              {filters.departmentId && (
                <Tag
                  closable
                  onClose={() =>
                    setFilters((p) => ({ ...p, departmentId: undefined }))
                  }
                  color="cyan"
                >
                  Dept:{' '}
                  {deptData?.departments?.find(
                    (d) => d.id === filters.departmentId,
                  )?.name || filters.departmentId}
                </Tag>
              )}
              {filters.status && (
                <Tag
                  closable
                  onClose={() =>
                    setFilters((p) => ({ ...p, status: undefined }))
                  }
                  color="green"
                >
                  Status: {filters.status}
                </Tag>
              )}
              {filters.onboardingStatus && (
                <Tag
                  closable
                  onClose={() =>
                    setFilters((p) => ({ ...p, onboardingStatus: undefined }))
                  }
                  color="orange"
                >
                  Onboarding: {filters.onboardingStatus}
                </Tag>
              )}
              {filters.employmentType && (
                <Tag
                  closable
                  onClose={() =>
                    setFilters((p) => ({ ...p, employmentType: undefined }))
                  }
                  color="purple"
                >
                  Type: {filters.employmentType}
                </Tag>
              )}
            </div>

            {/* Selection banner */}
            {selectedRowKeys.length > 0 && (
              <Space>
                <Tag color="geekblue" style={{ fontSize: 12 }}>
                  {selectedRowKeys.length} selected
                </Tag>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<DownloadOutlined />}
                  onClick={() => handleExportCsv(true)}
                >
                  Export Selected
                </Button>
                <Button size="small" onClick={() => setSelectedRowKeys([])}>
                  Clear Selection
                </Button>
              </Space>
            )}
          </div>
        </div>

        {/* 4. Directory Presentation: Table vs Cards View */}
        {viewMode === 'table' ? (
          <Table
            dataSource={filteredEmployees}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 1400 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} employees`,
            }}
          />
        ) : (
          /* Card / Directory Grid View */
          <div style={{ marginTop: 12 }}>
            <Row gutter={[16, 16]}>
              {filteredEmployees.map((emp) => {
                const initials = getInitials(emp.firstName, emp.lastName);
                const avatarBg = getAvatarColor(
                  `${emp.firstName} ${emp.lastName}`,
                );
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={emp.id}>
                    <Card
                      hoverable
                      bordered
                      style={{
                        borderRadius: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                      }}
                      bodyStyle={{
                        padding: 16,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Top Row: Avatar & Status */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 12,
                        }}
                      >
                        <Avatar
                          size={48}
                          style={{
                            backgroundColor: avatarBg,
                            fontWeight: 700,
                            fontSize: 16,
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Tag
                          color={getStatusColor(emp.status)}
                          style={{ borderRadius: 10, margin: 0 }}
                        >
                          {emp.status}
                        </Tag>
                      </div>

                      {/* Name & Title */}
                      <div style={{ marginBottom: 12 }}>
                        <Button
                          type="link"
                          style={{
                            padding: 0,
                            fontWeight: 700,
                            fontSize: 15,
                            height: 'auto',
                            color: '#1f1f1f',
                          }}
                          onClick={() => {
                            setSelectedEmployeeId(emp.id);
                            setDetailDrawerOpen(true);
                          }}
                        >
                          {emp.firstName} {emp.lastName}
                        </Button>
                        <div
                          style={{
                            fontSize: 13,
                            color: '#595959',
                            fontWeight: 500,
                            marginTop: 2,
                          }}
                        >
                          {emp.position?.title || `Position #${emp.positionId}`}
                        </div>
                        <Text
                          type="secondary"
                          style={{ fontSize: 12, fontFamily: 'monospace' }}
                        >
                          {emp.employeeId}
                        </Text>
                      </div>

                      {/* Info Pills */}
                      <Space
                        direction="vertical"
                        size={6}
                        style={{ width: '100%', marginBottom: 16, flex: 1 }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            color: '#595959',
                          }}
                        >
                          <ApartmentOutlined style={{ color: '#1677ff' }} />
                          <span>
                            {emp.department?.name ||
                              `Dept #${emp.departmentId}`}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            color: '#595959',
                          }}
                        >
                          <MailOutlined style={{ color: '#8c8c8c' }} />
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {emp.email}
                          </span>
                        </div>

                        {emp.phone && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 12,
                              color: '#595959',
                            }}
                          >
                            <PhoneOutlined style={{ color: '#8c8c8c' }} />
                            <span>{emp.phone}</span>
                          </div>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            marginTop: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Tag
                            color={getEmploymentTypeColor(emp.employmentType)}
                            style={{ fontSize: 11, borderRadius: 8 }}
                          >
                            {emp.employmentType || 'FULL_TIME'}
                          </Tag>
                          <Tag
                            color={getOnboardingColor(emp.onboardingStatus)}
                            style={{ fontSize: 11, borderRadius: 8 }}
                          >
                            {emp.onboardingStatus}
                          </Tag>
                        </div>
                      </Space>

                      {/* Card Footer Actions */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: 12,
                          borderTop: '1px solid #f0f0f0',
                        }}
                      >
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          icon={<EyeOutlined />}
                          onClick={() => {
                            setSelectedEmployeeId(emp.id);
                            setDetailDrawerOpen(true);
                          }}
                        >
                          Details
                        </Button>

                        <Space size={4}>
                          {isExecutive && (
                            <Tooltip title="Update Position / Transfer">
                              <Button
                                size="small"
                                icon={<ApartmentOutlined />}
                                aria-label="Update Position / Transfer"
                                onClick={() => {
                                  setPositionTargetEmp(emp);
                                  setUpdatePosModalOpen(true);
                                }}
                              />
                            </Tooltip>
                          )}
                          <Dropdown
                            menu={{ items: getActionMenuItems(emp) }}
                            trigger={['click']}
                            placement="bottomRight"
                          >
                            <Button size="small" icon={<MoreOutlined />} />
                          </Dropdown>
                        </Space>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {filteredEmployees.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#8c8c8c',
                }}
              >
                <TeamOutlined
                  style={{ fontSize: 36, color: '#bfbfbf', marginBottom: 8 }}
                />
                <div>No employee records found matching your filters.</div>
                <Button
                  size="small"
                  style={{ marginTop: 8 }}
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}
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

      {/* Quick Document Upload Modal */}
      {uploadTargetEmp && (
        <DocumentUploadModal
          open={uploadDocModalOpen}
          employeeId={uploadTargetEmp.id}
          employeeName={`${uploadTargetEmp.firstName} ${uploadTargetEmp.lastName}`}
          onClose={() => {
            setUploadDocModalOpen(false);
            setUploadTargetEmp(null);
          }}
          onSuccess={() => {
            setUploadDocModalOpen(false);
            setUploadTargetEmp(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};
