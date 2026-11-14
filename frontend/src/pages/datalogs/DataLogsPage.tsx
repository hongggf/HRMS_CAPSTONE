import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Typography,
  Tabs,
  Badge,
  Popconfirm,
  message,
  Tooltip,
  theme,
} from 'antd';
import {
  SearchOutlined,
  ClearOutlined,
  CopyOutlined,
  DownloadOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useDataLogStore, DataLogEntry } from '../../store/useDataLogStore';

const { Title, Text } = Typography;
const { useToken } = theme;

const methodColors: Record<string, string> = {
  GET: 'green',
  POST: 'blue',
  PUT: 'orange',
  PATCH: 'purple',
  DELETE: 'red',
};

const getStatusTagColor = (status: number) => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'processing';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500 || status === 0) return 'error';
  return 'default';
};

export const DataLogsPage: React.FC = () => {
  const { token } = useToken();
  const { logs, isRecording, toggleRecording, clearLogs } = useDataLogStore();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Stats
  const totalCount = logs.length;
  const successCount = logs.filter((l) => l.status >= 200 && l.status < 300).length;
  const errorCount = logs.filter((l) => l.isError || l.status >= 400).length;
  const avgDuration =
    totalCount > 0
      ? Math.round(logs.reduce((acc, curr) => acc + curr.durationMs, 0) / totalCount)
      : 0;

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (methodFilter !== 'ALL' && log.method !== methodFilter) {
        return false;
      }

      if (statusFilter === 'SUCCESS' && (log.status < 200 || log.status >= 300)) {
        return false;
      }
      if (statusFilter === 'ERROR' && !log.isError && log.status < 400) {
        return false;
      }
      if (statusFilter === '4XX' && (log.status < 400 || log.status >= 500)) {
        return false;
      }
      if (statusFilter === '5XX' && (log.status < 500 || log.status >= 600)) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchUrl = log.url.toLowerCase().includes(query);
        const matchMethod = log.method.toLowerCase().includes(query);
        const matchStatus = String(log.status).includes(query);
        const matchResponse =
          log.responseData &&
          JSON.stringify(log.responseData).toLowerCase().includes(query);
        const matchRequest =
          log.requestData &&
          JSON.stringify(log.requestData).toLowerCase().includes(query);

        if (!matchUrl && !matchMethod && !matchStatus && !matchResponse && !matchRequest) {
          return false;
        }
      }

      return true;
    });
  }, [logs, methodFilter, statusFilter, searchTerm]);

  const copyToClipboard = (data: any, label: string) => {
    try {
      const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(text);
      message.success(`Copied ${label} to clipboard`);
    } catch {
      message.error('Failed to copy to clipboard');
    }
  };

  const exportLogsAsJson = () => {
    try {
      const jsonStr = JSON.stringify(filteredLogs, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hrms-api-data-logs-${dayjs().format('YYYY-MM-DD-HH-mm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success(`Exported ${filteredLogs.length} logs successfully`);
    } catch {
      message.error('Failed to export logs');
    }
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Page Header */}
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            System Data Logs
          </Title>
          <Text type="secondary">
            Real-time API network inspector, payload verification, and returned response data
          </Text>
        </div>

        <Space wrap>
          <Button
            icon={isRecording ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            type={isRecording ? 'default' : 'primary'}
            onClick={toggleRecording}
          >
            {isRecording ? 'Pause Recording' : 'Resume Recording'}
          </Button>

          <Button
            icon={<DownloadOutlined />}
            disabled={filteredLogs.length === 0}
            onClick={exportLogsAsJson}
          >
            Export JSON
          </Button>

          <Popconfirm
            title="Clear Data Logs"
            description="Are you sure you want to clear all captured API data logs?"
            onConfirm={clearLogs}
            okText="Clear"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<ClearOutlined />} danger disabled={logs.length === 0}>
              Clear Logs
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Captured Calls"
              value={totalCount}
              prefix={<ApiOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Success (2xx)"
              value={successCount}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Errors (4xx / 5xx)"
              value={errorCount}
              prefix={<CloseCircleOutlined />}
              styles={{ content: { color: errorCount > 0 ? '#ff4d4f' : '#8c8c8c' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Avg Latency"
              value={avgDuration}
              suffix="ms"
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: '#1677ff' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter Toolbar */}
      <Card style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Input
            placeholder="Search URL, method, payload, or error..."
            prefix={<SearchOutlined />}
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 320 }}
          />

          <Select
            value={methodFilter}
            onChange={setMethodFilter}
            style={{ width: 130 }}
            options={[
              { value: 'ALL', label: 'All Methods' },
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'PATCH', label: 'PATCH' },
              { value: 'DELETE', label: 'DELETE' },
            ]}
          />

          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 170 }}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'SUCCESS', label: '2xx Success' },
              { value: 'ERROR', label: 'All Errors' },
              { value: '4XX', label: '4xx Client Errors' },
              { value: '5XX', label: '5xx Server Errors' },
            ]}
          />

          <Badge
            status={isRecording ? 'processing' : 'default'}
            text={
              <Text type="secondary" style={{ fontSize: 13 }}>
                {isRecording ? 'Live Intercepting' : 'Capture Paused'}
              </Text>
            }
          />

          {(searchTerm || methodFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <Button
              size="small"
              onClick={() => {
                setSearchTerm('');
                setMethodFilter('ALL');
                setStatusFilter('ALL');
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Logs Table with Inline Expandable JSON Preview */}
      <Card>
        <Table
          dataSource={filteredLogs}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '30', '50', '100'] }}
          columns={[
            {
              title: 'Time',
              dataIndex: 'timestamp',
              key: 'timestamp',
              width: 120,
              render: (ts: string) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(ts).format('HH:mm:ss.SSS')}
                </Text>
              ),
            },
            {
              title: 'Method',
              dataIndex: 'method',
              key: 'method',
              width: 90,
              render: (m: string) => (
                <Tag color={methodColors[m] || 'default'} style={{ fontWeight: 600 }}>
                  {m}
                </Tag>
              ),
            },
            {
              title: 'Endpoint URL',
              dataIndex: 'url',
              key: 'url',
              render: (url: string) => (
                <Text code style={{ fontSize: 13 }}>
                  {url}
                </Text>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              width: 130,
              render: (st: number, record: DataLogEntry) => (
                <Tag color={getStatusTagColor(st)}>
                  {st || 'FAIL'} {record.statusText ? `(${record.statusText})` : ''}
                </Tag>
              ),
            },
            {
              title: 'Latency',
              dataIndex: 'durationMs',
              key: 'durationMs',
              width: 100,
              render: (ms: number) => (
                <Text type={ms > 800 ? 'warning' : 'secondary'} style={{ fontSize: 12 }}>
                  {ms} ms
                </Text>
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 100,
              render: (_: any, record: DataLogEntry) => (
                <Tooltip title="Copy returned response JSON">
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    disabled={!record.responseData}
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(record.responseData, 'Response JSON');
                    }}
                  >
                    Copy
                  </Button>
                </Tooltip>
              ),
            },
          ]}
          expandable={{
            expandedRowRender: (record: DataLogEntry) => {
              const prettyResponse = record.responseData
                ? JSON.stringify(record.responseData, null, 2)
                : 'No response body returned';

              const prettyRequest = record.requestData
                ? JSON.stringify(record.requestData, null, 2)
                : record.queryParams
                  ? JSON.stringify({ queryParams: record.queryParams }, null, 2)
                  : 'No request payload sent';

              return (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: token.colorFillAlter,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 8,
                  }}
                >
                  <Tabs
                    defaultActiveKey="response"
                    size="small"
                    tabBarExtraContent={
                      <Space>
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyToClipboard(prettyResponse, 'Returned Response Data')}
                        >
                          Copy Response JSON
                        </Button>
                        {record.requestData && (
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => copyToClipboard(prettyRequest, 'Sent Request Data')}
                          >
                            Copy Request Data
                          </Button>
                        )}
                      </Space>
                    }
                    items={[
                      {
                        key: 'response',
                        label: `Returned Response Data ${record.isError ? '(Error)' : ''}`,
                        children: (
                          <div>
                            {record.errorMessage && (
                              <div style={{ marginBottom: 8 }}>
                                <Tag color="error">Error Message: {record.errorMessage}</Tag>
                              </div>
                            )}
                            <pre
                              style={{
                                margin: 0,
                                padding: 12,
                                borderRadius: 6,
                                background: token.colorBgContainer,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                maxHeight: 320,
                                overflowY: 'auto',
                                fontSize: 12,
                                fontFamily: 'Menlo, Monaco, Consolas, monospace',
                              }}
                            >
                              {prettyResponse}
                            </pre>
                          </div>
                        ),
                      },
                      {
                        key: 'request',
                        label: 'Sent Request Payload',
                        children: (
                          <div>
                            {record.queryParams && (
                              <div style={{ marginBottom: 8 }}>
                                <Text strong style={{ fontSize: 12 }}>
                                  Query Parameters:
                                </Text>{' '}
                                <Text code>{JSON.stringify(record.queryParams)}</Text>
                              </div>
                            )}
                            <pre
                              style={{
                                margin: 0,
                                padding: 12,
                                borderRadius: 6,
                                background: token.colorBgContainer,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                maxHeight: 260,
                                overflowY: 'auto',
                                fontSize: 12,
                                fontFamily: 'Menlo, Monaco, Consolas, monospace',
                              }}
                            >
                              {prettyRequest}
                            </pre>
                          </div>
                        ),
                      },
                      {
                        key: 'overview',
                        label: 'Request Details & Headers',
                        children: (
                          <div style={{ fontSize: 13, lineHeight: '24px' }}>
                            <div>
                              <Text strong>Complete Target URL:</Text>{' '}
                              <Text code>{record.url}</Text>
                            </div>
                            <div>
                              <Text strong>HTTP Method:</Text>{' '}
                              <Tag color={methodColors[record.method] || 'default'}>
                                {record.method}
                              </Tag>
                            </div>
                            <div>
                              <Text strong>Status Code:</Text>{' '}
                              <Tag color={getStatusTagColor(record.status)}>
                                {record.status} {record.statusText ? `(${record.statusText})` : ''}
                              </Tag>
                            </div>
                            <div>
                              <Text strong>Round-Trip Duration:</Text>{' '}
                              <Text>{record.durationMs} ms</Text>
                            </div>
                            <div>
                              <Text strong>Timestamp:</Text>{' '}
                              <Text>{dayjs(record.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}</Text>
                            </div>
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              );
            },
          }}
        />
      </Card>
    </div>
  );
};
