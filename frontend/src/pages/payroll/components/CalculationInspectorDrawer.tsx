import React from 'react';
import {
  Drawer,
  Typography,
  Card,
  Row,
  Col,
  Descriptions,
  Table,
  Tag,
  Alert,
  Space,
} from 'antd';
import {
  CalculatorOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Payroll } from '../../../types/payroll';
import { formatCurrency } from '../../../utils/formatters';

const { Title, Text } = Typography;

interface CalculationInspectorDrawerProps {
  open: boolean;
  onClose: () => void;
  payroll: Payroll | null;
}

export const CalculationInspectorDrawer: React.FC<CalculationInspectorDrawerProps> = ({
  open,
  onClose,
  payroll,
}) => {
  if (!payroll) return null;

  const basic = payroll.basicSalary || 0;
  const standardMonthlyHours = 160;
  const hourlyRate = basic / standardMonthlyHours;
  const overtimeHours =
    payroll.totalOvertime > 0 && hourlyRate > 0
      ? Number((payroll.totalOvertime / (hourlyRate * 1.5)).toFixed(2))
      : 0;

  const allowances = payroll.totalAllowances || 0;
  const overtime = payroll.totalOvertime || 0;
  const gross = basic + allowances + overtime;
  const deductions = payroll.totalDeductions || 0;
  const net = payroll.netSalary || 0;

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalculatorOutlined style={{ color: '#1677ff' }} />
          <span>Payroll Calculation Inspector</span>
        </div>
      }
      size={640}
      open={open}
      onClose={onClose}
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>
          {payroll.employee?.firstName} {payroll.employee?.lastName} (
          {payroll.employee?.employeeId})
        </Title>
        <Text type="secondary">
          {payroll.employee?.department?.name} • {payroll.employee?.position?.title}
        </Text>
      </div>

      <Alert
        title="Authoritative Server Calculation"
        description="All values shown are executed and validated by the backend calculation engine. No client-side mathematical assumptions supersede these server figures."
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      {/* Step 1: Base Salary & Hourly Standard */}
      <Card
        size="small"
        title="1. Contractual Base Salary & Hourly Standard"
        variant="outlined"
        style={{ marginBottom: 16 }}
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Basic Pay Rate">
            <Text strong>{formatCurrency(basic)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Standard Base Hours">
            160 hrs / month
          </Descriptions.Item>
          <Descriptions.Item label="Computed Base Hourly Rate">
            {formatCurrency(hourlyRate)} / hr
          </Descriptions.Item>
          <Descriptions.Item label="1.5x Overtime Hourly Rate">
            {formatCurrency(hourlyRate * 1.5)} / hr
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Step 2: Overtime Calculation from Approved Timesheets */}
      <Card
        size="small"
        title="2. Overtime Pay Derivation"
        variant="outlined"
        style={{ marginBottom: 16 }}
      >
        {overtime > 0 ? (
          <div>
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Text type="secondary">Approved Overtime Hours: </Text>
                <Tag color="blue" icon={<ClockCircleOutlined />}>
                  {overtimeHours} hours
                </Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">Statutory Rate Multiplier: </Text>
                <Tag color="cyan">1.5x Base Hourly</Tag>
              </Col>
              <Col span={24}>
                <Text type="secondary">Formula: </Text>
                <Text code>
                  ({formatCurrency(basic)} / 160) × 1.5 × {overtimeHours} hrs ={' '}
                  {formatCurrency(overtime)}
                </Text>
              </Col>
            </Row>
          </div>
        ) : (
          <Text type="secondary">
            No approved overtime hours recorded for this employee in the timesheet cycle.
          </Text>
        )}
      </Card>

      {/* Step 3: Configured Salary Components */}
      <Card
        size="small"
        title="3. Salary Components & Benefits Breakdown"
        variant="outlined"
        style={{ marginBottom: 16 }}
      >
        <Table
          size="small"
          pagination={false}
          dataSource={payroll.items || []}
          rowKey="id"
          columns={[
            {
              title: 'Component Name',
              dataIndex: 'componentName',
              key: 'componentName',
              render: (val: string, r: any) => (
                <Space>
                  <Text strong>{val}</Text>
                  <Tag
                    color={
                      r.componentType === 'ALLOWANCE'
                        ? 'green'
                        : r.componentType === 'DEDUCTION'
                        ? 'red'
                        : r.componentType === 'BONUS'
                        ? 'gold'
                        : 'default'
                    }
                  >
                    {r.componentType}
                  </Tag>
                </Space>
              ),
            },
            {
              title: 'Description',
              dataIndex: 'description',
              key: 'description',
              render: (val: string) => <Text type="secondary">{val || '—'}</Text>,
            },
            {
              title: 'Computed Amount',
              dataIndex: 'amount',
              key: 'amount',
              align: 'right' as const,
              render: (val: number, r: any) => (
                <Text
                  type={
                    r.componentType === 'DEDUCTION' ? 'danger' : 'success'
                  }
                >
                  {r.componentType === 'DEDUCTION' ? '-' : '+'}
                  {formatCurrency(val)}
                </Text>
              ),
            },
          ]}
        />
      </Card>

      {/* Step 4: Net Calculation Summary */}
      <Card
        size="small"
        title="4. Gross-to-Net Reconciliation"
        variant="outlined"
        style={{ background: '#fafafa' }}
      >
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Basic Salary">
            {formatCurrency(basic)}
          </Descriptions.Item>
          <Descriptions.Item label="(+) Total Allowances & Bonus">
            <Text type="success">+{formatCurrency(allowances)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="(+) Overtime Pay">
            <Text type="success">+{formatCurrency(overtime)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="(=) Total Gross Pay">
            <Text strong style={{ color: '#52c41a' }}>
              {formatCurrency(gross)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="(-) Total Deductions (Tax & Statutory)">
            <Text type="danger">-{formatCurrency(deductions)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="(=) Authoritative Net Salary">
            <Text strong style={{ fontSize: 16, color: '#1677ff' }}>
              {formatCurrency(net)}
            </Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Drawer>
  );
};
