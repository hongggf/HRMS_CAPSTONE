import React, { useState } from 'react';
import {
  Drawer,
  Descriptions,
  Tabs,
  Tag,
  Button,
  Space,
  Table,
  Steps,
  Alert,
  Popconfirm,
  Tooltip,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  message,
} from 'antd';
import {
  UserOutlined,
  UploadOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  LockOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../../api/employee';
import {
  Employee,
  EmployeeStatus,
  OnboardingStatus,
  DOCUMENT_TYPE_LABELS,
} from '../../types/employee';
import { DocumentUploadModal } from './DocumentUploadModal';
import { UpdatePositionModal } from './UpdatePositionModal';
import { useAuthStore } from '../../store/useAuthStore';
import { normalizeApiError } from '../../api/client';

const { Text } = Typography;

interface EmployeeDetailDrawerProps {
  open: boolean;
  employeeId: number | null;
  onClose: () => void;
  onEmployeeUpdated?: () => void;
}

export const EmployeeDetailDrawer: React.FC<EmployeeDetailDrawerProps> = ({
  open,
  employeeId,
  onClose,
  onEmployeeUpdated,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const isExecutive = userRoles.includes('HEAD_OF_HR') || userRoles.includes('HR_ADMIN');

  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [updatePosModalOpen, setUpdatePosModalOpen] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch full employee details including documents, positionHistory, salaryHistory
  const {
    data: employee,
    isLoading,
    refetch,
  } = useQuery<Employee>({
    queryKey: ['employee-detail', employeeId],
    queryFn: () => employeeApi.getById(employeeId!),
    enabled: Boolean(open && employeeId),
  });

  // Mutation: Complete onboarding
  const completeOnboardingMutation = useMutation({
    mutationFn: (id: number) => employeeApi.completeOnboarding(id),
    onSuccess: () => {
      message.success('Onboarding marked as completed');
      setActionError(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      onEmployeeUpdated?.();
    },
    onError: (err: unknown) => {
      const norm = normalizeApiError(err);
      setActionError(norm.message);
    },
  });

  // Mutation: Activate employee
  const activateMutation = useMutation({
    mutationFn: (id: number) => employeeApi.activate(id),
    onSuccess: () => {
      message.success('Employee activated successfully');
      setActionError(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      onEmployeeUpdated?.();
    },
    onError: (err: unknown) => {
      const norm = normalizeApiError(err);
      setActionError(norm.message);
    },
  });

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

  const getOnboardingStepIndex = (status?: OnboardingStatus): number => {
    switch (status) {
      case 'PENDING_ONBOARDING':
        return 0;
      case 'DOCUMENT_COLLECTION':
        return 1;
      case 'PROFILE_COMPLETED':
        return 2;
      case 'ACTIVE':
        return 3;
      default:
        return 0;
    }
  };

  const docCount = employee?.documents?.length || 0;
  const isProfileCompleted = employee?.onboardingStatus === 'PROFILE_COMPLETED';
  const canActivate = docCount > 0 && isProfileCompleted && employee?.status !== 'ACTIVE';

  let activationDisabledReason = '';
  if (employee?.status === 'ACTIVE') {
    activationDisabledReason = 'Employee is already active';
  } else if (docCount === 0) {
    activationDisabledReason = 'Requires at least 1 uploaded document prior to activation';
  } else if (!isProfileCompleted) {
    activationDisabledReason = 'Onboarding must be marked as Profile Completed first';
  }

  const canCompleteOnboarding =
    employee?.onboardingStatus === 'PENDING_ONBOARDING' ||
    employee?.onboardingStatus === 'DOCUMENT_COLLECTION';

  return (
    <>
      <Drawer
        title={
          employee ? (
            <Space align="center">
              <UserOutlined />
              <span>
                {employee.firstName} {employee.lastName}
              </span>
              <Tag color="blue">{employee.employeeId}</Tag>
              <Tag color={getStatusColor(employee.status)}>{employee.status}</Tag>
            </Space>
          ) : (
            'Employee Details'
          )
        }
        width={760}
        open={open}
        onClose={onClose}
        loading={isLoading}
        destroyOnClose
        extra={
          isExecutive &&
          employee && (
            <Space>
              <Button
                icon={<ApartmentOutlined />}
                onClick={() => setUpdatePosModalOpen(true)}
              >
                Update Position
              </Button>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => setUploadModalOpen(true)}
              >
                Attach Document
              </Button>
            </Space>
          )
        }
      >
        {actionError && (
          <Alert
            type="error"
            message="Action Failed"
            description={actionError}
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setActionError(null)}
          />
        )}

        {employee && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Quick KPI summary */}
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Department"
                    value={employee.department?.name || 'Unassigned'}
                    valueStyle={{ fontSize: 15 }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Position"
                    value={employee.position?.title || 'Unassigned'}
                    valueStyle={{ fontSize: 15 }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Documents"
                    value={docCount}
                    prefix={<FileDoneOutlined />}
                    valueStyle={{ fontSize: 15 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Workflow Action Notice if in onboarding */}
            {employee.status !== 'ACTIVE' && isExecutive && (
              <Alert
                type="info"
                showIcon
                message="Onboarding In Progress"
                description={
                  <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                    <Text>
                      Current Phase: <Tag color={getOnboardingColor(employee.onboardingStatus)}>{employee.onboardingStatus}</Tag>
                    </Text>
                    <Space wrap>
                      {canCompleteOnboarding && (
                        <Popconfirm
                          title="Complete Onboarding"
                          description="Mark this employee's onboarding profile as completed and notify Head of HR?"
                          onConfirm={() => completeOnboardingMutation.mutate(employee.id)}
                          okText="Complete"
                        >
                          <Button
                            size="small"
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            loading={completeOnboardingMutation.isPending}
                          >
                            Mark Onboarding Complete
                          </Button>
                        </Popconfirm>
                      )}

                      <Tooltip title={!canActivate ? activationDisabledReason : undefined}>
                        <span>
                          <Popconfirm
                            title="Activate Employee"
                            description="Authorize and officially activate this employee into the organization workforce?"
                            onConfirm={() => activateMutation.mutate(employee.id)}
                            disabled={!canActivate}
                            okText="Activate"
                          >
                            <Button
                              size="small"
                              type="primary"
                              style={{ backgroundColor: canActivate ? '#52c41a' : undefined }}
                              icon={<ThunderboltOutlined />}
                              disabled={!canActivate}
                              loading={activateMutation.isPending}
                            >
                              Activate Employee
                            </Button>
                          </Popconfirm>
                        </span>
                      </Tooltip>
                    </Space>
                  </Space>
                }
              />
            )}

            <Tabs
              defaultActiveKey="overview"
              items={[
                {
                  key: 'overview',
                  label: 'Profile & Contact',
                  children: (
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="Employee ID">
                        <Text strong>{employee.employeeId}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Full Legal Name">
                        {employee.firstName} {employee.lastName}
                      </Descriptions.Item>
                      <Descriptions.Item label="Work Email">
                        {employee.email}
                      </Descriptions.Item>
                      <Descriptions.Item label="Contact Phone">
                        {employee.phone || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Gender">
                        {employee.gender || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Date of Birth">
                        {employee.dateOfBirth
                          ? new Date(employee.dateOfBirth).toLocaleDateString()
                          : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Department">
                        {employee.department?.name || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Position Title">
                        {employee.position?.title || '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Employment Type">
                        <Tag color="cyan">{employee.employmentType}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Hire Date">
                        {employee.hireDate
                          ? new Date(employee.hireDate).toLocaleDateString()
                          : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="System Status">
                        <Tag color={getStatusColor(employee.status)}>
                          {employee.status}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Onboarding Status">
                        <Tag color={getOnboardingColor(employee.onboardingStatus)}>
                          {employee.onboardingStatus}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
                {
                  key: 'onboarding',
                  label: 'Onboarding Lifecycle',
                  children: (
                    <div>
                      <Steps
                        current={getOnboardingStepIndex(employee.onboardingStatus)}
                        size="small"
                        style={{ margin: '16px 0 24px' }}
                        items={[
                          { title: 'Draft Created', description: 'Initial Hire' },
                          { title: 'Documents', description: 'Identity & Contracts' },
                          { title: 'Profile Completed', description: 'Review Ready' },
                          { title: 'Active', description: 'Live Workforce' },
                        ]}
                      />
                      <Alert
                        type="info"
                        message="Onboarding Checklist & Verification Policy"
                        description="Activation requires verified onboarding documentation and executive approval. Employees remain in pending state until all mandatory identity, background, and contract files are secured."
                        showIcon
                      />
                    </div>
                  ),
                },
                {
                  key: 'positions',
                  label: 'Position History',
                  children: (
                    <Table
                      dataSource={employee.positionHistory || []}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      columns={[
                        {
                          title: 'Department',
                          key: 'dept',
                          render: (_, r) => r.department?.name || `Dept #${r.departmentId}`,
                        },
                        {
                          title: 'Position',
                          key: 'pos',
                          render: (_, r) => r.position?.title || `Position #${r.positionId}`,
                        },
                        {
                          title: 'Start Date',
                          dataIndex: 'startDate',
                          key: 'startDate',
                          render: (d) => new Date(d).toLocaleDateString(),
                        },
                        {
                          title: 'End Date',
                          dataIndex: 'endDate',
                          key: 'endDate',
                          render: (d) =>
                            d ? (
                              new Date(d).toLocaleDateString()
                            ) : (
                              <Tag color="green">Current Assignment</Tag>
                            ),
                        },
                        {
                          title: 'Notes',
                          dataIndex: 'notes',
                          key: 'notes',
                          render: (n) => n || 'Position assignment',
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: 'documents',
                  label: `Documents (${docCount})`,
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Secured employee records and compliance files.
                        </Text>
                        {isExecutive && (
                          <Button
                            size="small"
                            type="primary"
                            icon={<UploadOutlined />}
                            onClick={() => setUploadModalOpen(true)}
                          >
                            Upload File
                          </Button>
                        )}
                      </div>

                      <Table
                        dataSource={employee.documents || []}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        columns={[
                          {
                            title: 'Classification',
                            dataIndex: 'documentType',
                            key: 'type',
                            render: (t) => (
                              <Text strong>
                                {DOCUMENT_TYPE_LABELS[t] || t}
                              </Text>
                            ),
                          },
                          {
                            title: 'File Name',
                            dataIndex: 'fileName',
                            key: 'fileName',
                            render: (n) => <code>{n}</code>,
                          },
                          {
                            title: 'Uploaded At',
                            dataIndex: 'uploadedAt',
                            key: 'uploadedAt',
                            render: (d) => new Date(d).toLocaleString(),
                          },
                          {
                            title: 'Status',
                            dataIndex: 'verificationStatus',
                            key: 'status',
                            render: (s) => (
                              <Tag color={s === 'VERIFIED' ? 'green' : 'orange'}>
                                {s || 'PENDING'}
                              </Tag>
                            ),
                          },
                        ]}
                      />
                    </Space>
                  ),
                },
                ...(isExecutive
                  ? [
                      {
                        key: 'compensation',
                        label: 'Compensation (Restricted)',
                        children: (
                          <Space orientation="vertical" style={{ width: '100%' }}>
                            <Alert
                              type="warning"
                              showIcon
                              icon={<LockOutlined />}
                              message="Confidential Executive Ledger"
                              description="Field-level protection enforced. Salary and compensation histories are restricted strictly to HEAD_OF_HR and HR_ADMIN."
                            />

                            <Table
                              dataSource={employee.salaryHistory || []}
                              rowKey="id"
                              size="small"
                              pagination={false}
                              columns={[
                                {
                                  title: 'Base Salary',
                                  dataIndex: 'baseSalary',
                                  key: 'salary',
                                  render: (val, r) => (
                                    <Text strong>
                                      {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: r.currency || 'USD',
                                      }).format(val)}
                                    </Text>
                                  ),
                                },
                                {
                                  title: 'Effective Date',
                                  dataIndex: 'effectiveDate',
                                  key: 'effectiveDate',
                                  render: (d) => new Date(d).toLocaleDateString(),
                                },
                                {
                                  title: 'Status',
                                  dataIndex: 'endDate',
                                  key: 'endDate',
                                  render: (d) =>
                                    d ? (
                                      new Date(d).toLocaleDateString()
                                    ) : (
                                      <Tag color="green">Active Rate</Tag>
                                    ),
                                },
                                {
                                  title: 'Reason',
                                  dataIndex: 'changeReason',
                                  key: 'changeReason',
                                  render: (r) => r || 'Initial Salary',
                                },
                              ]}
                            />
                          </Space>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Space>
        )}
      </Drawer>

      {/* Upload Document Modal */}
      {employee && (
        <DocumentUploadModal
          open={uploadModalOpen}
          employeeId={employee.id}
          employeeName={`${employee.firstName} ${employee.lastName}`}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() => {
            setUploadModalOpen(false);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['employees-list'] });
            onEmployeeUpdated?.();
          }}
        />
      )}

      {/* Update Position Modal */}
      {employee && (
        <UpdatePositionModal
          open={updatePosModalOpen}
          employeeId={employee.id}
          employeeName={`${employee.firstName} ${employee.lastName}`}
          currentDepartmentId={employee.departmentId}
          currentPositionId={employee.positionId}
          onClose={() => setUpdatePosModalOpen(false)}
          onSuccess={() => {
            setUpdatePosModalOpen(false);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['employees-list'] });
            onEmployeeUpdated?.();
          }}
        />
      )}
    </>
  );
};
