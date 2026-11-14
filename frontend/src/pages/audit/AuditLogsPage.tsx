import React, { useState } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Button,
  Tag,
  Typography,
  Space,
  Drawer,
  Alert,
  Tooltip,
} from 'antd';
import {
  SafetyCertificateOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClearOutlined,
  EyeOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../api/audit';
import { AuditLog, AuditLogQueryParams } from '../../types/audit';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const MODULE_OPTIONS = [
  'ALL',
  'AUTH',
  'USER',
  'WORKFORCE',
  'ORGANIZATION',
  'RECRUITMENT',
  'EMPLOYEE',
  'ATTENDANCE',
  'LEAVE',
  'OVERTIME',
  'PAYROLL',
  'PERFORMANCE',
  'PROMOTION',
  'TRAINING',
  'TASK',
  'SYSTEM',
];

const getModuleColor = (mod: string) => {
  switch (mod) {
    case 'AUTH':
      return 'purple';
    case 'USER':
      return 'magenta';
    case 'ORGANIZATION':
    case 'WORKFORCE':
      return 'blue';
    case 'EMPLOYEE':
    case 'RECRUITMENT':
      return 'cyan';
    case 'ATTENDANCE':
    case 'LEAVE':
    case 'OVERTIME':
      return 'geekblue';
    case 'PAYROLL':
      return 'green';
    case 'PERFORMANCE':
    case 'PROMOTION':
      return 'gold';
    case 'TRAINING':
      return 'orange';
    case 'TASK':
      return 'volcano';
    default:
      return 'default';
  }
};

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionSearch, setActionSearch] = useState('');
  const [actorIdFilter, setActorIdFilter] = useState('');
  const [entityIdFilter, setEntityIdFilter] = useState('');
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  // Drawer detail viewer
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const queryParams: AuditLogQueryParams = {
    page,
    limit: pageSize,
    module: moduleFilter !== 'ALL' ? moduleFilter : undefined,
    action: actionSearch.trim() || undefined,
    actorId: actorIdFilter.trim() ? parseInt(actorIdFilter.trim()) : undefined,
    entityId: entityIdFilter.trim() || undefined,
    startDate: dateRange[0] || undefined,
    endDate: dateRange[1] || undefined,
  };

  const {
    data: auditData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => auditApi.getAuditLogs(queryParams),
    staleTime: 5000,
  });

  const logs = auditData?.logs || [];
  const total = auditData?.meta?.total || 0;

  const handleResetFilters = () => {
    setModuleFilter('ALL');
    setActionSearch('');
    setActorIdFilter('');
    setEntityIdFilter('');
    setDateRange([null, null]);
    setPage(1);
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? ts : d.toLocaleString();
    } catch {
      return ts;
    }
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 175,
      render: (ts: string) => (
        <Text style={{ fontSize: 13, fontFamily: 'monospace' }}>
          {formatTimestamp(ts)}
        </Text>
      ),
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 130,
      render: (mod: string) => (
        <Tag color={getModuleColor(mod)} style={{ fontWeight: 600 }}>
          {mod}
        </Tag>
      ),
    },
    {
      title: 'Action Event',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => (
        <Text strong style={{ color: '#262626' }}>
          {action}
        </Text>
      ),
    },
    {
      title: 'Actor',
      key: 'actor',
      render: (_: unknown, record: AuditLog) => (
        <Space direction="vertical" size={0}>
          <Text>
            {record.user?.email ||
              (record.actorId
                ? `Actor #${record.actorId}`
                : 'System Automated')}
          </Text>
          {record.actorId && record.user?.email && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              ID: {record.actorId}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Target Entity',
      key: 'target',
      render: (_: unknown, record: AuditLog) => (
        <Space size={4}>
          <Tag color="default">{record.entityType}</Tag>
          {record.entityId && <Text code>#{record.entityId}</Text>}
        </Space>
      ),
    },
    {
      title: 'Payload Inspection',
      key: 'payload',
      width: 140,
      render: (_: unknown, record: AuditLog) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setSelectedLog(record)}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <Space align="center">
            <Title level={3} style={{ margin: 0 }}>
              <SafetyCertificateOutlined
                style={{ marginRight: 8, color: '#52c41a' }}
              />
              Audit & Compliance Trail
            </Title>
            <Tag icon={<LockOutlined />} color="success">
              Immutable Records
            </Tag>
          </Space>
          <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
            Verified server-side forensic logging of security events,
            administrative changes, and data mutations.
          </Paragraph>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isLoading}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Security Note Alert */}
      <Alert
        type="info"
        showIcon
        message="Compliance & Governance Assurance"
        description="Audit entries are recorded in real-time by the backend and are strictly immutable. Modifications or deletions cannot be requested or performed through any client interface."
        style={{ marginBottom: 16 }}
      />

      {/* Filter Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={5}>
            <Select
              style={{ width: '100%' }}
              value={moduleFilter}
              onChange={(val) => {
                setModuleFilter(val);
                setPage(1);
              }}
              options={MODULE_OPTIONS.map((m) => ({
                value: m,
                label: m === 'ALL' ? 'All Modules' : m,
              }))}
            />
          </Col>

          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="Action (e.g. USER_CREATED)"
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={actionSearch}
              onChange={(e) => {
                setActionSearch(e.target.value);
                setPage(1);
              }}
              allowClear
            />
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Input
              placeholder="Actor ID"
              value={actorIdFilter}
              onChange={(e) => {
                setActorIdFilter(e.target.value);
                setPage(1);
              }}
              allowClear
            />
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Input
              placeholder="Entity ID"
              value={entityIdFilter}
              onChange={(e) => {
                setEntityIdFilter(e.target.value);
                setPage(1);
              }}
              allowClear
            />
          </Col>

          <Col xs={24} sm={16} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([
                    dates[0].startOf('day').toISOString(),
                    dates[1].endOf('day').toISOString(),
                  ]);
                } else {
                  setDateRange([null, null]);
                }
                setPage(1);
              }}
            />
          </Col>

          <Col xs={24} sm={8} md={2}>
            <Tooltip title="Reset all filters">
              <Button
                icon={<ClearOutlined />}
                onClick={handleResetFilters}
                style={{ width: '100%' }}
              >
                Reset
              </Button>
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      {isError && (
        <Alert
          type="error"
          message="Failed to load audit logs"
          description={(error as Error)?.message}
          action={
            <Button size="small" type="primary" onClick={() => refetch()}>
              Retry
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* Payload Details Drawer */}
      <Drawer
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
            <span>Audit Event #{selectedLog?.id} Details</span>
          </Space>
        }
        placement="right"
        width={520}
        onClose={() => setSelectedLog(null)}
        open={!!selectedLog}
      >
        {selectedLog && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">Action Event:</Text>
              <div>
                <Text strong style={{ fontSize: 16 }}>
                  {selectedLog.action}
                </Text>
              </div>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">Module:</Text>
                <div>
                  <Tag color={getModuleColor(selectedLog.module)}>
                    {selectedLog.module}
                  </Tag>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Recorded Timestamp:</Text>
                <div>
                  <Text>{formatTimestamp(selectedLog.timestamp)}</Text>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">Actor:</Text>
                <div>
                  <Text strong>
                    {selectedLog.user?.email ||
                      (selectedLog.actorId
                        ? `User #${selectedLog.actorId}`
                        : 'System')}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Target Entity:</Text>
                <div>
                  <Text>
                    {selectedLog.entityType}{' '}
                    {selectedLog.entityId ? `#${selectedLog.entityId}` : ''}
                  </Text>
                </div>
              </Col>
            </Row>

            {selectedLog.requestId && (
              <div>
                <Text type="secondary">Request Correlation ID:</Text>
                <div>
                  <Text code>{selectedLog.requestId}</Text>
                </div>
              </div>
            )}

            <div>
              <Text strong>Captured State Changes (New Values):</Text>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 6,
                  maxHeight: 250,
                  overflowY: 'auto',
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                {selectedLog.newValues
                  ? JSON.stringify(selectedLog.newValues, null, 2)
                  : 'None recorded'}
              </pre>
            </div>

            {selectedLog.oldValues && (
              <div>
                <Text strong>Previous State (Old Values):</Text>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 6,
                    maxHeight: 250,
                    overflowY: 'auto',
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  {JSON.stringify(selectedLog.oldValues, null, 2)}
                </pre>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
};
