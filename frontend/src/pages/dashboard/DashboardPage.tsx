import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Button,
  Alert,
  Skeleton,
  Typography,
  Space,
  Tag,
  Empty,
  Progress,
  Segmented,
} from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ReloadOutlined,
  FileDoneOutlined,
  RiseOutlined,
  ReadOutlined,
  ApartmentOutlined,
  FolderOpenOutlined,
  SolutionOutlined,
  ScheduleOutlined,
  StarOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard';
import {
  RoleName,
  DashboardMetrics,
  RecruitmentMetrics,
  EmployeeReportMetrics,
  AttendanceReportMetrics,
  PayrollReportMetrics,
  PerformanceReportMetrics,
  TrainingReportMetrics,
} from '../../types/api';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text } = Typography;

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const userRoles: RoleName[] = Array.isArray(user?.roles) ? user.roles : [];

  // Determine active dashboard view (support multi-role officers)
  const defaultRole: RoleName = userRoles.includes('HEAD_OF_HR')
    ? 'HEAD_OF_HR'
    : userRoles[0] || 'HEAD_OF_HR';
  const [selectedRole, setSelectedRole] = useState<RoleName>(defaultRole);

  const activeRole = userRoles.includes(selectedRole)
    ? selectedRole
    : defaultRole;

  // Query appropriate endpoint strictly according to backend authorization
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-metrics', activeRole],
    queryFn: async () => {
      let result;
      switch (activeRole) {
        case 'HEAD_OF_HR':
          result = await dashboardApi.getHeadOfHrMetrics();
          break;
        case 'HR_RECRUITMENT':
          result = await dashboardApi.getRecruitmentMetrics();
          break;
        case 'HR_ADMIN':
          result = await dashboardApi.getEmployeeMetrics();
          break;
        case 'HR_ATTENDANCE':
          result = await dashboardApi.getAttendanceMetrics();
          break;
        case 'HR_PAYROLL':
          result = await dashboardApi.getPayrollMetrics();
          break;
        case 'HR_PERFORMANCE':
          result = await dashboardApi.getPerformanceMetrics();
          break;
        case 'HR_LND':
          result = await dashboardApi.getTrainingMetrics();
          break;
        default:
          result = await dashboardApi.getHeadOfHrMetrics();
      }
      setLastRefreshed(new Date());
      return result;
    },
    enabled: Boolean(user && userRoles.length > 0),
    staleTime: 30000,
  });

  const getDashboardTitle = (role: RoleName): string => {
    switch (role) {
      case 'HEAD_OF_HR':
        return 'Executive HR Dashboard';
      case 'HR_RECRUITMENT':
        return 'Recruitment & Talent Pipeline Dashboard';
      case 'HR_ADMIN':
        return 'Personnel & Organization Administration Dashboard';
      case 'HR_ATTENDANCE':
        return 'Time, Attendance & Leave Operations Dashboard';
      case 'HR_PAYROLL':
        return 'Payroll Intelligence & Compensation Dashboard';
      case 'HR_PERFORMANCE':
        return 'Performance Appraisals & Goals Dashboard';
      case 'HR_LND':
        return 'Learning & Development Programs Dashboard';
      default:
        return 'HRMS Operations Dashboard';
    }
  };

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
          <Space align="center">
            <Title level={4} style={{ margin: 0 }}>
              {getDashboardTitle(activeRole)}
            </Title>
            <Tag color="geekblue">{activeRole}</Tag>
          </Space>
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Real-time verified metrics &bull; Last updated:{' '}
              {lastRefreshed.toLocaleTimeString()}
            </Text>
          </div>
        </div>

        <Space size="middle">
          {/* Role selector if user possesses multiple roles */}
          {userRoles.length > 1 && (
            <Segmented
              options={userRoles.map((r) => ({
                label: r.replace('HR_', ''),
                value: r,
              }))}
              value={activeRole}
              onChange={(val) => setSelectedRole(val as RoleName)}
            />
          )}

          <Button
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
            loading={isFetching}
            aria-label="Refresh Dashboard Data"
          >
            Refresh Data
          </Button>
        </Space>
      </div>

      {/* Error state */}
      {isError && (
        <Alert
          type="error"
          message="Failed to load dashboard metrics"
          description={
            (error as Error)?.message || 'An unexpected server error occurred.'
          }
          showIcon
          style={{ marginBottom: 20 }}
          action={
            <Button size="small" type="primary" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {/* Loading state skeleton */}
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : data ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* ========================================================
              1. HEAD_OF_HR VIEW
          ======================================================== */}
          {activeRole === 'HEAD_OF_HR' &&
            (() => {
              const d = data as DashboardMetrics;
              const totalPending =
                (d.pendingWorkforceApprovals || 0) +
                (d.pendingRecruitmentApprovals || 0) +
                (d.pendingPayrollApprovals || 0);
              const activePercent =
                d.totalEmployees > 0
                  ? Math.round((d.activeEmployees / d.totalEmployees) * 100)
                  : 0;

              return (
                <>
                  {totalPending > 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      message={
                        <span>
                          Action Required: <strong>{totalPending}</strong>{' '}
                          pending item
                          {totalPending > 1 ? 's' : ''} require executive review
                          and approval.
                        </span>
                      }
                      action={
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => navigate('/tasks')}
                        >
                          Review in Tasks Center
                        </Button>
                      }
                    />
                  )}

                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Total Headcount"
                          value={d.totalEmployees}
                          prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Organization staff
                        </Text>
                      </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Active Workforce"
                          value={d.activeEmployees}
                          valueStyle={{ color: '#52c41a' }}
                          prefix={<CheckCircleOutlined />}
                          suffix={
                            <span style={{ fontSize: 13, color: '#8c8c8c' }}>
                              ({activePercent}%)
                            </span>
                          }
                        />
                        <Progress
                          percent={activePercent}
                          strokeColor="#52c41a"
                          size="small"
                          showInfo={false}
                          style={{ marginTop: 8 }}
                        />
                      </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Inactive / Onboarding"
                          value={d.inactiveEmployees}
                          valueStyle={{ color: '#faad14' }}
                          prefix={<CloseCircleOutlined />}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Probation / Inactive
                        </Text>
                      </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="New Hires (30 Days)"
                          value={d.newHires}
                          valueStyle={{ color: '#722ed1' }}
                          prefix={<UserAddOutlined />}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Recent onboarding additions
                        </Text>
                      </Card>
                    </Col>
                  </Row>

                  <div>
                    <Title level={5} style={{ margin: '0 0 12px' }}>
                      Pending Action Items
                    </Title>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={8}>
                        <Card
                          bordered
                          title={
                            <Space>
                              <ClockCircleOutlined
                                style={{ color: '#fa8c16' }}
                              />
                              <span>Workforce Requests</span>
                            </Space>
                          }
                        >
                          <Statistic
                            value={d.pendingWorkforceApprovals}
                            suffix="awaiting review"
                            valueStyle={{
                              fontSize: 26,
                              color:
                                d.pendingWorkforceApprovals > 0
                                  ? '#fa8c16'
                                  : undefined,
                            }}
                          />
                        </Card>
                      </Col>

                      <Col xs={24} md={8}>
                        <Card
                          bordered
                          title={
                            <Space>
                              <FileDoneOutlined style={{ color: '#13c2c2' }} />
                              <span>Recruitment Requisitions</span>
                            </Space>
                          }
                        >
                          <Statistic
                            value={d.pendingRecruitmentApprovals}
                            suffix="awaiting approval"
                            valueStyle={{
                              fontSize: 26,
                              color:
                                d.pendingRecruitmentApprovals > 0
                                  ? '#13c2c2'
                                  : undefined,
                            }}
                          />
                        </Card>
                      </Col>

                      <Col xs={24} md={8}>
                        <Card
                          bordered
                          title={
                            <Space>
                              <DollarOutlined style={{ color: '#eb2f96' }} />
                              <span>Payroll Approvals</span>
                            </Space>
                          }
                        >
                          <Statistic
                            value={d.pendingPayrollApprovals}
                            suffix="cycles pending lock"
                            valueStyle={{
                              fontSize: 26,
                              color:
                                d.pendingPayrollApprovals > 0
                                  ? '#eb2f96'
                                  : undefined,
                            }}
                          />
                        </Card>
                      </Col>
                    </Row>
                  </div>

                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card
                        title={
                          <Space>
                            <DollarOutlined style={{ color: '#1677ff' }} />
                            <span>Latest Payroll Period</span>
                          </Space>
                        }
                        bordered
                      >
                        <Row gutter={16}>
                          <Col span={12}>
                            <Statistic
                              title="Processed Employees"
                              value={d.payrollSummary.total}
                              suffix="staff"
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title="Total Net Payout"
                              value={formatCurrency(d.payrollSummary.netSalary)}
                              valueStyle={{ color: '#1677ff', fontWeight: 600 }}
                            />
                          </Col>
                        </Row>
                      </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                      <Card
                        title={
                          <Space>
                            <ClockCircleOutlined style={{ color: '#52c41a' }} />
                            <span>Today's Attendance & Leaves</span>
                          </Space>
                        }
                        bordered
                      >
                        <div style={{ marginBottom: 14 }}>
                          <Text
                            strong
                            style={{ display: 'block', marginBottom: 6 }}
                          >
                            Attendance Records Today:
                          </Text>
                          {Object.keys(d.attendanceSummary).length === 0 ? (
                            <Text type="secondary">
                              No attendance punches logged today.
                            </Text>
                          ) : (
                            <Space wrap>
                              {Object.entries(d.attendanceSummary).map(
                                ([status, count]) => (
                                  <Tag color="blue" key={status}>
                                    {status}: {count as number}
                                  </Tag>
                                ),
                              )}
                            </Space>
                          )}
                        </div>

                        <div>
                          <Text
                            strong
                            style={{ display: 'block', marginBottom: 6 }}
                          >
                            Leave Requests:
                          </Text>
                          {Object.keys(d.leaveSummary).length === 0 ? (
                            <Text type="secondary">
                              No pending leave requests.
                            </Text>
                          ) : (
                            <Space wrap>
                              {Object.entries(d.leaveSummary).map(
                                ([status, count]) => (
                                  <Tag color="cyan" key={status}>
                                    {status}: {count as number}
                                  </Tag>
                                ),
                              )}
                            </Space>
                          )}
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </>
              );
            })()}

          {/* ========================================================
              2. HR_RECRUITMENT VIEW
          ======================================================== */}
          {activeRole === 'HR_RECRUITMENT' &&
            (() => {
              const d = data as RecruitmentMetrics;
              return (
                <>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Active Job Vacancies"
                          value={d.vacancies}
                          prefix={
                            <FolderOpenOutlined style={{ color: '#1677ff' }} />
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Candidate Applications"
                          value={d.applications}
                          prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Shortlisted Candidates"
                          value={d.shortlistedCandidates}
                          valueStyle={{ color: '#fa8c16' }}
                          prefix={<CheckCircleOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Interviews Conducted"
                          value={d.interviews}
                          prefix={
                            <ScheduleOutlined style={{ color: '#722ed1' }} />
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Offers Extended"
                          value={d.selectedCandidates}
                          prefix={
                            <SolutionOutlined style={{ color: '#13c2c2' }} />
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Hired Candidates"
                          value={d.hiredCandidates}
                          valueStyle={{ color: '#52c41a' }}
                          prefix={<UserAddOutlined />}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Card title="Applications by Hiring Stage" bordered>
                    {Object.keys(d.applicationsByStatus || {}).length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No active candidates in the recruitment pipeline"
                      />
                    ) : (
                      <Space wrap>
                        {Object.entries(d.applicationsByStatus).map(
                          ([status, count]) => (
                            <Tag
                              color="geekblue"
                              key={status}
                              style={{ padding: '6px 12px', fontSize: 13 }}
                            >
                              {status}: <strong>{count as number}</strong>
                            </Tag>
                          ),
                        )}
                      </Space>
                    )}
                  </Card>

                  {/* Quick Shortcuts */}
                  <Card
                    title="Recruitment Actions & Shortcuts"
                    bordered
                    size="small"
                  >
                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        onClick={() => navigate('/recruitment')}
                      >
                        Go to Recruitment & ATS
                      </Button>
                      <Button
                        icon={<SolutionOutlined />}
                        onClick={() => navigate('/workforce')}
                      >
                        Workforce Headcount Requests
                      </Button>
                    </Space>
                  </Card>
                </>
              );
            })()}

          {/* ========================================================
              3. HR_ADMIN VIEW
          ======================================================== */}
          {activeRole === 'HR_ADMIN' &&
            (() => {
              const d = data as EmployeeReportMetrics;
              return (
                <>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Total Records"
                          value={d.totalEmployees}
                          prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="New Hires (Last 30 Days)"
                          value={d.hiringTrends?.hiredLast30Days || 0}
                          valueStyle={{ color: '#52c41a' }}
                          prefix={<UserAddOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Departments Configured"
                          value={d.departmentDistribution?.length || 0}
                          prefix={
                            <ApartmentOutlined style={{ color: '#722ed1' }} />
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Position Types"
                          value={d.positionDistribution?.length || 0}
                          prefix={
                            <SolutionOutlined style={{ color: '#fa8c16' }} />
                          }
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Card title="Personnel Status Distribution" bordered>
                    {Object.keys(d.statusDistribution || {}).length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No employee distribution data recorded"
                      />
                    ) : (
                      <Space wrap>
                        {Object.entries(d.statusDistribution).map(
                          ([status, count]) => (
                            <Tag
                              color="blue"
                              key={status}
                              style={{ padding: '6px 12px', fontSize: 13 }}
                            >
                              {status}: <strong>{count as number}</strong>
                            </Tag>
                          ),
                        )}
                      </Space>
                    )}
                  </Card>

                  <Card title="Administrative Shortcuts" bordered size="small">
                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        onClick={() => navigate('/employees')}
                      >
                        Employee Directory
                      </Button>
                      <Button
                        icon={<ApartmentOutlined />}
                        onClick={() => navigate('/organization')}
                      >
                        Organization & Departments
                      </Button>
                      <Button
                        icon={<ClockCircleOutlined />}
                        onClick={() => navigate('/audit-logs')}
                      >
                        Audit Trail Logs
                      </Button>
                    </Space>
                  </Card>
                </>
              );
            })()}

          {/* ========================================================
              4. HR_ATTENDANCE VIEW
          ======================================================== */}
          {activeRole === 'HR_ATTENDANCE' &&
            (() => {
              const d = data as AttendanceReportMetrics;
              return (
                <>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Approved Overtime Hours"
                          value={d.totalOvertimeHours || 0}
                          suffix="hrs"
                          prefix={
                            <ClockCircleOutlined style={{ color: '#fa8c16' }} />
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Attendance Categories"
                          value={Object.keys(d.attendance || {}).length}
                          prefix={
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Leave Request Types"
                          value={Object.keys(d.leaves || {}).length}
                          prefix={
                            <ScheduleOutlined style={{ color: '#1677ff' }} />
                          }
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Card title="Today's Attendance Statuses" bordered>
                        {Object.keys(d.attendance || {}).length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No attendance records logged today"
                          />
                        ) : (
                          <Space wrap>
                            {Object.entries(d.attendance).map(
                              ([status, count]) => (
                                <Tag
                                  color="blue"
                                  key={status}
                                  style={{ padding: '6px 12px' }}
                                >
                                  {status}: <strong>{count as number}</strong>
                                </Tag>
                              ),
                            )}
                          </Space>
                        )}
                      </Card>
                    </Col>

                    <Col xs={24} md={12}>
                      <Card title="Leave Requests Status" bordered>
                        {Object.keys(d.leaves || {}).length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No pending leave requests"
                          />
                        ) : (
                          <Space wrap>
                            {Object.entries(d.leaves).map(([status, count]) => (
                              <Tag
                                color="cyan"
                                key={status}
                                style={{ padding: '6px 12px' }}
                              >
                                {status}: <strong>{count as number}</strong>
                              </Tag>
                            ))}
                          </Space>
                        )}
                      </Card>
                    </Col>
                  </Row>

                  <Card title="Attendance Shortcuts" bordered size="small">
                    <Button
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      onClick={() => navigate('/attendance')}
                    >
                      Manage Attendance & Shifts
                    </Button>
                  </Card>
                </>
              );
            })()}

          {/* ========================================================
              5. HR_PAYROLL VIEW
          ======================================================== */}
          {activeRole === 'HR_PAYROLL' &&
            (() => {
              const d = data as PayrollReportMetrics;
              return (
                <>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Processed Pay Runs"
                          value={d.totalPayrollsProcessed || 0}
                          prefix={
                            <FileDoneOutlined style={{ color: '#1677ff' }} />
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Total Net Payout"
                          value={formatCurrency(d.totals?.netSalary)}
                          valueStyle={{ color: '#1677ff', fontWeight: 600 }}
                          prefix={<DollarOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Gross Salary"
                          value={formatCurrency(d.totals?.grossSalary)}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Total Deductions"
                          value={formatCurrency(d.totals?.deductions)}
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Card title="Payroll Breakdown Summary" bordered>
                    <Row gutter={16}>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Base Salaries"
                          value={formatCurrency(d.totals?.basicSalary)}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Allowances"
                          value={formatCurrency(d.totals?.allowances)}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Overtime Pay"
                          value={formatCurrency(d.totals?.overtime)}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Statistic
                          title="Deductions"
                          value={formatCurrency(d.totals?.deductions)}
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Col>
                    </Row>
                  </Card>

                  <Card title="Payroll Shortcuts" bordered size="small">
                    <Button
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      onClick={() => navigate('/payroll')}
                    >
                      Open Payroll Processing
                    </Button>
                  </Card>
                </>
              );
            })()}

          {/* ========================================================
              6. HR_PERFORMANCE VIEW
          ======================================================== */}
          {activeRole === 'HR_PERFORMANCE' &&
            (() => {
              const d = data as PerformanceReportMetrics;
              return (
                <>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Average Appraisal Score"
                          value={(d.averageScore || 0).toFixed(1)}
                          suffix="/ 5.0"
                          valueStyle={{ color: '#722ed1', fontWeight: 600 }}
                          prefix={<StarOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Active PIP Plans"
                          value={d.employeesOnImprovementPlan || 0}
                          valueStyle={{
                            color:
                              (d.employeesOnImprovementPlan || 0) > 0
                                ? '#faad14'
                                : undefined,
                          }}
                          prefix={<RiseOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Review Cycles Tracked"
                          value={Object.keys(d.reviewStatus || {}).length}
                          prefix={
                            <CheckCircleOutlined style={{ color: '#1677ff' }} />
                          }
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Card title="Appraisals by Review Status" bordered>
                    {Object.keys(d.reviewStatus || {}).length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No performance reviews recorded"
                      />
                    ) : (
                      <Space wrap>
                        {Object.entries(d.reviewStatus).map(
                          ([status, count]) => (
                            <Tag
                              color="purple"
                              key={status}
                              style={{ padding: '6px 12px' }}
                            >
                              {status}: <strong>{count as number}</strong>
                            </Tag>
                          ),
                        )}
                      </Space>
                    )}
                  </Card>

                  <Card title="Performance Shortcuts" bordered size="small">
                    <Button
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      onClick={() => navigate('/performance')}
                    >
                      Manage Performance & PIP
                    </Button>
                  </Card>
                </>
              );
            })()}

          {/* ========================================================
              7. HR_LND VIEW
          ======================================================== */}
          {activeRole === 'HR_LND' &&
            (() => {
              const d = data as TrainingReportMetrics;
              return (
                <>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Total Enrollments"
                          value={d.totalParticipation || 0}
                          prefix={<ReadOutlined style={{ color: '#1677ff' }} />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Average Course Rating"
                          value={(d.averageEvaluationRating || 0).toFixed(1)}
                          suffix="/ 5.0"
                          valueStyle={{ color: '#fa8c16', fontWeight: 600 }}
                          prefix={<StarOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <Card bordered hoverable>
                        <Statistic
                          title="Training Program Statuses"
                          value={Object.keys(d.completionStatus || {}).length}
                          prefix={
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          }
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Card title="Training Programs by Status" bordered>
                    {Object.keys(d.completionStatus || {}).length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No training courses in progress"
                      />
                    ) : (
                      <Space wrap>
                        {Object.entries(d.completionStatus).map(
                          ([status, count]) => (
                            <Tag
                              color="geekblue"
                              key={status}
                              style={{ padding: '6px 12px' }}
                            >
                              {status}: <strong>{count as number}</strong>
                            </Tag>
                          ),
                        )}
                      </Space>
                    )}
                  </Card>

                  <Card title="L&D Shortcuts" bordered size="small">
                    <Button
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      onClick={() => navigate('/lnd')}
                    >
                      Open Learning & Development
                    </Button>
                  </Card>
                </>
              );
            })()}
        </Space>
      ) : (
        <Empty description="No metrics available for the current role." />
      )}
    </div>
  );
};
