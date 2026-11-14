import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  Alert,
} from 'antd';
import {
  DollarOutlined,
  DownloadOutlined,
  ApartmentOutlined,
  ReloadOutlined,
  FileDoneOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { payrollApi } from '../../../api/payroll';
import { departmentApi } from '../../../api/organization';
import { Payroll, PayrollPeriod } from '../../../types/payroll';
import {
  formatCurrency,
  formatNumber,
  downloadCsv,
} from '../../../utils/formatters';
import { normalizeApiError } from '../../../api/client';

const { Text, Paragraph } = Typography;

interface PayrollReportsTabProps {
  activePeriod: PayrollPeriod | null;
  payrolls: Payroll[];
  isAuthorized: boolean;
  isHeadOfHr?: boolean;
}

export const PayrollReportsTab: React.FC<PayrollReportsTabProps> = ({
  activePeriod,
  payrolls,
  isAuthorized,
  isHeadOfHr = true,
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(
    undefined,
  );

  // Query departments for filter
  const { data: deptData } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => departmentApi.list({ limit: 100 }),
    staleTime: 60000,
  });

  const departments = deptData?.departments || [];

  // Query official report from backend
  const {
    data: reportData,
    isError: isReportError,
    error: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['payroll-report-metrics', selectedDeptId],
    queryFn: () =>
      payrollApi.getPayrollReport({ departmentId: selectedDeptId }),
    enabled: isAuthorized,
    staleTime: 30000,
  });

  // Department cost aggregation from current period
  const deptCostBreakdown = React.useMemo(() => {
    const map = new Map<
      string,
      {
        deptName: string;
        headcount: number;
        totalBasic: number;
        totalAllowances: number;
        totalOvertime: number;
        totalDeductions: number;
        totalNet: number;
      }
    >();

    payrolls.forEach((p) => {
      const deptName = p.employee?.department?.name || 'Unassigned';
      const existing = map.get(deptName) || {
        deptName,
        headcount: 0,
        totalBasic: 0,
        totalAllowances: 0,
        totalOvertime: 0,
        totalDeductions: 0,
        totalNet: 0,
      };

      existing.headcount += 1;
      existing.totalBasic += p.basicSalary || 0;
      existing.totalAllowances += p.totalAllowances || 0;
      existing.totalOvertime += p.totalOvertime || 0;
      existing.totalDeductions += p.totalDeductions || 0;
      existing.totalNet += p.netSalary || 0;

      map.set(deptName, existing);
    });

    return Array.from(map.values());
  }, [payrolls]);

  // Safe CSV Export Handler (Formula Injection Protected)
  const handleExportCsv = () => {
    const headers = [
      'Employee ID',
      'First Name',
      'Last Name',
      'Email',
      'Department',
      'Position',
      'Basic Salary',
      'Allowances',
      'Overtime Pay',
      'Gross Pay',
      'Total Deductions',
      'Net Salary',
      'Status',
    ];

    const rows = payrolls.map((p) => [
      p.employee?.employeeId || '',
      isHeadOfHr ? p.employee?.firstName || '' : 'Confidential',
      isHeadOfHr ? p.employee?.lastName || '' : 'Confidential',
      isHeadOfHr ? p.employee?.email || '' : '••••••@••••.com',
      p.employee?.department?.name || '',
      isHeadOfHr ? p.employee?.position?.title || '' : 'Confidential',
      p.basicSalary.toFixed(2),
      p.totalAllowances.toFixed(2),
      p.totalOvertime.toFixed(2),
      (
        (p.basicSalary || 0) +
        (p.totalAllowances || 0) +
        (p.totalOvertime || 0)
      ).toFixed(2),
      p.totalDeductions.toFixed(2),
      p.netSalary.toFixed(2),
      p.status,
    ]);

    const periodName =
      activePeriod?.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Payroll_Export';
    downloadCsv(`Payroll_Report_${periodName}`, headers, rows);
  };

  return (
    <div>
      {/* Filter and Export Toolbar */}
      <Card variant="outlined" style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} justify="space-between" align="middle">
          <Col xs={24} md={12}>
            <Space wrap>
              <Text strong>Filter by Department:</Text>
              <Select
                style={{ width: 220 }}
                placeholder="All Departments"
                allowClear
                value={selectedDeptId}
                onChange={(val) => setSelectedDeptId(val)}
                options={departments.map((d) => ({
                  label: `${d.name} (${d.code})`,
                  value: d.id,
                }))}
              />
              <Button icon={<ReloadOutlined />} onClick={() => refetchReport()}>
                Refresh
              </Button>
            </Space>
          </Col>

          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportCsv}
                disabled={payrolls.length === 0}
              >
                Export CSV (Formula-Protected)
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Global Report Data Error Banner */}
      {isReportError && (
        <Alert
          title="Reporting API Notice"
          description={
            normalizeApiError(reportError).message ||
            'Unable to fetch aggregated payroll metrics from the backend report endpoint.'
          }
          type="warning"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Backend Authoritative Report KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card variant="outlined">
            <Statistic
              title="Processed Pay Runs"
              value={formatNumber(
                reportData?.totalPayrollsProcessed || payrolls.length,
              )}
              prefix={<FileDoneOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={5}>
          <Card variant="outlined">
            <Statistic
              title="Gross Payroll Total"
              value={formatCurrency(
                reportData?.totals?.grossSalary ??
                  payrolls.reduce(
                    (s, p) =>
                      s + p.basicSalary + p.totalAllowances + p.totalOvertime,
                    0,
                  ),
              )}
              styles={{ content: { color: '#52c41a', fontSize: 20 } }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={5}>
          <Card variant="outlined">
            <Statistic
              title="Base Salaries"
              value={formatCurrency(
                reportData?.totals?.basicSalary ??
                  payrolls.reduce((s, p) => s + p.basicSalary, 0),
              )}
              styles={{ content: { fontSize: 20 } }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={5}>
          <Card variant="outlined">
            <Statistic
              title="Total Deductions"
              value={formatCurrency(
                reportData?.totals?.deductions ??
                  payrolls.reduce((s, p) => s + p.totalDeductions, 0),
              )}
              styles={{ content: { color: '#ff4d4f', fontSize: 20 } }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8} lg={5}>
          <Card
            variant="outlined"
            style={{ background: '#e6f4ff', borderColor: '#91caff' }}
          >
            <Statistic
              title="Total Net Disbursement"
              value={formatCurrency(
                reportData?.totals?.netSalary ??
                  payrolls.reduce((s, p) => s + p.netSalary, 0),
              )}
              styles={{
                content: { color: '#0958d9', fontWeight: 600, fontSize: 22 },
              }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Department Cost Distribution Summary Table */}
      <Card
        variant="outlined"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ApartmentOutlined style={{ color: '#1677ff' }} />
            <span>Department Cost Breakdown (Current Active Period)</span>
          </div>
        }
        style={{ marginBottom: 20 }}
      >
        <Table
          dataSource={deptCostBreakdown}
          rowKey="deptName"
          pagination={false}
          columns={[
            {
              title: 'Department',
              dataIndex: 'deptName',
              key: 'deptName',
              render: (val: string) => <Text strong>{val}</Text>,
            },
            {
              title: 'Headcount',
              dataIndex: 'headcount',
              key: 'headcount',
              align: 'center' as const,
              render: (val: number) => <Tag color="blue">{val} staff</Tag>,
            },
            {
              title: 'Base Salaries',
              dataIndex: 'totalBasic',
              key: 'totalBasic',
              align: 'right' as const,
              render: (val: number) => formatCurrency(val),
            },
            {
              title: 'Allowances & OT',
              key: 'allowancesOt',
              align: 'right' as const,
              render: (_: any, r: any) =>
                formatCurrency(r.totalAllowances + r.totalOvertime),
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
              title: 'Net Department Payout',
              dataIndex: 'totalNet',
              key: 'totalNet',
              align: 'right' as const,
              render: (val: number) => (
                <Text strong style={{ color: '#1677ff' }}>
                  {formatCurrency(val)}
                </Text>
              ),
            },
          ]}
        />
      </Card>

      {/* Banking & Payment Reconciliation Architecture Note */}
      <Card
        size="small"
        variant="outlined"
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#fa8c16' }} />
            <span>Banking & Payment Reconciliation Future Integration</span>
          </Space>
        }
        style={{ background: '#fffbe6', borderColor: '#ffe58f' }}
      >
        <Paragraph style={{ margin: 0, fontSize: 13 }}>
          <strong>Future Backend Requirement:</strong> Automatic bank payment
          batch files (e.g., ABA PayWay / Bakong / ACLEDA payroll transfer
          templates) and payment reconciliation APIs are not yet implemented in
          the backend server. Once payment gateway integration endpoints are
          deployed, automated clearing and disbursement confirmation will be
          integrated here without modifying existing calculation rules.
        </Paragraph>
      </Card>
    </div>
  );
};
