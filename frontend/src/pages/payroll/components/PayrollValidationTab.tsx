import React, { useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Alert,
  Typography,
  Button,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Payroll, PayrollPeriod, PayrollValidationIssue } from '../../../types/payroll';
import { Employee } from '../../../types/employee';

const { Title, Text } = Typography;

interface PayrollValidationTabProps {
  activePeriod: PayrollPeriod | null;
  payrolls: Payroll[];
  allEmployees: Employee[];
  onRefresh: () => void;
  onSelectEmployee?: (payrollId: number) => void;
}

export const PayrollValidationTab: React.FC<PayrollValidationTabProps> = ({
  activePeriod,
  payrolls,
  allEmployees,
  onRefresh,
  onSelectEmployee: _onSelectEmployee,
}) => {
  // Comprehensive automated validation scan
  const issues = useMemo<PayrollValidationIssue[]>(() => {
    const list: PayrollValidationIssue[] = [];

    if (!activePeriod) return list;

    // 1. Period has 0 records check
    if (activePeriod.status !== 'DRAFT' && payrolls.length === 0) {
      list.push({
        id: 'no-records',
        type: 'ERROR',
        category: 'DATA_INCONSISTENCY',
        message: 'No employee payroll records exist for this period. Run calculation to generate records.',
        blocking: true,
      });
    }

    // 2. Active employees without compensation / skipped in calculation
    const activeStaff = allEmployees.filter((e) => e.status === 'ACTIVE');
    const processedEmpIds = new Set(payrolls.map((p) => p.employeeId));

    activeStaff.forEach((emp) => {
      if (!processedEmpIds.has(emp.id)) {
        list.push({
          id: `missing-comp-${emp.id}`,
          type: 'ERROR',
          category: 'MISSING_COMPENSATION',
          employeeId: emp.id,
          employeeCode: emp.employeeId,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          departmentName: emp.department?.name,
          message:
            'Active employee was skipped during calculation because no active compensation record was defined.',
          blocking: true,
        });
      }
    });

    // 3. Scan each payroll record for anomalies
    const seenEmpIds = new Set<number>();

    payrolls.forEach((p) => {
      const emp = p.employee;
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : `EMP #${p.employeeId}`;

      // Duplicate entries
      if (seenEmpIds.has(p.employeeId)) {
        list.push({
          id: `dup-${p.id}`,
          type: 'ERROR',
          category: 'DUPLICATE_ENTRY',
          employeeId: p.employeeId,
          employeeCode: emp?.employeeId,
          employeeName: empName,
          departmentName: emp?.department?.name,
          message: 'Duplicate payroll entry detected for the same employee in this period.',
          blocking: true,
        });
      }
      seenEmpIds.add(p.employeeId);

      // Unexpected negative or zero net salary
      if (p.netSalary <= 0) {
        list.push({
          id: `zero-net-${p.id}`,
          type: 'ERROR',
          category: 'ZERO_OR_NEGATIVE_NET',
          employeeId: p.employeeId,
          employeeCode: emp?.employeeId,
          employeeName: empName,
          departmentName: emp?.department?.name,
          message: `Net salary is non-positive ($${p.netSalary.toFixed(2)}). Deductions exceed gross pay.`,
          blocking: true,
        });
      }

      // Review Warning: Deductions exceed 40% of gross
      const gross = (p.basicSalary || 0) + (p.totalAllowances || 0) + (p.totalOvertime || 0);
      if (gross > 0 && p.totalDeductions > gross * 0.4) {
        list.push({
          id: `high-ded-${p.id}`,
          type: 'WARNING',
          category: 'DATA_INCONSISTENCY',
          employeeId: p.employeeId,
          employeeCode: emp?.employeeId,
          employeeName: empName,
          departmentName: emp?.department?.name,
          message: `High deduction ratio: Total deductions ($${p.totalDeductions.toFixed(2)}) exceed 40% of gross pay ($${gross.toFixed(2)}).`,
          blocking: false,
        });
      }

      // Review Warning: Manual adjustments attached
      if (p.adjustments && p.adjustments.length > 0) {
        list.push({
          id: `adj-${p.id}`,
          type: 'WARNING',
          category: 'DATA_INCONSISTENCY',
          employeeId: p.employeeId,
          employeeCode: emp?.employeeId,
          employeeName: empName,
          departmentName: emp?.department?.name,
          message: `Record contains ${p.adjustments.length} manual adjustment(s) applied post-calculation. Verify justification before approval.`,
          blocking: false,
        });
      }

      // Review Warning: High overtime ratio (> 50% of base)
      if (p.basicSalary > 0 && p.totalOvertime > p.basicSalary * 0.5) {
        list.push({
          id: `high-ot-${p.id}`,
          type: 'WARNING',
          category: 'UNAPPROVED_OVERTIME',
          employeeId: p.employeeId,
          employeeCode: emp?.employeeId,
          employeeName: empName,
          departmentName: emp?.department?.name,
          message: `High overtime disbursement: Overtime ($${p.totalOvertime.toFixed(2)}) exceeds 50% of base salary ($${p.basicSalary.toFixed(2)}). Verify timesheet approval.`,
          blocking: false,
        });
      }
    });

    return list;
  }, [activePeriod, payrolls, allEmployees]);

  const blockingErrors = issues.filter((i) => i.blocking);
  const reviewWarnings = issues.filter((i) => !i.blocking);
  const hasBlockingErrors = blockingErrors.length > 0;

  const columns = [
    {
      title: 'Severity',
      key: 'severity',
      width: 140,
      render: (_: any, record: PayrollValidationIssue) =>
        record.blocking ? (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Blocking Error
          </Tag>
        ) : (
          <Tag color="warning" icon={<ExclamationCircleOutlined />}>
            Review Warning
          </Tag>
        ),
    },
    {
      title: 'Issue Category',
      dataIndex: 'category',
      key: 'category',
      width: 200,
      render: (val: string) => <Text code>{val}</Text>,
    },
    {
      title: 'Employee / Department',
      key: 'target',
      width: 220,
      render: (_: any, record: PayrollValidationIssue) => (
        <div>
          <Text strong>{record.employeeName || '—'}</Text>
          {record.employeeCode && (
            <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
              {record.employeeCode} {record.departmentName ? `• ${record.departmentName}` : ''}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Validation Diagnostic & Guidance',
      dataIndex: 'message',
      key: 'message',
      render: (val: string, record: PayrollValidationIssue) => (
        <div>
          <Text>{val}</Text>
          {record.blocking && (
            <Text type="danger" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
              Action Required: Resolve this issue before submitting payroll for review.
            </Text>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Top Health Status Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card variant="outlined">
            <Statistic
              title="Validation Status"
              value={hasBlockingErrors ? 'Action Required' : 'Validation Cleared'}
              valueStyle={{
                color: hasBlockingErrors ? '#ff4d4f' : '#52c41a',
                fontSize: 20,
              }}
              prefix={
                hasBlockingErrors ? (
                  <CloseCircleOutlined />
                ) : (
                  <SafetyCertificateOutlined />
                )
              }
            />
          </Card>
        </Col>

        <Col xs={12} sm={8}>
          <Card variant="outlined">
            <Statistic
              title="Blocking Errors (Blocks Submission)"
              value={blockingErrors.length}
              valueStyle={{ color: blockingErrors.length > 0 ? '#ff4d4f' : undefined }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8}>
          <Card variant="outlined">
            <Statistic
              title="Review Warnings (Human Audit)"
              value={reviewWarnings.length}
              valueStyle={{ color: reviewWarnings.length > 0 ? '#fa8c16' : undefined }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Alert Banner */}
      {hasBlockingErrors ? (
        <Alert
          title={`Payroll Submission Blocked: ${blockingErrors.length} Mandatory Exception(s)`}
          description="You cannot submit this payroll period to the Head of HR until all blocking errors have been resolved. Check missing compensation records or non-positive net salaries below."
          type="error"
          showIcon
          style={{ marginBottom: 20 }}
          action={
            <Button size="small" danger onClick={onRefresh} icon={<ReloadOutlined />}>
              Re-scan Validation
            </Button>
          }
        />
      ) : reviewWarnings.length > 0 ? (
        <Alert
          title="Validation Passed with Audit Warnings"
          description="No blocking errors found. The payroll period may be submitted, but please review the advisory items below before proceeding."
          type="warning"
          showIcon
          style={{ marginBottom: 20 }}
        />
      ) : (
        <Alert
          title="All Automated Payroll Integrity Checks Passed"
          description="Every active employee compensation record, timesheet overtime, and calculated net payout is clean and verified."
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Exceptions Table */}
      <Card
        variant="outlined"
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Pre-Submission Integrity Exceptions Log</span>
            <Button icon={<ReloadOutlined />} onClick={onRefresh} size="small">
              Refresh Integrity Scan
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={issues}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <CheckCircleOutlined style={{ fontSize: 36, color: '#52c41a', marginBottom: 12 }} />
                <Title level={5}>Zero Exceptions Found</Title>
                <Text type="secondary">All payroll inputs and calculation totals comply with governance rules.</Text>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};
