import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Drawer,
  Timeline,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { PayrollPeriod, PayrollPeriodStatus } from '../../../types/payroll';
import { formatDateOnly } from '../../../utils/dateUtils';
import { getStatusTag } from './OfficialPayslipDrawer';

const { Title, Text, Paragraph } = Typography;

interface PayrollPeriodManagerProps {
  periods: PayrollPeriod[];
  activePeriodId: number | null;
  onSelectPeriod: (id: number) => void;
  onOpenCreateModal: () => void;
  hasPayrollCreate: boolean;
  isLoading: boolean;
}

export const PayrollPeriodManager: React.FC<PayrollPeriodManagerProps> = ({
  periods,
  activePeriodId,
  onSelectPeriod,
  onOpenCreateModal,
  hasPayrollCreate,
  isLoading,
}) => {
  const [inspectedPeriod, setInspectedPeriod] = useState<PayrollPeriod | null>(null);

  const columns = [
    {
      title: 'Period Name',
      dataIndex: 'name',
      key: 'name',
      render: (val: string, record: PayrollPeriod) => (
        <Space>
          <Text strong>{val}</Text>
          {record.id === activePeriodId && <Tag color="blue">Active Selected</Tag>}
        </Space>
      ),
    },
    {
      title: 'Lifecycle Status',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (val: PayrollPeriodStatus) => getStatusTag(val),
    },
    {
      title: 'Date Range',
      key: 'dates',
      render: (_: any, record: PayrollPeriod) => (
        <Text>
          {formatDateOnly(record.startDate)} ~ {formatDateOnly(record.endDate)}
        </Text>
      ),
    },
    {
      title: 'Processed Staff',
      dataIndex: ['_count', 'payrolls'],
      key: 'count',
      align: 'center' as const,
      width: 140,
      render: (val?: number) => (
        <Tag color="cyan">{val !== undefined ? `${val} records` : '0 records'}</Tag>
      ),
    },
    {
      title: 'Executive Approver',
      key: 'approver',
      render: (_: any, record: PayrollPeriod) => {
        const latestApproval = record.approvals?.[0];
        if (!latestApproval) return <Text type="secondary">—</Text>;
        return (
          <div>
            <Text style={{ fontSize: 13 }}>
              {latestApproval.approvedBy?.email || `User #${latestApproval.approvedById}`}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
              {formatDateOnly(latestApproval.date)}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      width: 220,
      render: (_: any, record: PayrollPeriod) => (
        <Space size="small">
          {record.id !== activePeriodId ? (
            <Button
              size="small"
              type="primary"
              ghost
              onClick={() => onSelectPeriod(record.id)}
            >
              Select Active
            </Button>
          ) : (
            <Button size="small" disabled>
              Current
            </Button>
          )}
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setInspectedPeriod(record)}
          >
            History & Audit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        variant="outlined"
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <CalendarOutlined style={{ color: '#1677ff' }} />
              <span>Payroll Periods Lifecycle Governance</span>
            </Space>
            {hasPayrollCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={onOpenCreateModal}>
                New Payroll Period
              </Button>
            )}
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={periods}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Period Details & Audit Trail Drawer */}
      <Drawer
        title="Payroll Period Audit & Governance Log"
        size={600}
        open={inspectedPeriod !== null}
        onClose={() => setInspectedPeriod(null)}
      >
        {inspectedPeriod && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <Title level={4} style={{ margin: 0 }}>
                {inspectedPeriod.name}
              </Title>
              <div style={{ marginTop: 6 }}>
                {getStatusTag(inspectedPeriod.status)}
              </div>
            </div>

            <Card size="small" variant="outlined" style={{ marginBottom: 20 }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Period ID">
                  #{inspectedPeriod.id}
                </Descriptions.Item>
                <Descriptions.Item label="Start Date">
                  {formatDateOnly(inspectedPeriod.startDate)}
                </Descriptions.Item>
                <Descriptions.Item label="End Date">
                  {formatDateOnly(inspectedPeriod.endDate)}
                </Descriptions.Item>
                <Descriptions.Item label="Total Records">
                  {inspectedPeriod._count?.payrolls || 0} employees
                </Descriptions.Item>
                <Descriptions.Item label="System Created">
                  {new Date(inspectedPeriod.createdAt).toLocaleString()}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Title level={5} style={{ marginBottom: 16 }}>
              <AuditOutlined style={{ marginRight: 8, color: '#1677ff' }} />
              Approval & Review Audit Trail
            </Title>

            {inspectedPeriod.approvals && inspectedPeriod.approvals.length > 0 ? (
              <Timeline
                items={inspectedPeriod.approvals.map((app) => ({
                  color: app.status === 'APPROVED' ? 'green' : app.status === 'REJECTED' ? 'red' : 'blue',
                  dot:
                    app.status === 'APPROVED' ? (
                      <CheckCircleOutlined />
                    ) : app.status === 'REJECTED' ? (
                      <CloseCircleOutlined />
                    ) : undefined,
                  children: (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Tag color={app.status === 'APPROVED' ? 'green' : 'error'}>
                          {app.status}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(app.date).toLocaleString()}
                        </Text>
                      </div>
                      <Paragraph style={{ margin: '8px 0 4px', fontSize: 13 }}>
                        <strong>Reviewer:</strong> {app.approvedBy?.email || `User ID #${app.approvedById}`}
                      </Paragraph>
                      {app.comments && (
                        <Text type="secondary" style={{ display: 'block', fontStyle: 'italic', fontSize: 12 }}>
                          &ldquo;{app.comments}&rdquo;
                        </Text>
                      )}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Paragraph type="secondary">
                No formal approval actions have been recorded yet for this payroll period.
              </Paragraph>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
