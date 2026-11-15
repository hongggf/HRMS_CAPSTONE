import React from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Avatar,
  Space,
  Spin,
  Alert,
  Statistic,
  Button,
  Progress,
  List,
  Empty,
  Badge,
  theme,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  BookOutlined,
  TrophyOutlined,
  BellOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { employeeApi } from '../../api/employee';
import { EmployeeDashboardSummary, EmployeeStatus } from '../../types/employee';

const { Title, Text, Paragraph } = Typography;

export const EmployeeDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const {
    data: dashboard,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<EmployeeDashboardSummary>({
    queryKey: ['employee-dashboard-summary'],
    queryFn: () => employeeApi.getMyDashboard(),
    staleTime: 30000,
  });

  const getStatusColor = (status?: EmployeeStatus): string => {
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

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16, color: '#8c8c8c' }}>
          Loading your personalized employee portal dashboard...
        </Paragraph>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <Alert
        message="Unable to Load Dashboard"
        description={
          (error as any)?.message ||
          'Your user account is not currently linked to an active employee record. Please contact your HR administrator.'
        }
        type="error"
        showIcon
        action={
          <Button size="small" type="primary" onClick={() => refetch()}>
            Retry
          </Button>
        }
        style={{ margin: '40px 0' }}
      />
    );
  }

  const {
    employee,
    latestPayslip,
    leaveBalances,
    trainings,
    performance,
    attendance,
    recentNotifications,
  } = dashboard;

  const positionName =
    typeof employee.position === 'object' && employee.position !== null
      ? (employee.position as any).title || (employee.position as any).name || 'Position'
      : employee.position || 'Position';

  const departmentName =
    typeof employee.department === 'object' && employee.department !== null
      ? (employee.department as any).name || 'Department'
      : employee.department || 'Department';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Welcome Header Banner */}
      <Card
        style={{
          borderRadius: token.borderRadiusLG,
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <Row align="middle" justify="space-between" gutter={[24, 24]}>
          <Col xs={24} md={16}>
            <Space align="start" size="middle">
              <Avatar
                size={80}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: '#1677ff',
                  boxShadow: '0 4px 12px rgba(22, 119, 255, 0.3)',
                  fontSize: 36,
                }}
              />
              <div>
                <Space wrap align="center">
                  <Title level={2} style={{ margin: 0, fontWeight: 600 }}>
                    Welcome back, {employee.firstName} {employee.lastName}!
                  </Title>
                  <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
                    {employee.employeeId}
                  </Tag>
                  <Tag color={getStatusColor(employee.status)}>
                    {employee.status}
                  </Tag>
                </Space>

                <Paragraph style={{ margin: '6px 0 0 0', color: '#595959', fontSize: 15 }}>
                  <ApartmentOutlined style={{ marginRight: 6 }} />
                  {positionName} &bull; {departmentName}
                </Paragraph>

                <Space wrap size="middle" style={{ marginTop: 8, color: '#8c8c8c', fontSize: 13 }}>
                  <span>
                    <MailOutlined style={{ marginRight: 4 }} />
                    {employee.email}
                  </span>
                  {employee.hireDate && (
                    <span>
                      <CalendarOutlined style={{ marginRight: 4 }} />
                      Hired: {new Date(employee.hireDate).toLocaleDateString()}
                    </span>
                  )}
                </Space>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={<ReloadOutlined spin={isFetching} />}
                onClick={() => refetch()}
                loading={isFetching}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => navigate('/employee/payslips')}
              >
                View My Payslips
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 2. Key Metrics Row */}
      <Row gutter={[16, 16]}>
        {/* Latest Net Salary & Payslip Period */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
            title={
              <Space>
                <DollarOutlined style={{ color: '#52c41a' }} />
                <span>Latest Net Pay</span>
              </Space>
            }
            extra={
              latestPayslip ? (
                <Tag color="cyan">{latestPayslip.periodStatus}</Tag>
              ) : null
            }
          >
            {latestPayslip ? (
              <div>
                <Statistic
                  value={latestPayslip.netSalary}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  Period: {latestPayslip.periodName}
                </Text>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No released payslips yet"
                style={{ margin: '8px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* Leave Balance */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
            title={
              <Space>
                <CalendarOutlined style={{ color: '#1677ff' }} />
                <span>Leave Balance</span>
              </Space>
            }
          >
            {leaveBalances && leaveBalances.length > 0 ? (
              <div>
                <Statistic
                  value={leaveBalances[0].remainingDays}
                  suffix={`/ ${leaveBalances[0].totalDays} Days`}
                  valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  {leaveBalances[0].leaveType} ({leaveBalances[0].year})
                </Text>
                <Progress
                  percent={Math.round(
                    ((leaveBalances[0].totalDays - leaveBalances[0].remainingDays) /
                      leaveBalances[0].totalDays) *
                      100,
                  )}
                  size="small"
                  status="active"
                  style={{ marginTop: 8 }}
                />
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No leave balance recorded"
                style={{ margin: '8px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* Attendance Summary */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#fa8c16' }} />
                <span>Monthly Attendance</span>
              </Space>
            }
            extra={
              attendance ? (
                <Tag color={attendance.todayStatus === 'PRESENT' ? 'success' : 'default'}>
                  Today: {attendance.todayStatus}
                </Tag>
              ) : null
            }
          >
            {attendance ? (
              <div>
                <Statistic
                  value={attendance.presentDays}
                  suffix="Days Present"
                  valueStyle={{ color: '#001529', fontWeight: 'bold' }}
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  {attendance.month} &bull; {attendance.totalWorkingHours} Working Hours
                </Text>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No attendance records"
                style={{ margin: '8px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* Performance & Learning Status */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
            title={
              <Space>
                <TrophyOutlined style={{ color: '#722ed1' }} />
                <span>Performance Review</span>
              </Space>
            }
          >
            {performance ? (
              <div>
                <Statistic
                  value={performance.score !== null && performance.score !== undefined ? `${performance.score} / 5` : performance.reviewStatus}
                  valueStyle={{ color: '#722ed1', fontWeight: 'bold', fontSize: 20 }}
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  Cycle: {performance.cycleName || 'Active Cycle'}
                </Text>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No active review cycle"
                style={{ margin: '8px 0' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 3. Middle Section: Assigned Learning & Recent Notifications */}
      <Row gutter={[24, 24]}>
        {/* Assigned Learning Courses */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BookOutlined style={{ color: '#1677ff' }} />
                <span>Assigned Learning & Development</span>
              </Space>
            }
            extra={
              <Button type="link" size="small" onClick={() => navigate('/employee/learning')}>
                Open Portal &rarr;
              </Button>
            }
            style={{ borderRadius: 12, height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            {trainings && trainings.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={trainings}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<BookOutlined />} style={{ backgroundColor: '#e6f4ff', color: '#1677ff' }} />}
                      title={<Text strong>{item.title}</Text>}
                      description={
                        <Space size="middle">
                          {item.category && <Text type="secondary">Category: {item.category}</Text>}
                          <Text type="secondary">Sessions: {item.sessionsCount}</Text>
                        </Space>
                      }
                    />
                    <Tag color={item.status === 'ACTIVE' || item.status === 'PUBLISHED' ? 'blue' : 'default'}>
                      {item.status}
                    </Tag>
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No training courses currently assigned."
              />
            )}
          </Card>
        </Col>

        {/* Recent Notifications */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BellOutlined style={{ color: '#fa8c16' }} />
                <span>Recent Notifications</span>
              </Space>
            }
            style={{ borderRadius: 12, height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            {recentNotifications && recentNotifications.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={recentNotifications}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Badge dot={!item.isRead}>
                          <Avatar icon={<BellOutlined />} style={{ backgroundColor: '#fff7e6', color: '#fa8c16' }} />
                        </Badge>
                      }
                      title={<Text strong>{item.title}</Text>}
                      description={
                        <Space direction="vertical" size={2}>
                          <span>{item.message}</span>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {new Date(item.createdAt).toLocaleString()}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No recent notifications."
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 4. Quick Portal Access Links */}
      <Card
        title="Employee Self-Service Quick Navigation"
        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card
              hoverable
              size="small"
              onClick={() => navigate('/employee/payslips')}
              style={{
                borderRadius: 8,
                textAlign: 'center',
                borderColor: '#b7eb8f',
                background: '#f6ffed',
                cursor: 'pointer',
              }}
            >
              <DollarOutlined style={{ fontSize: 28, color: '#52c41a', marginBottom: 8 }} />
              <Title level={5} style={{ margin: '4px 0' }}>My Payslips</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                View and print compensation statements
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card
              size="small"
              style={{
                borderRadius: 8,
                textAlign: 'center',
                background: '#fafafa',
                borderColor: '#e8e8e8',
              }}
            >
              <CalendarOutlined style={{ fontSize: 28, color: '#1677ff', marginBottom: 8 }} />
              <Title level={5} style={{ margin: '4px 0' }}>Leave Requests</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Annual, sick & maternity leave records
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card
              size="small"
              style={{
                borderRadius: 8,
                textAlign: 'center',
                background: '#fafafa',
                borderColor: '#e8e8e8',
              }}
            >
              <ClockCircleOutlined style={{ fontSize: 28, color: '#fa8c16', marginBottom: 8 }} />
              <Title level={5} style={{ margin: '4px 0' }}>Attendance Logs</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Punch history & timesheet verification
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card
              hoverable
              size="small"
              onClick={() => navigate('/employee/learning')}
              style={{
                borderRadius: 8,
                textAlign: 'center',
                borderColor: '#d3adf7',
                background: '#f9f0ff',
                cursor: 'pointer',
              }}
            >
              <BookOutlined style={{ fontSize: 28, color: '#722ed1', marginBottom: 8 }} />
              <Title level={5} style={{ margin: '4px 0' }}>Learning Catalog</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Assigned courses, schedules & skills
              </Text>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};
