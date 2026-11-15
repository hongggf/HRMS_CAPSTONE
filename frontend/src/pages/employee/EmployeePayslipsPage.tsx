import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Select,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Typography,
  Modal,
  Descriptions,
  Divider,
  Alert,
  Empty,
  Tooltip,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined,
  PrinterOutlined,
  EyeOutlined,
  ReloadOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  LockOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { payrollApi } from '../../api/payroll';
import { Payroll, PayrollPeriodStatus } from '../../types/payroll';

const { Title, Text } = Typography;

export const EmployeePayslipsPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activePayslip, setActivePayslip] = useState<Payroll | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Fetch only this employee's released payslips securely from backend
  const {
    data: payslips = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<Payroll[]>({
    queryKey: ['my-payslips'],
    queryFn: () => payrollApi.getMyPayslips(),
    staleTime: 30000,
  });

  // Extract available years for filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    payslips.forEach((p) => {
      const dateStr = p.payrollPeriod?.startDate || p.createdAt;
      if (dateStr) {
        years.add(new Date(dateStr).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [payslips]);

  // Filtered payslips
  const filteredPayslips = useMemo(() => {
    return payslips.filter((p) => {
      const yearStr = new Date(p.payrollPeriod?.startDate || p.createdAt)
        .getFullYear()
        .toString();
      const matchYear = selectedYear === 'ALL' || yearStr === selectedYear;
      const matchStatus =
        selectedStatus === 'ALL' ||
        p.status === selectedStatus ||
        p.payrollPeriod?.status === selectedStatus;
      return matchYear && matchStatus;
    });
  }, [payslips, selectedYear, selectedStatus]);

  // Calculate high-level summary
  const totalNetReleased = useMemo(() => {
    return filteredPayslips.reduce((acc, curr) => acc + (curr.netSalary || 0), 0);
  }, [filteredPayslips]);

  const averageNet = useMemo(() => {
    return filteredPayslips.length > 0
      ? Math.round(totalNetReleased / filteredPayslips.length)
      : 0;
  }, [filteredPayslips, totalNetReleased]);

  const getStatusTag = (status?: PayrollPeriodStatus) => {
    switch (status) {
      case 'PAID':
        return <Tag color="success" icon={<CheckCircleOutlined />}>PAID</Tag>;
      case 'LOCKED':
        return <Tag color="blue" icon={<LockOutlined />}>LOCKED & RELEASED</Tag>;
      case 'APPROVED':
        return <Tag color="cyan" icon={<CheckCircleOutlined />}>APPROVED</Tag>;
      default:
        return <Tag color="default">{status || 'RELEASED'}</Tag>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const columns: ColumnsType<Payroll> = [
    {
      title: 'Payroll Period',
      key: 'period',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 14 }}>
            {record.payrollPeriod?.name || `Period #${record.payrollPeriodId}`}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {record.payrollPeriod?.startDate
              ? `${new Date(record.payrollPeriod.startDate).toLocaleDateString()} – ${new Date(record.payrollPeriod.endDate).toLocaleDateString()}`
              : new Date(record.createdAt).toLocaleDateString()}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Gross Salary',
      key: 'grossSalary',
      align: 'right',
      render: (_, record) => {
        const gross =
          (record.basicSalary || 0) +
          (record.totalAllowances || 0) +
          (record.totalOvertime || 0);
        return <Text strong>${gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>;
      },
    },
    {
      title: 'Total Deductions',
      dataIndex: 'totalDeductions',
      key: 'totalDeductions',
      align: 'right',
      render: (val: number) => (
        <Text type="danger">
          -${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Net Take-Home Pay',
      dataIndex: 'netSalary',
      key: 'netSalary',
      align: 'right',
      render: (val: number) => (
        <Text strong style={{ color: '#52c41a', fontSize: 15 }}>
          ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center',
      render: (_, record) => getStatusTag(record.payrollPeriod?.status || record.status),
    },
    {
      title: 'Payment Status',
      key: 'paymentStatus',
      render: (_, record) => {
        const status = record.payrollPeriod?.status || record.status;
        if (status === 'PAID') {
          return <Tag color="green">Payment Disbursed</Tag>;
        }
        return <Text type="secondary" style={{ fontSize: 12 }}>Scheduled via Direct Deposit</Text>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            ghost
            icon={<EyeOutlined />}
            onClick={() => {
              setActivePayslip(record);
              setModalOpen(true);
            }}
          >
            View Payslip
          </Button>
          <Tooltip title="Print / Save Voucher">
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => {
                setActivePayslip(record);
                setModalOpen(true);
                setTimeout(handlePrint, 300);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header and Breadcrumb navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space align="center" size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/employee/dashboard')}>
            Dashboard
          </Button>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              <DollarOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              My Payslips
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Authorized monthly compensation statements and earnings breakdowns
            </Text>
          </div>
        </Space>

        <Space>
          <Button
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Summary KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Released Payslips"
              value={filteredPayslips.length}
              prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Latest Released Net Pay"
              value={filteredPayslips[0]?.netSalary || 0}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="Average Monthly Net Pay"
              value={averageNet}
              precision={2}
              prefix="$"
            />
          </Card>
        </Col>
      </Row>

      {/* Filter and Content Card */}
      <Card
        style={{
          borderRadius: token.borderRadiusLG,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
        title="Compensation History"
        extra={
          <Space wrap>
            <Select
              value={selectedYear}
              onChange={setSelectedYear}
              style={{ width: 130 }}
              options={[
                { value: 'ALL', label: 'All Years' },
                ...availableYears.map((y) => ({ value: y, label: `Year ${y}` })),
              ]}
            />
            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: 140 }}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'PAID', label: 'Paid' },
                { value: 'LOCKED', label: 'Locked' },
                { value: 'APPROVED', label: 'Approved' },
              ]}
            />
          </Space>
        }
      >
        {isError && (
          <Alert
            type="error"
            showIcon
            message="Error Loading Payslips"
            description={(error as any)?.message || 'Failed to securely load payslips.'}
            action={
              <Button size="small" type="primary" onClick={() => refetch()}>
                Retry
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        <Table
          dataSource={filteredPayslips}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No released payslips available for this filter criteria."
              />
            ),
          }}
        />
      </Card>

      {/* Detailed Payslip Modal & Printable Voucher */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1677ff' }} />
            <span>
              Official Payslip Statement — {activePayslip?.payrollPeriod?.name || `Period #${activePayslip?.payrollPeriodId}`}
            </span>
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={700}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print Statement
          </Button>,
          <Button key="close" type="primary" onClick={() => setModalOpen(false)}>
            Close
          </Button>,
        ]}
      >
        {activePayslip && (
          <div id="printable-payslip" style={{ padding: '8px 4px' }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1677ff', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <Title level={4} style={{ margin: 0, color: '#001529' }}>
                  HRMS Enterprise Portal
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Official Employee Compensation Voucher
                </Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                {getStatusTag(activePayslip.payrollPeriod?.status || activePayslip.status)}
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  Issued: {new Date(activePayslip.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Employee Information */}
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Employee Name">
                <Text strong>
                  {activePayslip.employee
                    ? `${activePayslip.employee.firstName} ${activePayslip.employee.lastName}`
                    : 'Authorized Employee'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Employee ID">
                <Text code strong>{activePayslip.employee?.employeeId || `ID #${activePayslip.employeeId}`}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Pay Period">
                {activePayslip.payrollPeriod?.name || 'Current Period'}
              </Descriptions.Item>
              <Descriptions.Item label="Period Dates">
                {activePayslip.payrollPeriod?.startDate
                  ? `${new Date(activePayslip.payrollPeriod.startDate).toLocaleDateString()} – ${new Date(activePayslip.payrollPeriod.endDate).toLocaleDateString()}`
                  : 'N/A'}
              </Descriptions.Item>
            </Descriptions>

            {/* Earnings & Allowances */}
            <Title level={5} style={{ marginTop: 16, color: '#1677ff' }}>
              1. Gross Earnings & Allowances
            </Title>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Basic Salary">
                <Text strong>${(activePayslip.basicSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </Descriptions.Item>
              {activePayslip.items
                ?.filter((item) => item.componentType === 'ALLOWANCE' || item.componentType === 'BONUS')
                .map((item) => (
                  <Descriptions.Item key={item.id} label={item.componentName || (item as any).name || 'Item'}>
                    ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Descriptions.Item>
                ))}
              {activePayslip.totalOvertime > 0 && (
                <Descriptions.Item label="Overtime Earnings">
                  ${activePayslip.totalOvertime.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Total Gross Earnings">
                <Text strong style={{ color: '#1677ff' }}>
                  ${(
                    (activePayslip.basicSalary || 0) +
                    (activePayslip.totalAllowances || 0) +
                    (activePayslip.totalOvertime || 0)
                  ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {/* Deductions */}
            <Title level={5} style={{ marginTop: 16, color: '#cf1322' }}>
              2. Deductions & Withholdings
            </Title>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              {activePayslip.items
                ?.filter((item) => item.componentType === 'DEDUCTION')
                .map((item) => (
                  <Descriptions.Item key={item.id} label={item.componentName || (item as any).name || 'Item'}>
                    <Text type="danger">
                      -${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </Descriptions.Item>
                ))}
              <Descriptions.Item label="Total Deductions">
                <Text strong type="danger">
                  -${(activePayslip.totalDeductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {/* Net Pay Highlight Banner */}
            <Card
              size="small"
              style={{
                background: '#f6ffed',
                borderColor: '#b7eb8f',
                borderRadius: 8,
                textAlign: 'center',
                padding: '8px 0',
              }}
            >
              <Text type="secondary" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Net Take-Home Pay
              </Text>
              <Title level={2} style={{ color: '#52c41a', margin: '4px 0 0 0' }}>
                ${(activePayslip.netSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Title>
            </Card>

            <Divider style={{ margin: '16px 0 8px 0' }} />
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center' }}>
              This document is an electronically verified record generated by the HRMS Enterprise System.
            </Text>
          </div>
        )}
      </Modal>
    </div>
  );
};
