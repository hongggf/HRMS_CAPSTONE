import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Typography,
  Space,
  Alert,
  Empty,
} from 'antd';
import { EyeOutlined, DollarOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { payrollApi } from '../../../api/payroll';
import { Payroll } from '../../../types/payroll';
import { formatCurrency } from '../../../utils/formatters';
import { formatDateOnly } from '../../../utils/dateUtils';
import { OfficialPayslipDrawer } from './OfficialPayslipDrawer';

const { Text } = Typography;

export const MyPayslipsTab: React.FC = () => {
  const [selectedPayslipId, setSelectedPayslipId] = useState<number | null>(
    null,
  );

  const {
    data: myPayslips = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: payrollApi.getMyPayslips,
    staleTime: 30000,
  });

  const {
    data: activePayslip,
    isLoading: isPayslipLoading,
    error: payslipError,
  } = useQuery({
    queryKey: ['payslip-detail', selectedPayslipId],
    queryFn: () =>
      selectedPayslipId
        ? payrollApi.getPayslip(selectedPayslipId)
        : Promise.resolve(null),
    enabled: selectedPayslipId !== null,
  });

  const columns = [
    {
      title: 'Payroll Period',
      dataIndex: ['payrollPeriod', 'name'],
      key: 'periodName',
      render: (val: string, r: Payroll) => (
        <div>
          <Text strong>{val || 'Payroll Period'}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
            {formatDateOnly(r.payrollPeriod?.startDate)} ~{' '}
            {formatDateOnly(r.payrollPeriod?.endDate)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Basic Salary',
      dataIndex: 'basicSalary',
      key: 'basicSalary',
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Allowances & OT',
      key: 'allowances',
      align: 'right' as const,
      render: (_: any, r: Payroll) => (
        <Text type="success">
          +{formatCurrency((r.totalAllowances || 0) + (r.totalOvertime || 0))}
        </Text>
      ),
    },
    {
      title: 'Deductions',
      dataIndex: 'totalDeductions',
      key: 'totalDeductions',
      align: 'right' as const,
      render: (val: number) => (
        <Text type="danger">-{formatCurrency(val)}</Text>
      ),
    },
    {
      title: 'Net Salary',
      dataIndex: 'netSalary',
      key: 'netSalary',
      align: 'right' as const,
      render: (val: number) => (
        <Text strong style={{ color: '#1677ff', fontSize: 14 }}>
          {formatCurrency(val)}
        </Text>
      ),
    },
    {
      title: 'Disbursement Status',
      dataIndex: ['payrollPeriod', 'status'],
      key: 'status',
      align: 'center' as const,
      render: (val: string) => (
        <Tag color={val === 'LOCKED' || val === 'PAID' ? 'green' : 'blue'}>
          {val === 'PAID' ? 'Paid' : 'Approved'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: Payroll) => (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<EyeOutlined />}
          onClick={() => setSelectedPayslipId(record.id)}
        >
          View Payslip
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        variant="outlined"
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Space>
              <DollarOutlined style={{ color: '#1677ff' }} />
              <span>Employee Self-Service: My Released Payslips</span>
            </Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isLoading}
            >
              Refresh
            </Button>
          </div>
        }
      >
        <Alert
          title="Self-Service Access Security"
          description="You are accessing verified personal salary records. Payslips are released here only after final approval and locking by the Head of HR."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={myPayslips}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No released payslips are currently available for your account."
              />
            ),
          }}
        />
      </Card>

      <OfficialPayslipDrawer
        open={selectedPayslipId !== null}
        onClose={() => setSelectedPayslipId(null)}
        payroll={activePayslip || null}
        isLoading={isPayslipLoading}
        error={payslipError}
      />
    </div>
  );
};
