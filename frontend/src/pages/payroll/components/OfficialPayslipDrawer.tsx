import React from 'react';
import {
  Drawer,
  Button,
  Typography,
  Card,
  Row,
  Col,
  Table,
  Tag,
  Divider,
  Alert,
  Spin,
  Space,
} from 'antd';
import {
  PrinterOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { Payroll, PayrollPeriodStatus } from '../../../types/payroll';
import { formatCurrency } from '../../../utils/formatters';
import { formatDateOnly } from '../../../utils/dateUtils';
import { normalizeApiError } from '../../../api/client';

const { Title, Text, Paragraph } = Typography;

export const getStatusTag = (status: PayrollPeriodStatus) => {
  switch (status) {
    case 'DRAFT':
      return <Tag color="default">Draft</Tag>;
    case 'CALCULATING':
      return <Tag color="processing">Calculating...</Tag>;
    case 'CALCULATED':
      return <Tag color="blue">Calculated</Tag>;
    case 'PENDING_APPROVAL':
      return <Tag color="warning">Pending Review</Tag>;
    case 'APPROVED':
      return <Tag color="cyan">Approved</Tag>;
    case 'REJECTED':
      return <Tag color="error">Rejected</Tag>;
    case 'LOCKED':
      return <Tag color="purple">Locked (Final)</Tag>;
    case 'PAID':
      return <Tag color="green">Paid</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

interface OfficialPayslipDrawerProps {
  open: boolean;
  onClose: () => void;
  payroll: Payroll | null;
  isLoading: boolean;
  error: unknown;
  isHeadOfHr?: boolean;
}

export const OfficialPayslipDrawer: React.FC<OfficialPayslipDrawerProps> = ({
  open,
  onClose,
  payroll,
  isLoading,
  error,
  isHeadOfHr = true,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const period = payroll?.payrollPeriod;
  const isReleased =
    period?.status === 'APPROVED' ||
    period?.status === 'LOCKED' ||
    period?.status === 'PAID';

  const grossPay =
    (payroll?.basicSalary || 0) +
    (payroll?.totalAllowances || 0) +
    (payroll?.totalOvertime || 0);

  const earningsItems = [
    {
      id: 'base-salary',
      componentName: 'Basic Salary',
      componentType: 'OTHER' as const,
      description: 'Contractual monthly base salary',
      amount: payroll?.basicSalary || 0,
    },
    ...(payroll?.items?.filter((item) => item.componentType !== 'DEDUCTION') ||
      []),
  ];

  const deductionItems =
    payroll?.items?.filter((item) => item.componentType === 'DEDUCTION') || [];

  return (
    <Drawer
      title="Official Employee Payslip"
      size={680}
      open={open}
      onClose={onClose}
      extra={
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          disabled={!payroll || isLoading}
        >
          Print Payslip
        </Button>
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>
            Loading authoritative payslip data...
          </Paragraph>
        </div>
      ) : error ? (
        <Alert
          title="Unauthorized / Payslip Error"
          description={
            normalizeApiError(error).message ||
            'Access to this payslip was forbidden or an error occurred'
          }
          type="error"
          showIcon
        />
      ) : payroll ? (
        <div className="printable-payslip" style={{ padding: '4px' }}>
          {/* Header Banner */}
          <div
            style={{
              borderBottom: '2px solid #1677ff',
              paddingBottom: 16,
              marginBottom: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <Title
                level={4}
                style={{ margin: 0, color: '#1677ff', letterSpacing: 0.5 }}
              >
                HRMS ENTERPRISE PAYSLIP
              </Title>
              <Text type="secondary" strong>
                Payroll Period: {period?.name || 'Current Period'}
              </Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Period Range: {formatDateOnly(period?.startDate)} ~{' '}
                  {formatDateOnly(period?.endDate)}
                </Text>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>{getStatusTag(period?.status || payroll.status)}</div>
              <Text
                type="secondary"
                style={{ fontSize: 11, display: 'block', marginTop: 4 }}
              >
                Reference ID: PAY-{payroll.id}
              </Text>
            </div>
          </div>

          {!isReleased && (
            <Alert
              title="Draft / Provisional Notice"
              description="This payroll period is currently in progress and has not received final Head of HR approval. Figures are provisional."
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Employee Information Section */}
          <Card
            size="small"
            title="Employee Particulars"
            variant="outlined"
            style={{ marginBottom: 20, background: '#fafafa' }}
          >
            <Row gutter={[16, 10]}>
              <Col span={12}>
                <Text type="secondary">Employee Code: </Text>
                <Text strong>{payroll.employee?.employeeId || '—'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Full Name: </Text>
                {isHeadOfHr ? (
                  <Text strong>
                    {payroll.employee?.firstName} {payroll.employee?.lastName}
                  </Text>
                ) : (
                  <Tag icon={<LockOutlined />} color="default">
                    Confidential
                  </Tag>
                )}
              </Col>
              <Col span={12}>
                <Text type="secondary">Department: </Text>
                <Text>{payroll.employee?.department?.name || '—'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Position / Role: </Text>
                {isHeadOfHr ? (
                  <Text>{payroll.employee?.position?.title || '—'}</Text>
                ) : (
                  <Tag icon={<LockOutlined />} color="default">
                    Confidential
                  </Tag>
                )}
              </Col>
              <Col span={12}>
                <Text type="secondary">Corporate Email: </Text>
                <Text>
                  {isHeadOfHr
                    ? payroll.employee?.email || '—'
                    : '••••••@••••.com'}
                </Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Payment Status: </Text>
                <Tag
                  color={
                    period?.status === 'LOCKED' || period?.status === 'PAID'
                      ? 'green'
                      : 'blue'
                  }
                >
                  {period?.status === 'PAID'
                    ? 'Paid'
                    : isReleased
                      ? 'Approved for Payout'
                      : 'Pending Authorization'}
                </Tag>
              </Col>
            </Row>
          </Card>

          {/* Earnings Breakdown */}
          <Title level={5} style={{ marginBottom: 8 }}>
            Earnings & Additions
          </Title>
          <Table
            size="small"
            pagination={false}
            dataSource={earningsItems}
            rowKey={(r) => `${r.componentName}-${r.amount}`}
            columns={[
              {
                title: 'Component',
                dataIndex: 'componentName',
                key: 'name',
                render: (val: string) => <Text strong>{val}</Text>,
              },
              {
                title: 'Description',
                dataIndex: 'description',
                key: 'desc',
                render: (val: string) => (
                  <Text type="secondary">{val || '—'}</Text>
                ),
              },
              {
                title: 'Amount (USD)',
                dataIndex: 'amount',
                key: 'amount',
                align: 'right' as const,
                render: (val: number) => (
                  <Text type={val > 0 ? 'success' : undefined}>
                    {formatCurrency(val)}
                  </Text>
                ),
              },
            ]}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '8px 16px',
              background: '#f9f9f9',
              marginBottom: 16,
              border: '1px solid #f0f0f0',
              borderTop: 0,
            }}
          >
            <Space>
              <Text strong>Gross Earnings:</Text>
              <Text strong style={{ color: '#52c41a', fontSize: 15 }}>
                {formatCurrency(grossPay)}
              </Text>
            </Space>
          </div>

          {/* Deductions Breakdown */}
          <Title level={5} style={{ marginTop: 20, marginBottom: 8 }}>
            Statutory & Authorized Deductions
          </Title>
          {deductionItems.length > 0 ? (
            <>
              <Table
                size="small"
                pagination={false}
                dataSource={deductionItems}
                rowKey="id"
                columns={[
                  {
                    title: 'Component',
                    dataIndex: 'componentName',
                    key: 'name',
                    render: (val: string) => <Text strong>{val}</Text>,
                  },
                  {
                    title: 'Description',
                    dataIndex: 'description',
                    key: 'desc',
                    render: (val: string) => (
                      <Text type="secondary">{val || '—'}</Text>
                    ),
                  },
                  {
                    title: 'Amount (USD)',
                    dataIndex: 'amount',
                    key: 'amount',
                    align: 'right' as const,
                    render: (val: number) => (
                      <Text type="danger">-{formatCurrency(val)}</Text>
                    ),
                  },
                ]}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  padding: '8px 16px',
                  background: '#f9f9f9',
                  marginBottom: 16,
                  border: '1px solid #f0f0f0',
                  borderTop: 0,
                }}
              >
                <Space>
                  <Text strong>Total Deductions:</Text>
                  <Text strong style={{ color: '#ff4d4f', fontSize: 15 }}>
                    -{formatCurrency(payroll.totalDeductions)}
                  </Text>
                </Space>
              </div>
            </>
          ) : (
            <Card
              size="small"
              variant="outlined"
              style={{ marginBottom: 16, background: '#fafafa' }}
            >
              <Text type="secondary">
                No deductions recorded for this pay period.
              </Text>
            </Card>
          )}

          {/* Adjustments */}
          {Boolean(payroll.adjustments && payroll.adjustments.length > 0) && (
            <>
              <Title level={5} style={{ marginTop: 20, marginBottom: 8 }}>
                Post-Calculation Adjustments
              </Title>
              <Table
                size="small"
                pagination={false}
                dataSource={payroll.adjustments || []}
                rowKey="id"
                columns={[
                  {
                    title: 'Type',
                    dataIndex: 'type',
                    key: 'type',
                    render: (val: string) => (
                      <Tag color={val === 'ADDITION' ? 'green' : 'volcano'}>
                        {val}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Reason',
                    dataIndex: 'reason',
                    key: 'reason',
                  },
                  {
                    title: 'Date',
                    dataIndex: 'date',
                    key: 'date',
                    render: (val: string) => formatDateOnly(val),
                  },
                  {
                    title: 'Amount (USD)',
                    dataIndex: 'amount',
                    key: 'amount',
                    align: 'right' as const,
                    render: (val: number, rec: any) => (
                      <Text
                        type={rec.type === 'ADDITION' ? 'success' : 'danger'}
                      >
                        {rec.type === 'ADDITION' ? '+' : '-'}
                        {formatCurrency(val)}
                      </Text>
                    ),
                  },
                ]}
              />
            </>
          )}

          <Divider style={{ margin: '20px 0 16px' }} />

          {/* Final Net Payout Banner */}
          <div
            style={{
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              padding: '18px 24px',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
                Authoritative Net Salary Disbursement
              </Text>
              <Space size="small">
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text style={{ fontSize: 12, color: '#595959' }}>
                  Gross ${grossPay.toFixed(2)} - Deductions $
                  {Number(payroll.totalDeductions || 0).toFixed(2)}
                </Text>
              </Space>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#389e0d',
                  display: 'block',
                }}
              >
                {formatCurrency(payroll.netSalary)}
              </Text>
            </div>
          </div>

          {/* Footer Legal & Security Notice */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Confidential payroll record generated by HRMS Enterprise.
              Unauthorized reproduction or sharing is prohibited.
            </Text>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
};
