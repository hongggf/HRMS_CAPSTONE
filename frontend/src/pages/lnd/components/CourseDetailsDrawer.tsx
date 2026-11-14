import React from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Tabs,
  Table,
  Space,
  Button,
  Progress,
  Typography,
  Empty,
  Spin,
  Rate,
  theme,
} from 'antd';
import {
  EditOutlined,
  UsergroupAddOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { lndApi } from '../../../api/lnd';
import { Training, TrainingStatus } from '../../../types/lnd';

const { Text, Title, Paragraph } = Typography;
const { useToken } = theme;

interface CourseDetailsDrawerProps {
  visible: boolean;
  trainingId?: number;
  onClose: () => void;
  canManage: boolean;
  onEditCourse: (training: Training) => void;
  onAssignEmployees: (training: Training) => void;
  onAddSession: (training: Training) => void;
}

const statusColorMap: Record<TrainingStatus, string> = {
  DRAFT: 'default',
  ACTIVE: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const formatColorMap: Record<string, string> = {
  ONLINE: 'blue',
  CLASSROOM: 'cyan',
  INTERNAL: 'purple',
  EXTERNAL: 'orange',
};

export const CourseDetailsDrawer: React.FC<CourseDetailsDrawerProps> = ({
  visible,
  trainingId,
  onClose,
  canManage,
  onEditCourse,
  onAssignEmployees,
  onAddSession,
}) => {
  const { token } = useToken();
  const { data: training, isLoading } = useQuery({
    queryKey: ['lnd-training-detail', trainingId],
    queryFn: () => (trainingId ? lndApi.getTrainingById(trainingId) : null),
    enabled: !!trainingId && visible,
  });

  if (!visible) return null;

  const enrolledCount = training?.assignments?.length || 0;
  const capacity = training?.capacity || 0;
  const fillRate = capacity > 0 ? Math.min(100, Math.round((enrolledCount / capacity) * 100)) : 0;

  return (
    <Drawer
      title={
        training ? (
          <Space orientation="vertical" size={2} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Title level={4} style={{ margin: 0 }}>
                {training.title}
              </Title>
              <Space>
                <Tag color={statusColorMap[training.status] || 'default'}>
                  {training.status}
                </Tag>
                {training.category && (
                  <Tag color="geekblue">{training.category.name}</Tag>
                )}
              </Space>
            </div>
            {training.department ? (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Target Department: <Tag color="cyan">{training.department.name} ({training.department.code})</Tag>
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Company-wide (Open to All Departments)
              </Text>
            )}
          </Space>
        ) : (
          'Course Details'
        )
      }
      size="large"
      open={visible}
      onClose={onClose}
      extra={
        canManage && training ? (
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => onEditCourse(training)}
            >
              Edit Course
            </Button>
            <Button
              type="primary"
              icon={<UsergroupAddOutlined />}
              onClick={() => onAssignEmployees(training)}
            >
              Assign
            </Button>
          </Space>
        ) : null
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : !training ? (
        <Empty description="Course not found" />
      ) : (
        <div>
          {/* Capacity and Stats Banner */}
          <div
            style={{
              padding: '16px',
              backgroundColor: token.colorFillAlter,
              borderRadius: 8,
              border: `1px solid ${token.colorBorderSecondary}`,
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>
                <TeamOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                Enrolled Participants: {enrolledCount} {capacity > 0 ? `/ ${capacity} seats` : ''}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {capacity > 0 ? `${capacity - enrolledCount} seats remaining` : 'No seat limit'}
              </Text>
            </div>
            {capacity > 0 && (
              <Progress
                percent={fillRate}
                status={fillRate >= 100 ? 'exception' : 'active'}
                strokeColor={fillRate >= 100 ? '#ff4d4f' : '#1677ff'}
              />
            )}
          </div>

          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: 'Course Overview',
                children: (
                  <div>
                    <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
                      <Descriptions.Item label="Delivery Format">
                        <Tag color={formatColorMap[training.type] || 'default'}>
                          {training.type}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Provider / Instructor">
                        {training.provider || 'Internal Instructor'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Start Date">
                        {training.startDate ? (
                          <Space size={4}>
                            <CalendarOutlined />
                            {dayjs(training.startDate).format('YYYY-MM-DD')}
                          </Space>
                        ) : (
                          'Self-paced / Unscheduled'
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="End Date">
                        {training.endDate ? (
                          <Space size={4}>
                            <ClockCircleOutlined />
                            {dayjs(training.endDate).format('YYYY-MM-DD')}
                          </Space>
                        ) : (
                          'Ongoing'
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Cost per Seat">
                        {training.cost !== null && training.cost !== undefined ? (
                          <Space size={2}>
                            <DollarOutlined />
                            <span>${Number(training.cost).toLocaleString()}</span>
                          </Space>
                        ) : (
                          'Free / Included'
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Capacity">
                        {training.capacity ? `${training.capacity} attendees` : 'Unlimited'}
                      </Descriptions.Item>
                    </Descriptions>

                    <div>
                      <Title level={5}>Curriculum & Learning Objectives</Title>
                      {training.description ? (
                        <Paragraph style={{ whiteSpace: 'pre-line' }}>
                          {training.description}
                        </Paragraph>
                      ) : (
                        <Text type="secondary">No curriculum description provided.</Text>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'sessions',
                label: `Sessions (${training.sessions?.length || 0})`,
                children: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text strong>Scheduled Course Sessions</Text>
                      {canManage && (
                        <Button
                          size="small"
                          type="primary"
                          icon={<CalendarOutlined />}
                          onClick={() => onAddSession(training)}
                        >
                          Add Session
                        </Button>
                      )}
                    </div>
                    <Table
                      dataSource={training.sessions || []}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: 'Session Name',
                          dataIndex: 'title',
                          key: 'title',
                          render: (title) => <Text strong>{title}</Text>,
                        },
                        {
                          title: 'Date & Time',
                          dataIndex: 'date',
                          key: 'date',
                          render: (date) => (
                            <Space size={4}>
                              <CalendarOutlined />
                              {dayjs(date).format('YYYY-MM-DD HH:mm')}
                            </Space>
                          ),
                        },
                        {
                          title: 'Location',
                          dataIndex: 'location',
                          key: 'location',
                          render: (loc) => loc || 'Online / Remote Link',
                        },
                        {
                          title: 'Attendees',
                          key: 'attendees',
                          render: (_, record) => (
                            <Tag color="blue">{record.attendances?.length || 0} checked in</Tag>
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },
              {
                key: 'participants',
                label: `Enrolled Employees (${enrolledCount})`,
                children: (
                  <div>
                    <Table
                      dataSource={training.assignments || []}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 8 }}
                      columns={[
                        {
                          title: 'Employee',
                          key: 'employee',
                          render: (_, record) => (
                            <div>
                              <Text strong>
                                {record.employee
                                  ? `${record.employee.firstName} ${record.employee.lastName}`
                                  : 'Employee'}
                              </Text>
                              <Text
                                type="secondary"
                                style={{ fontSize: 11, display: 'block' }}
                              >
                                ID: {record.employee?.employeeId || `#${record.employeeId}`}
                              </Text>
                            </div>
                          ),
                        },
                        {
                          title: 'Department',
                          key: 'department',
                          render: (_, record) =>
                            record.employee?.department?.name ? (
                              <Tag color="cyan">{record.employee.department.name}</Tag>
                            ) : (
                              '—'
                            ),
                        },
                        {
                          title: 'Position',
                          key: 'position',
                          render: (_, record) =>
                            record.employee?.position?.title || '—',
                        },
                        {
                          title: 'Assigned Date',
                          dataIndex: 'assignedAt',
                          key: 'assignedAt',
                          render: (date) =>
                            date ? dayjs(date).format('YYYY-MM-DD') : '—',
                        },
                      ]}
                    />
                  </div>
                ),
              },
              {
                key: 'evaluations',
                label: `Feedback & Reviews (${training.evaluations?.length || 0})`,
                children: (
                  <div>
                    {(!training.evaluations || training.evaluations.length === 0) ? (
                      <Empty description="No feedback submitted for this course yet." />
                    ) : (
                      <Table
                        dataSource={training.evaluations}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 5 }}
                        columns={[
                          {
                            title: 'Evaluator',
                            key: 'evaluator',
                            render: (_, record) =>
                              record.evaluator
                                ? `${record.evaluator.firstName} ${record.evaluator.lastName}`
                                : 'Anonymous Employee',
                          },
                          {
                            title: 'Rating',
                            dataIndex: 'rating',
                            key: 'rating',
                            render: (rating) => <Rate disabled defaultValue={rating} style={{ fontSize: 13 }} />,
                          },
                          {
                            title: 'Feedback',
                            dataIndex: 'feedback',
                            key: 'feedback',
                            render: (fb) => fb || '—',
                          },
                          {
                            title: 'Date',
                            dataIndex: 'createdAt',
                            key: 'createdAt',
                            render: (date) => dayjs(date).format('YYYY-MM-DD'),
                          },
                        ]}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </Drawer>
  );
};
