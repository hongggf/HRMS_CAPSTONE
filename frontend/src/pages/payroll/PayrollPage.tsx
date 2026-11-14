import React, { useState } from 'react';
import {
  Button,
  Tag,
  Card,
  Statistic,
  Space,
  Alert,
  Select,
  Row,
  Col,
  Typography,
  Popconfirm,
  Tabs,
  Steps,
  message,
} from 'antd';
import {
  DollarOutlined,
  PlusOutlined,
  CalculatorOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  ReloadOutlined,
  AuditOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '../../api/payroll';
import { departmentApi } from '../../api/organization';
import { employeeApi } from '../../api/employee';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Payroll,
  PayrollPeriodStatus,
  CreateAdjustmentInput,
} from '../../types/payroll';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDateOnly } from '../../utils/dateUtils';
import { normalizeApiError } from '../../api/client';

import {
  OfficialPayslipDrawer,
  getStatusTag,
} from './components/OfficialPayslipDrawer';
import { CalculationInspectorDrawer } from './components/CalculationInspectorDrawer';
import { PayrollRegisterTable } from './components/PayrollRegisterTable';
import { PayrollPeriodManager } from './components/PayrollPeriodManager';
import { PayrollValidationTab } from './components/PayrollValidationTab';
import { PayrollReportsTab } from './components/PayrollReportsTab';
import { MyPayslipsTab } from './components/MyPayslipsTab';
import { CreatePeriodModal } from './components/CreatePeriodModal';
import { AdjustmentModal } from './components/AdjustmentModal';
import { RejectPeriodModal } from './components/RejectPeriodModal';

const { Title, Text, Paragraph } = Typography;

export { getStatusTag };

export const PayrollPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isHeadOfHr = user?.roles?.includes('HEAD_OF_HR') || false;
  const isPayrollOfficer = user?.roles?.includes('HR_PAYROLL') || false;
  const hasPayrollCreate =
    isHeadOfHr ||
    isPayrollOfficer ||
    user?.permissions?.includes('PAYROLL_CREATE') ||
    false;
  const hasPayrollLock =
    isHeadOfHr || user?.permissions?.includes('PAYROLL_LOCK') || false;
  const hasPayrollRead =
    isHeadOfHr ||
    isPayrollOfficer ||
    user?.permissions?.includes('PAYROLL_READ') ||
    false;

  // Selected Active Period State
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [activeTabKey, setActiveTabKey] = useState<string>('register');

  // Modals & Drawers State
  const [isCreatePeriodModalOpen, setIsCreatePeriodModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [activePayslipId, setActivePayslipId] = useState<number | null>(null);
  const [inspectingPayroll, setInspectingPayroll] = useState<Payroll | null>(
    null,
  );
  const [adjustmentTargetPayroll, setAdjustmentTargetPayroll] =
    useState<Payroll | null>(null);

  // Query: Payroll Periods List
  const {
    data: periods = [],
    isLoading: isPeriodsLoading,
    isError: isPeriodsError,
    error: periodsError,
  } = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: payrollApi.getPeriods,
    staleTime: 30000,
  });

  // Effective selected period: default to first in list if none selected
  const activePeriod =
    periods.find((p) => p.id === selectedPeriodId) || periods[0] || null;
  const currentPeriodId = activePeriod?.id || null;

  // Query: Payrolls for selected period
  const {
    data: payrolls = [],
    isLoading: isPayrollsLoading,
    isError: isPayrollsError,
    error: payrollsError,
  } = useQuery({
    queryKey: ['payroll-records', currentPeriodId],
    queryFn: () =>
      currentPeriodId
        ? payrollApi.getPayrollsByPeriod(currentPeriodId)
        : Promise.resolve([]),
    enabled: currentPeriodId !== null,
    staleTime: 30000,
  });

  // Query: Active Payslip Detail
  const {
    data: payslipDetail,
    isLoading: isPayslipLoading,
    error: payslipError,
  } = useQuery({
    queryKey: ['payslip-detail', activePayslipId],
    queryFn: () =>
      activePayslipId
        ? payrollApi.getPayslip(activePayslipId)
        : Promise.resolve(null),
    enabled: activePayslipId !== null,
    staleTime: 0,
  });

  // Query: Departments
  const { data: deptData } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => departmentApi.list({ limit: 100 }),
    staleTime: 60000,
  });
  const departments = deptData?.departments || [];

  // Query: Employees for validation checks
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees-directory'],
    queryFn: employeeApi.list,
    staleTime: 60000,
  });

  // Global Refresh Helper
  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    if (currentPeriodId) {
      await queryClient.invalidateQueries({
        queryKey: ['payroll-records', currentPeriodId],
      });
    }
    await queryClient.invalidateQueries({
      queryKey: ['payroll-report-metrics'],
    });
    await queryClient.invalidateQueries({ queryKey: ['my-payslips'] });
  };

  // Mutation: Create Period
  const createPeriodMutation = useMutation({
    mutationFn: payrollApi.createPeriod,
    onSuccess: (newPeriod) => {
      message.success(
        `Payroll period "${newPeriod.name}" created successfully`,
      );
      setIsCreatePeriodModalOpen(false);
      setSelectedPeriodId(newPeriod.id);
      refreshAll();
    },
    onError: (err) => {
      const parsed = normalizeApiError(err);
      message.error(parsed.message || 'Failed to create payroll period');
    },
  });

  // Mutation: Calculate Payroll
  const calculateMutation = useMutation({
    mutationFn: (periodId: number) => payrollApi.calculatePayroll(periodId),
    onSuccess: (res) => {
      message.success(res.message || 'Payroll calculated successfully');
      refreshAll();
    },
    onError: (err) => {
      const parsed = normalizeApiError(err);
      message.error(parsed.message || 'Calculation failed');
      refreshAll();
    },
  });

  // Mutation: Submit Payroll
  const submitMutation = useMutation({
    mutationFn: (periodId: number) => payrollApi.submitPayroll(periodId),
    onSuccess: () => {
      message.success('Payroll period submitted for Head of HR review');
      refreshAll();
    },
    onError: (err) => {
      const parsed = normalizeApiError(err);
      message.error(parsed.message || 'Failed to submit payroll period');
      refreshAll();
    },
  });

  // Mutation: Approve Payroll
  const approveMutation = useMutation({
    mutationFn: (periodId: number) => payrollApi.approvePayroll(periodId),
    onSuccess: () => {
      message.success('Payroll period approved successfully');
      refreshAll();
    },
    onError: (err) => {
      const parsed = normalizeApiError(err);
      message.error(parsed.message || 'Approval failed');
      refreshAll();
    },
  });

  // Mutation: Reject Payroll
  const rejectMutation = useMutation({
    mutationFn: ({
      periodId,
      comments,
    }: {
      periodId: number;
      comments: string;
    }) => payrollApi.rejectPayroll(periodId, comments),
    onSuccess: () => {
      message.success('Payroll period rejected');
      setIsRejectModalOpen(false);
      refreshAll();
    },
    onError: (err) => {
      const parsed = normalizeApiError(err);
      message.error(parsed.message || 'Rejection failed');
      refreshAll();
    },
  });

  // Mutation: Lock Payroll
  const lockMutation = useMutation({
    mutationFn: (periodId: number) => payrollApi.lockPayroll(periodId),
    onSuccess: () => {
      message.success('Payroll period locked and finalized');
      refreshAll();
    },
    onError: (err) => {
      const parsed = normalizeApiError(err);
      message.error(parsed.message || 'Failed to lock payroll period');
      refreshAll();
    },
  });

  // Mutation: Create Adjustment
  const createAdjustmentMutation = useMutation({
    mutationFn: ({
      payrollId,
      payload,
    }: {
      payrollId: number;
      payload: CreateAdjustmentInput;
    }) => payrollApi.createAdjustment(payrollId, payload),
    onSuccess: () => {
      message.success('Payroll adjustment saved successfully');
      setAdjustmentTargetPayroll(null);
      refreshAll();
    },
    onError: (err) => {
      const parsed = normalizeApiError(err);
      message.error(parsed.message || 'Failed to apply adjustment');
    },
  });

  // Aggregate Figures
  const totalEmployees = payrolls.length;
  const totalBasic = payrolls.reduce((sum, p) => sum + (p.basicSalary || 0), 0);
  const totalAllowances = payrolls.reduce(
    (sum, p) => sum + (p.totalAllowances || 0),
    0,
  );
  const totalOvertime = payrolls.reduce(
    (sum, p) => sum + (p.totalOvertime || 0),
    0,
  );
  const totalGross = totalBasic + totalAllowances + totalOvertime;
  const totalDeductions = payrolls.reduce(
    (sum, p) => sum + (p.totalDeductions || 0),
    0,
  );
  const totalNet = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

  // Check for blocking validation errors (e.g. employee with net <= 0)
  const hasBlockingValidationIssue = payrolls.some((p) => p.netSalary <= 0);

  // Uncalculated active employees (onboarded or activated after current calculation run)
  const uncalculatedActiveEmployees = React.useMemo(() => {
    if (!activePeriod || activePeriod.status === 'DRAFT') return [];
    const processedEmpIds = new Set(payrolls.map((p) => p.employeeId));
    return allEmployees.filter(
      (e) => e.status === 'ACTIVE' && !processedEmpIds.has(e.id),
    );
  }, [activePeriod, payrolls, allEmployees]);

  // Lifecycle Action Guard Conditions
  const status = activePeriod?.status;
  const isLocked = status === 'LOCKED' || status === 'PAID';
  const isApproved = status === 'APPROVED';
  const isPendingApproval = status === 'PENDING_APPROVAL';
  const isCalculated = status === 'CALCULATED';
  const isDraft = status === 'DRAFT';
  const isRejected = status === 'REJECTED';
  const isCalculating = status === 'CALCULATING' || calculateMutation.isPending;

  // Calculation is allowed if DRAFT, CALCULATED, or REJECTED
  const canTriggerCalculation =
    hasPayrollCreate &&
    !isLocked &&
    !isPendingApproval &&
    !isApproved &&
    !isCalculating;

  // Submission is allowed if CALCULATED and has employees
  const canSubmit = hasPayrollCreate && isCalculated && totalEmployees > 0;

  // Review (Approve/Reject) is allowed only for HEAD_OF_HR when PENDING_APPROVAL
  const canReview = isHeadOfHr && isPendingApproval;

  // Locking is allowed for user with PAYROLL_LOCK when period is APPROVED
  const canLockPeriod = hasPayrollLock && isApproved;

  const isMutating =
    calculateMutation.isPending ||
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    lockMutation.isPending;

  // Lifecycle Stepper calculation
  const getStepCurrent = (st?: PayrollPeriodStatus) => {
    switch (st) {
      case 'DRAFT':
        return 0;
      case 'CALCULATING':
        return 1;
      case 'CALCULATED':
        return 2;
      case 'PENDING_APPROVAL':
        return 3;
      case 'APPROVED':
        return 4;
      case 'LOCKED':
      case 'PAID':
        return 5;
      case 'REJECTED':
        return 2; // Returns to calculated/draft phase
      default:
        return 0;
    }
  };

  // Pending approval counts across all periods
  const pendingApprovalsCount = periods.filter(
    (p) => p.status === 'PENDING_APPROVAL',
  ).length;

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Executive Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          background: '#fff',
          padding: '20px 24px',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <DollarOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            Payroll Management & Governance
          </Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
            Authoritative payroll periods, multi-employee calculation execution,
            executive approval workflow, and immutable period locking.
          </Paragraph>
        </div>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refreshAll()}
            loading={isPeriodsLoading || isPayrollsLoading}
          >
            Refresh
          </Button>
          {hasPayrollCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsCreatePeriodModalOpen(true)}
            >
              New Payroll Period
            </Button>
          )}
        </Space>
      </div>

      {/* Pending Executive Action Alert */}
      {isHeadOfHr && pendingApprovalsCount > 0 && (
        <Alert
          title={`Executive Action Required: ${pendingApprovalsCount} Payroll Period(s) Pending Final Approval`}
          description="A prepared payroll period has been submitted for your review. Please inspect the register, examine audit items, and approve or reject disbursement."
          type="info"
          showIcon
          icon={<SafetyCertificateOutlined />}
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Global Error Banner */}
      {(isPeriodsError || isPayrollsError) && (
        <Alert
          title="Data Loading Error"
          description={
            normalizeApiError(periodsError || payrollsError).message ||
            'Failed to load payroll data from server'
          }
          type="error"
          showIcon
          closable
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Period Selection & Workflow Controller Bar */}
      <Card variant="outlined" style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong>Active Payroll Period:</Text>
              <Select
                style={{ width: '100%', maxWidth: 420 }}
                value={activePeriod?.id}
                loading={isPeriodsLoading}
                placeholder="Select a payroll period..."
                onChange={(val) => setSelectedPeriodId(val)}
                options={periods.map((p) => ({
                  value: p.id,
                  label: (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>{p.name}</span>
                      <span>{getStatusTag(p.status)}</span>
                    </div>
                  ),
                }))}
              />
            </Space>
          </Col>

          <Col xs={24} md={14} style={{ textAlign: 'right' }}>
            {activePeriod && (
              <Space wrap size="small">
                {/* Calculate Trigger */}
                {canTriggerCalculation && (
                  <Popconfirm
                    title="Calculate Payroll"
                    description="Run official calculation for all active employees based on approved base compensation, components, and timesheets?"
                    onConfirm={() => calculateMutation.mutate(activePeriod.id)}
                    okText="Yes, Calculate"
                    cancelText="Cancel"
                  >
                    <Button
                      icon={<CalculatorOutlined />}
                      type="primary"
                      ghost
                      loading={calculateMutation.isPending}
                      disabled={isMutating}
                    >
                      {isDraft ? 'Calculate Payroll' : 'Recalculate Payroll'}
                    </Button>
                  </Popconfirm>
                )}

                {/* Submit for Review */}
                {canSubmit && (
                  <Popconfirm
                    title="Submit for Executive Review"
                    description={
                      hasBlockingValidationIssue
                        ? 'Warning: Exceptions exist in calculation (e.g. non-positive net salaries). Are you sure you wish to submit?'
                        : 'Submit calculated payroll figures to Head of HR for final approval?'
                    }
                    onConfirm={() => submitMutation.mutate(activePeriod.id)}
                    okText="Yes, Submit"
                    cancelText="Cancel"
                  >
                    <Button
                      icon={<SendOutlined />}
                      type="primary"
                      loading={submitMutation.isPending}
                      disabled={isMutating}
                    >
                      Submit for Review
                    </Button>
                  </Popconfirm>
                )}

                {/* Head of HR Approval */}
                {canReview && (
                  <Popconfirm
                    title="Approve Payroll Period"
                    description="Authorize this payroll disbursement? Once approved, the period can be finalized and locked."
                    onConfirm={() => approveMutation.mutate(activePeriod.id)}
                    okText="Approve"
                    cancelText="Cancel"
                  >
                    <Button
                      icon={<CheckCircleOutlined />}
                      type="primary"
                      style={{ background: '#52c41a', borderColor: '#52c41a' }}
                      loading={approveMutation.isPending}
                      disabled={isMutating}
                    >
                      Approve Payroll
                    </Button>
                  </Popconfirm>
                )}

                {/* Head of HR Rejection */}
                {canReview && (
                  <Button
                    icon={<CloseCircleOutlined />}
                    danger
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={isMutating}
                  >
                    Reject Payroll
                  </Button>
                )}

                {/* Period Locking (High Impact Operation) */}
                {canLockPeriod && (
                  <Popconfirm
                    title="Lock Payroll Period"
                    description="CAUTION: Locking is irreversible. Locked periods cannot be modified, recalculated, or unlocked. Proceed?"
                    onConfirm={() => lockMutation.mutate(activePeriod.id)}
                    okText="Confirm & Lock"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      icon={<LockOutlined />}
                      danger
                      loading={lockMutation.isPending}
                      disabled={isMutating}
                    >
                      Lock Period
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            )}
          </Col>
        </Row>

        {/* Selected Period Meta Notice */}
        {activePeriod && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            <div>
              <Text type="secondary">Date Range: </Text>
              <Text strong>
                {formatDateOnly(activePeriod.startDate)} ~{' '}
                {formatDateOnly(activePeriod.endDate)}
              </Text>
            </div>
            <div>
              <Text type="secondary">Current Status: </Text>
              {getStatusTag(activePeriod.status)}
            </div>
            {isLocked && (
              <Tag icon={<LockOutlined />} color="purple">
                Immutable Financial Record
              </Tag>
            )}
            {isRejected && (
              <Tag icon={<ExclamationCircleOutlined />} color="error">
                Rejected (Recalculation Required)
              </Tag>
            )}
            {activePeriod.approvals && activePeriod.approvals.length > 0 && (
              <div>
                <Text type="secondary">Latest Audit: </Text>
                <Text style={{ fontSize: 12 }}>
                  {activePeriod.approvals[0].status} by{' '}
                  {activePeriod.approvals[0].approvedBy?.email || 'Officer'}
                </Text>
              </div>
            )}
          </div>
        )}

        {/* Visual Lifecycle Stepper */}
        {activePeriod && (
          <div style={{ marginTop: 20 }}>
            <Steps
              size="small"
              current={getStepCurrent(activePeriod.status)}
              status={activePeriod.status === 'REJECTED' ? 'error' : undefined}
              items={[
                { title: 'Draft' },
                { title: 'Calculating' },
                { title: 'Calculated' },
                { title: 'Executive Review' },
                { title: 'Approved' },
                { title: 'Locked & Paid' },
              ]}
            />
          </div>
        )}
      </Card>

      {/* KPI Financial Overview Cards */}
      {activePeriod && (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={8} lg={4}>
            <Card variant="outlined">
              <Statistic
                title="Total Employees"
                value={formatNumber(totalEmployees)}
                prefix={<AuditOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card variant="outlined">
              <Statistic
                title="Gross Payroll Total"
                value={formatCurrency(totalGross)}
                styles={{ content: { color: '#389e0d', fontSize: 20 } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card variant="outlined">
              <Statistic
                title="Basic Salary"
                value={formatCurrency(totalBasic)}
                styles={{ content: { fontSize: 20 } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card variant="outlined">
              <Statistic
                title="Allowances & OT"
                value={formatCurrency(totalAllowances + totalOvertime)}
                styles={{ content: { color: '#52c41a', fontSize: 20 } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card variant="outlined">
              <Statistic
                title="Total Deductions"
                value={formatCurrency(totalDeductions)}
                styles={{ content: { color: '#ff4d4f', fontSize: 20 } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8} lg={4}>
            <Card
              variant="outlined"
              style={{ background: '#e6f4ff', borderColor: '#91caff' }}
            >
              <Statistic
                title="Total Net Payout"
                value={formatCurrency(totalNet)}
                styles={{
                  content: { color: '#0958d9', fontWeight: 600, fontSize: 20 },
                }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Module Tabs */}
      <Tabs
        type="card"
        destroyInactiveTabPane={false}
        activeKey={activeTabKey}
        onChange={(k) => setActiveTabKey(k)}
        items={[
          {
            key: 'register',
            label: (
              <span>
                <FileTextOutlined /> Payroll Register & Calculation
              </span>
            ),
            children: (
              <>
                {/* Out of Sync / Uncalculated Personnel Alert */}
                {uncalculatedActiveEmployees.length > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={`${uncalculatedActiveEmployees.length} Active Personnel Pending Recalculation`}
                    description={
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <span>
                          New personnel (
                          {uncalculatedActiveEmployees
                            .map((e) => `${e.firstName} ${e.lastName}`)
                            .join(', ')}
                          ) were onboarded after this period was calculated. Click
                          "Recalculate Payroll" to incorporate them.
                        </span>
                        {canTriggerCalculation && (
                          <Button
                            size="small"
                            type="primary"
                            icon={<CalculatorOutlined />}
                            loading={calculateMutation.isPending}
                            onClick={() =>
                              activePeriod &&
                              calculateMutation.mutate(activePeriod.id)
                            }
                          >
                            Recalculate Payroll Now
                          </Button>
                        )}
                      </div>
                    }
                  />
                )}

                {/* Cambodia Statutory Guidelines & Compliance Alert */}
                <Card
                  size="small"
                  variant="outlined"
                  style={{
                    marginBottom: 16,
                    background: '#fcf8e3',
                    borderColor: '#faebcc',
                  }}
                >
                  <Space align="start">
                    <SafetyCertificateOutlined
                      style={{ color: '#8a6d3b', fontSize: 16, marginTop: 2 }}
                    />
                    <div>
                      <Text strong style={{ color: '#8a6d3b' }}>
                        Cambodia Statutory Payroll & Labor Law Compliance
                        Standard
                      </Text>
                      <Paragraph
                        style={{
                          margin: '4px 0 0',
                          fontSize: 12,
                          color: '#8a6d3b',
                        }}
                      >
                        Compensation formulas rely on configurable salary
                        components rather than hardcoded statutory assumptions.
                        In accordance with the Ministry of Economy and Finance
                        (MEF) and National Social Security Fund (NSSF)
                        regulations, Tax on Salary (TOS) and employer/employee
                        contributions (Health Care, Occupational Risk, Pension)
                        must follow verified government tables. Employer costs
                        are strictly isolated from employee deductions. Overtime
                        is payable only from approved timesheets at 1.5x base
                        hourly rate.
                      </Paragraph>
                    </div>
                  </Space>
                </Card>

                {/* Main Register Table */}
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
                      <span>
                        {activePeriod
                          ? `Disbursement Sheet: ${activePeriod.name}`
                          : 'Payroll Records'}
                      </span>
                      {activePeriod && (
                        <Text
                          type="secondary"
                          style={{ fontSize: 13, fontWeight: 'normal' }}
                        >
                          {totalEmployees} records found
                        </Text>
                      )}
                    </div>
                  }
                >
                  {isDraft && totalEmployees === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                      <CalculatorOutlined
                        style={{
                          fontSize: 48,
                          color: '#1677ff',
                          marginBottom: 16,
                        }}
                      />
                      <Title level={4}>Payroll Not Yet Calculated</Title>
                      <Paragraph
                        type="secondary"
                        style={{ maxWidth: 480, margin: '0 auto 20px' }}
                      >
                        This payroll period is currently in Draft. Click
                        &ldquo;Calculate Payroll&rdquo; above to automatically
                        process compensation, salary components, and timesheet
                        overtime for all eligible active staff.
                      </Paragraph>
                      {canTriggerCalculation && (
                        <Button
                          type="primary"
                          icon={<CalculatorOutlined />}
                          loading={calculateMutation.isPending}
                          onClick={() =>
                            calculateMutation.mutate(activePeriod.id)
                          }
                        >
                          Calculate Payroll Now
                        </Button>
                      )}
                    </div>
                  ) : (
                    <PayrollRegisterTable
                      payrolls={payrolls}
                      departments={departments}
                      isLoading={
                        isPayrollsLoading || calculateMutation.isPending
                      }
                      hasPayrollCreate={hasPayrollCreate}
                      isLocked={isLocked}
                      isHeadOfHr={isHeadOfHr}
                      onViewPayslip={(id) => setActivePayslipId(id)}
                      onInspectCalculation={(p) => setInspectingPayroll(p)}
                      onOpenAdjustment={(p) => setAdjustmentTargetPayroll(p)}
                    />
                  )}
                </Card>
              </>
            ),
          },
          {
            key: 'periods',
            label: (
              <span>
                <CalendarOutlined /> Periods & Lifecycle
              </span>
            ),
            children: (
              <PayrollPeriodManager
                periods={periods}
                activePeriodId={currentPeriodId}
                onSelectPeriod={(id) => setSelectedPeriodId(id)}
                onOpenCreateModal={() => setIsCreatePeriodModalOpen(true)}
                hasPayrollCreate={hasPayrollCreate}
                isLoading={isPeriodsLoading}
              />
            ),
          },
          {
            key: 'validation',
            label: (
              <span>
                <SafetyCertificateOutlined /> Pre-Submission Validation
                {hasBlockingValidationIssue && (
                  <Tag color="error" style={{ marginLeft: 6 }}>
                    Blocked
                  </Tag>
                )}
              </span>
            ),
            children: (
              <PayrollValidationTab
                activePeriod={activePeriod}
                payrolls={payrolls}
                allEmployees={allEmployees}
                onRefresh={() => refreshAll()}
                onSelectEmployee={(id) => setActivePayslipId(id)}
                onRecalculate={() =>
                  activePeriod && calculateMutation.mutate(activePeriod.id)
                }
                isRecalculating={calculateMutation.isPending}
                isHeadOfHr={isHeadOfHr}
              />
            ),
          },
          {
            key: 'reports',
            label: (
              <span>
                <BarChartOutlined /> Reports & Analytics
              </span>
            ),
            children: (
              <PayrollReportsTab
                activePeriod={activePeriod}
                payrolls={payrolls}
                isAuthorized={hasPayrollRead}
                isHeadOfHr={isHeadOfHr}
              />
            ),
          },
          {
            key: 'my-payslips',
            label: (
              <span>
                <UserOutlined /> My Payslips (Self-Service)
              </span>
            ),
            children: <MyPayslipsTab />,
          },
        ]}
      />

      {/* Modal: Create Payroll Period */}
      <CreatePeriodModal
        open={isCreatePeriodModalOpen}
        onCancel={() => setIsCreatePeriodModalOpen(false)}
        onSubmit={(values) => createPeriodMutation.mutate(values)}
        loading={createPeriodMutation.isPending}
      />

      {/* Modal: Head of HR Rejection Comments */}
      <RejectPeriodModal
        period={activePeriod}
        open={isRejectModalOpen}
        onCancel={() => setIsRejectModalOpen(false)}
        onConfirm={(periodId, comments) =>
          rejectMutation.mutate({ periodId, comments })
        }
        loading={rejectMutation.isPending}
      />

      {/* Modal: Manual Payroll Adjustment */}
      <AdjustmentModal
        payroll={adjustmentTargetPayroll}
        open={adjustmentTargetPayroll !== null}
        onCancel={() => setAdjustmentTargetPayroll(null)}
        onSubmit={(payrollId, payload) =>
          createAdjustmentMutation.mutate({ payrollId, payload })
        }
        loading={createAdjustmentMutation.isPending}
        isLocked={isLocked}
      />

      {/* Drawer: Detailed Official Payslip View */}
      <OfficialPayslipDrawer
        open={activePayslipId !== null}
        onClose={() => setActivePayslipId(null)}
        payroll={payslipDetail || null}
        isLoading={isPayslipLoading}
        error={payslipError}
        isHeadOfHr={isHeadOfHr}
      />

      {/* Drawer: Calculation Inspector */}
      <CalculationInspectorDrawer
        open={inspectingPayroll !== null}
        onClose={() => setInspectingPayroll(null)}
        payroll={inspectingPayroll}
        isHeadOfHr={isHeadOfHr}
      />
    </div>
  );
};

export default PayrollPage;
