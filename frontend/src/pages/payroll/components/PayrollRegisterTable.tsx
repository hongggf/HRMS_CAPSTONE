import React, { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Typography,
  Tooltip,
  Row,
  Col,
} from 'antd';
import {
  EyeOutlined,
  CalculatorOutlined,
  SearchOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Payroll } from '../../../types/payroll';
import { Department } from '../../../types/organization';
import { formatCurrency } from '../../../utils/formatters';

const { Text } = Typography;

interface PayrollRegisterTableProps {
  payrolls: Payroll[];
  departments: Department[];
  isLoading: boolean;
  hasPayrollCreate: boolean;
  isLocked: boolean;
  onViewPayslip: (payrollId: number) => void;
  onInspectCalculation: (payroll: Payroll) => void;
  onOpenAdjustment: (payroll: Payroll) => void;
}

export const PayrollRegisterTable: React.FC<PayrollRegisterTableProps> = ({
  payrolls,
  departments,
  isLoading,
  hasPayrollCreate,
  isLocked,
  onViewPayslip,
  onInspectCalculation,
  onOpenAdjustment,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ADJUSTED' | 'WARNING'>('ALL');

  // Filtered payrolls
  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((p) => {
      // 1. Search text filter
      if (searchText.trim()) {
        const query = searchText.toLowerCase().trim();
        const emp = p.employee;
        const matchesName =
          emp && `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(query);
        const matchesId = emp?.employeeId.toLowerCase().includes(query);
        const matchesEmail = emp?.email.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesEmail) return false;
      }

      // 2. Department filter
      if (selectedDepartmentId !== undefined) {
        if (p.employee?.department?.id !== selectedDepartmentId) return false;
      }

      // 3. Status filter
      if (statusFilter === 'ADJUSTED') {
        if (!p.adjustments || p.adjustments.length === 0) return false;
      } else if (statusFilter === 'WARNING') {
        if (p.netSalary > 0) return false;
      }

      return true;
    });
  }, [payrolls, searchText, selectedDepartmentId, statusFilter]);

  const columns = [
    {
      title: 'Employee ID',
      dataIndex: ['employee', 'employeeId'],
      key: 'empId',
      width: 120,
      render: (val: string) => <Text strong>{val || '—'}</Text>,
    },
    {
      title: 'Employee Name',
      key: 'employeeName',
      render: (_: any, record: Payroll) => {
        const emp = record.employee;
        if (!emp) return '—';
        return (
          <div>
            <Text strong>{emp.firstName} {emp.lastName}</Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
              {emp.email}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Department & Position',
      key: 'deptPos',
      render: (_: any, record: Payroll) => {
        const dept = record.employee?.department?.name;
        const pos = record.employee?.position?.title;
        return (
          <Space direction="vertical" size={0}>
            <Text type="secondary">{dept || '—'}</Text>
            <Text style={{ fontSize: 12 }}>{pos || '—'}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Basic Pay',
      dataIndex: 'basicSalary',
      key: 'basicSalary',
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Allowances',
      dataIndex: 'totalAllowances',
      key: 'totalAllowances',
      align: 'right' as const,
      render: (val: number) => (
        <Text type={val > 0 ? 'success' : undefined}>
          {formatCurrency(val)}
        </Text>
      ),
    },
    {
      title: 'Overtime',
      dataIndex: 'totalOvertime',
      key: 'totalOvertime',
      align: 'right' as const,
      render: (val: number) => (
        <Text type={val > 0 ? 'warning' : undefined}>
          {formatCurrency(val)}
        </Text>
      ),
    },
    {
      title: 'Gross Pay',
      key: 'grossPay',
      align: 'right' as const,
      render: (_: any, r: Payroll) => {
        const gross =
          (r.basicSalary || 0) + (r.totalAllowances || 0) + (r.totalOvertime || 0);
        return <Text strong style={{ color: '#52c41a' }}>{formatCurrency(gross)}</Text>;
      },
    },
    {
      title: 'Deductions',
      dataIndex: 'totalDeductions',
      key: 'totalDeductions',
      align: 'right' as const,
      render: (val: number) => (
        <Text type={val > 0 ? 'danger' : undefined}>
          {val > 0 ? `-${formatCurrency(val)}` : formatCurrency(val)}
        </Text>
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
      title: 'Status & Integrity',
      key: 'status',
      align: 'center' as const,
      width: 130,
      render: (_: any, record: Payroll) => {
        if (record.netSalary <= 0) {
          return (
            <Tag color="error" icon={<ExclamationCircleOutlined />}>
              Net ≤ 0
            </Tag>
          );
        }
        if (record.adjustments && record.adjustments.length > 0) {
          return (
            <Tag color="orange">
              {record.adjustments.length} Adj
            </Tag>
          );
        }
        return (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Verified
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      width: 210,
      render: (_: any, record: Payroll) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewPayslip(record.id)}
          >
            Payslip
          </Button>
          <Button
            size="small"
            icon={<CalculatorOutlined />}
            onClick={() => onInspectCalculation(record)}
          >
            Inspect
          </Button>
          {hasPayrollCreate && (
            <Tooltip
              title={
                isLocked
                  ? 'Locked: Adjustments will be recorded for audit only'
                  : 'Add payroll adjustment'
              }
            >
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => onOpenAdjustment(record)}
              >
                Adjust
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Filtering Bar */}
      <div style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={10} md={8}>
            <Input
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Search by name, ID, or email..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>

          <Col xs={12} sm={7} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter Department"
              allowClear
              value={selectedDepartmentId}
              onChange={(val) => setSelectedDepartmentId(val)}
              options={departments.map((d) => ({
                label: d.name,
                value: d.id,
              }))}
            />
          </Col>

          <Col xs={12} sm={7} md={5}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { label: 'All Records', value: 'ALL' },
                { label: 'With Adjustments', value: 'ADJUSTED' },
                { label: 'Warnings / Issues', value: 'WARNING' },
              ]}
            />
          </Col>
        </Row>
      </div>

      <Table
        columns={columns}
        dataSource={filteredPayrolls}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 15, showSizeChanger: true }}
        scroll={{ x: 1050 }}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '8px 16px', background: '#fafafa' }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Component Items Breakdown:
              </Text>
              <Space wrap size={[8, 8]}>
                <Tag color="default">Base Salary: {formatCurrency(record.basicSalary)}</Tag>
                {record.items?.map((item) => (
                  <Tag
                    key={item.id}
                    color={
                      item.componentType === 'ALLOWANCE'
                        ? 'green'
                        : item.componentType === 'DEDUCTION'
                        ? 'red'
                        : 'blue'
                    }
                  >
                    {item.componentName}: {item.componentType === 'DEDUCTION' ? '-' : '+'}
                    {formatCurrency(item.amount)}
                  </Tag>
                ))}
                {record.totalOvertime > 0 && (
                  <Tag color="warning">
                    Overtime Pay: +{formatCurrency(record.totalOvertime)}
                  </Tag>
                )}
              </Space>
            </div>
          ),
        }}
      />
    </div>
  );
};
