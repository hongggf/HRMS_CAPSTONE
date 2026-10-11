import React from 'react';
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
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboard';

const { Title, Text } = Typography;

export const DashboardPage: React.FC = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: dashboardApi.getMetrics,
    staleTime: 30000,
  });

  return (
    <div>
      {/* Header bar with title and refresh button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Executive HR Dashboard
          </Title>
          <Text type="secondary">
            Real-time organizational metrics and pending action items
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined spin={isFetching} />}
          onClick={() => refetch()}
          loading={isFetching}
        >
          Refresh Data
        </Button>
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
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : data ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 1. Core Employee Headcount Overview */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered hoverable>
                <Statistic
                  title="Total Employees"
                  value={data.totalEmployees}
                  prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered hoverable>
                <Statistic
                  title="Active Workforce"
                  value={data.activeEmployees}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered hoverable>
                <Statistic
                  title="Inactive / Onboarding"
                  value={data.inactiveEmployees}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered hoverable>
                <Statistic
                  title="New Hires (Last 30 Days)"
                  value={data.newHires}
                  valueStyle={{ color: '#722ed1' }}
                  prefix={<UserAddOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* 2. Pending Approvals & Action Items */}
          <Title level={5} style={{ margin: '8px 0 0' }}>
            Pending Action Items
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card
                bordered
                title={
                  <span>
                    <ClockCircleOutlined
                      style={{ marginRight: 8, color: '#fa8c16' }}
                    />
                    Workforce Requests
                  </span>
                }
              >
                <Statistic
                  value={data.pendingWorkforceApprovals}
                  suffix="awaiting review"
                  valueStyle={{ fontSize: 24 }}
                />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card
                bordered
                title={
                  <span>
                    <FileDoneOutlined
                      style={{ marginRight: 8, color: '#13c2c2' }}
                    />
                    Recruitment Requisitions
                  </span>
                }
              >
                <Statistic
                  value={data.pendingRecruitmentApprovals}
                  suffix="awaiting approval"
                  valueStyle={{ fontSize: 24 }}
                />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card
                bordered
                title={
                  <span>
                    <DollarOutlined
                      style={{ marginRight: 8, color: '#eb2f96' }}
                    />
                    Payroll Approvals
                  </span>
                }
              >
                <Statistic
                  value={data.pendingPayrollApprovals}
                  suffix="cycles pending lock"
                  valueStyle={{ fontSize: 24 }}
                />
              </Card>
            </Col>
          </Row>

          {/* 3. Payroll & Operational Summaries */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="Latest Payroll Overview" bordered>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Processed Records"
                      value={data.payrollSummary.total}
                      suffix="employees"
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Total Net Payout"
                      value={data.payrollSummary.netSalary}
                      prefix="$"
                      precision={2}
                      valueStyle={{ color: '#1677ff' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="Attendance & Leaves Today" bordered>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>Attendance Status: </Text>
                  {Object.keys(data.attendanceSummary).length === 0 ? (
                    <Text type="secondary">No records logged today</Text>
                  ) : (
                    Object.entries(data.attendanceSummary).map(
                      ([status, count]) => (
                        <Tag color="blue" key={status}>
                          {status}: {count}
                        </Tag>
                      ),
                    )
                  )}
                </div>

                <div>
                  <Text strong>Leave Requests: </Text>
                  {Object.keys(data.leaveSummary).length === 0 ? (
                    <Text type="secondary">No leave records pending</Text>
                  ) : (
                    Object.entries(data.leaveSummary).map(([status, count]) => (
                      <Tag color="cyan" key={status}>
                        {status}: {count}
                      </Tag>
                    ))
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Space>
      ) : (
        <Empty description="No metrics available" />
      )}
    </div>
  );
};
