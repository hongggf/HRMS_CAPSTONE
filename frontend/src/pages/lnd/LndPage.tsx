import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Button,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Select,
  Typography,
  Rate,
  Badge,
  message,
} from 'antd';
import {
  ReadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UsergroupAddOutlined,
  CalendarOutlined,
  StarOutlined,
  TrophyOutlined,
  ReloadOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { lndApi } from '../../api/lnd';
import { employeeApi } from '../../api/employee';
import { departmentApi } from '../../api/organization';
import { useAuthStore } from '../../store/useAuthStore';
import { normalizeApiError } from '../../api/client';
import { Department } from '../../types/organization';
import {
  Training,
  TrainingStatus,
  TrainingPlan,
  TrainingPlanStatus,
  TrainingAttendance,
  TrainingEvaluation,
  EmployeeSkill,
} from '../../types/lnd';

import { CreateTrainingModal } from './components/CreateTrainingModal';
import { CreateCategoryModal } from './components/CreateCategoryModal';
import { AssignEmployeesModal } from './components/AssignEmployeesModal';
import { CreatePlanModal } from './components/CreatePlanModal';
import { CreateSessionModal } from './components/CreateSessionModal';
import { SubmitEvaluationModal } from './components/SubmitEvaluationModal';
import { UpdateSkillModal } from './components/UpdateSkillModal';
import { AddAttendeeModal } from './components/AddAttendeeModal';

const { Title, Text } = Typography;

export const LndPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const roles = user?.roles ?? [];
  const isHeadOfHr = roles.includes('HEAD_OF_HR');
  const canManageLnd = isHeadOfHr || roles.includes('HR_LND');

  // State
  const [activeTab, setActiveTab] = useState('courses');
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | undefined>(undefined);
  const [selectedSessionId, setSelectedSessionId] = useState<number | undefined>(undefined);
  const [filterDepartmentId, setFilterDepartmentId] = useState<number | undefined>(undefined);

  // Modals
  const [createTrainingModalOpen, setCreateTrainingModalOpen] = useState(false);
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [trainingToAssign, setTrainingToAssign] = useState<Training | null>(null);
  const [createPlanModalOpen, setCreatePlanModalOpen] = useState(false);
  const [createSessionModalOpen, setCreateSessionModalOpen] = useState(false);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [updateSkillModalOpen, setUpdateSkillModalOpen] = useState(false);
  const [addAttendeeModalOpen, setAddAttendeeModalOpen] = useState(false);

  // Queries
  const { data: deptData } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });
  const departments: Department[] = deptData?.departments || [];

  const { data: categories = [] } = useQuery({
    queryKey: ['lnd-categories'],
    queryFn: lndApi.getCategories,
  });

  const { data: trainings = [], isLoading: trainingsLoading, refetch: refetchTrainings } = useQuery({
    queryKey: ['lnd-trainings', filterDepartmentId],
    queryFn: () => lndApi.getTrainings(filterDepartmentId ? { departmentId: filterDepartmentId } : undefined),
  });

  // Default selected course
  React.useEffect(() => {
    if (trainings.length > 0 && !selectedTrainingId) {
      setSelectedTrainingId(trainings[0].id);
    }
  }, [trainings, selectedTrainingId]);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['lnd-plans'],
    queryFn: lndApi.getPlans,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['lnd-sessions', selectedTrainingId],
    queryFn: () => (selectedTrainingId ? lndApi.getSessions(selectedTrainingId) : Promise.resolve([])),
    enabled: !!selectedTrainingId,
  });

  React.useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    } else if (sessions.length === 0) {
      setSelectedSessionId(undefined);
    }
  }, [sessions, selectedSessionId]);

  const { data: attendances = [], isLoading: attendancesLoading } = useQuery({
    queryKey: ['lnd-attendances', selectedSessionId],
    queryFn: () => (selectedSessionId ? lndApi.getSessionAttendance(selectedSessionId) : Promise.resolve([])),
    enabled: !!selectedSessionId,
  });

  const { data: evaluations = [], isLoading: evalsLoading } = useQuery({
    queryKey: ['lnd-evaluations', selectedTrainingId],
    queryFn: () => (selectedTrainingId ? lndApi.getEvaluations(selectedTrainingId) : Promise.resolve([])),
    enabled: !!selectedTrainingId,
  });

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['lnd-skills'],
    queryFn: lndApi.getAllSkills,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-directory'],
    queryFn: employeeApi.list,
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: lndApi.createCategory,
    onSuccess: () => {
      message.success('Training category created successfully');
      queryClient.invalidateQueries({ queryKey: ['lnd-categories'] });
      setCreateCategoryModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });


  const createTrainingMutation = useMutation({
    mutationFn: lndApi.createTraining,
    onSuccess: (newCourse) => {
      message.success('Training course created successfully');
      queryClient.invalidateQueries({ queryKey: ['lnd-trainings'] });
      setSelectedTrainingId(newCourse.id);
      setCreateTrainingModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });


  const assignEmployeesMutation = useMutation({
    mutationFn: ({ trainingId, employeeIds }: { trainingId: number; employeeIds: number[] }) =>
      lndApi.assignEmployees(trainingId, { employeeIds }),
    onSuccess: () => {
      message.success('Employees assigned to training successfully');
      queryClient.invalidateQueries({ queryKey: ['lnd-trainings'] });
      setAssignModalOpen(false);
      setTrainingToAssign(null);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });


  const createPlanMutation = useMutation({
    mutationFn: lndApi.createPlan,
    onSuccess: () => {
      message.success('Annual training plan created successfully');
      queryClient.invalidateQueries({ queryKey: ['lnd-plans'] });
      setCreatePlanModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });


  const createSessionMutation = useMutation({
    mutationFn: ({ trainingId, payload }: { trainingId: number; payload: any }) =>
      lndApi.createSession(trainingId, payload),
    onSuccess: (newSession) => {
      message.success('Training session scheduled successfully');
      queryClient.invalidateQueries({ queryKey: ['lnd-sessions'] });
      setSelectedSessionId(newSession.id);
      setCreateSessionModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });


  const markAttendanceMutation = useMutation({
    mutationFn: ({ sessionId, employeeId, status }: { sessionId: number; employeeId: number; status: 'ATTENDED' | 'ABSENT' | 'REGISTERED' }) =>
      lndApi.markAttendance(sessionId, { employeeId, status }),
    onSuccess: () => {
      message.success('Attendance recorded');
      queryClient.invalidateQueries({ queryKey: ['lnd-attendances'] });
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });


  const evaluateTrainingMutation = useMutation({
    mutationFn: ({ trainingId, payload }: { trainingId: number; payload: any }) =>
      lndApi.evaluateTraining(trainingId, payload),
    onSuccess: () => {
      message.success('Evaluation submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['lnd-evaluations'] });
      setEvaluationModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });


  const updateSkillMutation = useMutation({
    mutationFn: ({ employeeId, payload }: { employeeId: number; payload: any }) =>
      lndApi.updateSkill(employeeId, payload),
    onSuccess: () => {
      message.success('Employee skill matrix updated');
      queryClient.invalidateQueries({ queryKey: ['lnd-skills'] });
      setUpdateSkillModalOpen(false);
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });


  const updateCourseStatusMutation = useMutation({
    mutationFn: ({ trainingId, status }: { trainingId: number; status: TrainingStatus }) =>
      lndApi.updateTrainingStatus(trainingId, status),
    onSuccess: () => {
      message.success('Course status updated');
      queryClient.invalidateQueries({ queryKey: ['lnd-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['lnd-plans'] });
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });


  const updatePlanStatusMutation = useMutation({
    mutationFn: ({ planId, status }: { planId: number; status: TrainingPlanStatus }) =>
      lndApi.updatePlanStatus(planId, status),
    onSuccess: () => {
      message.success('Training plan status updated');
      queryClient.invalidateQueries({ queryKey: ['lnd-plans'] });
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });



  const currentEmployee = employees.find((e) => e.userId === user?.id || e.email === user?.email);

  const joinCourseMutation = useMutation({
    mutationFn: (trainingId: number) => lndApi.joinTraining(trainingId),
    onSuccess: (data) => {
      message.success(data.message || 'Successfully joined course!');
      queryClient.invalidateQueries({ queryKey: ['lnd-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['lnd-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['lnd-attendances'] });
    },
    onError: (err) => message.error(normalizeApiError(err).message),
  });

  const handleMarkAllAttended = async () => {
    if (!selectedSessionId || attendances.length === 0) return;
    try {
      await Promise.all(
        attendances
          .filter((a) => a.status !== 'ATTENDED')
          .map((a) =>
            lndApi.markAttendance(selectedSessionId, { employeeId: a.employeeId, status: 'ATTENDED' })
          )
      );
      message.success('All roster attendees marked as attended');
      queryClient.invalidateQueries({ queryKey: ['lnd-attendances'] });
    } catch (err) {
      message.error(normalizeApiError(err).message);
    }
  };

  const getCourseStatusColor = (st: string) => {
    switch (st) {
      case 'ACTIVE':
        return 'green';
      case 'COMPLETED':
        return 'purple';
      case 'CANCELLED':
        return 'red';
      case 'DRAFT':
      default:
        return 'default';
    }
  };

  const getPlanStatusColor = (st: string) => {
    switch (st) {
      case 'APPROVED':
        return 'blue';
      case 'IN_PROGRESS':
        return 'orange';
      case 'COMPLETED':
        return 'green';
      case 'CANCELLED':
        return 'red';
      case 'DRAFT':
      default:
        return 'default';
    }
  };

  // Level tags
  const renderSkillLevelTag = (level: string) => {
    switch (level) {
      case 'EXPERT':
        return <Tag color="gold">Expert</Tag>;
      case 'ADVANCED':
        return <Tag color="green">Advanced</Tag>;
      case 'INTERMEDIATE':
        return <Tag color="blue">Intermediate</Tag>;
      case 'BEGINNER':
        return <Tag color="default">Beginner</Tag>;
      default:
        return <Tag>{level}</Tag>;
    }
  };

  const renderAttendanceStatusTag = (st: string) => {
    switch (st) {
      case 'ATTENDED':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Attended</Tag>;
      case 'ABSENT':
        return <Tag color="error" icon={<CloseCircleOutlined />}>Absent</Tag>;
      case 'REGISTERED':
        return <Tag color="processing">Registered</Tag>;
      default:
        return <Tag>{st}</Tag>;
    }
  };

  // Metrics
  const totalCourses = trainings.length;
  const totalCategories = categories.length;
  const totalSkillsCount = skills.length;

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Learning & Development (L&D)
          </Title>
          <Text type="secondary">
            Course catalog, annual training plans, session attendance, evaluations, and skill matrices
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetchTrainings()}>
            Refresh
          </Button>
          {canManageLnd && (
            <>
              <Button onClick={() => setCreateCategoryModalOpen(true)}>
                New Category
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateTrainingModalOpen(true)}
              >
                Create Course
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Course Catalog"
              value={totalCourses}
              prefix={<ReadOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Training Categories"
              value={totalCategories}
              prefix={<ScheduleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Annual Training Plans"
              value={plans.length}
              prefix={<CalendarOutlined />}
              styles={{ content: { color: '#1677ff' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Tracked Skills"
              value={totalSkillsCount}
              prefix={<TrophyOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            // Tab 1: Course Catalog
            {
              key: 'courses',
              label: 'Course Catalog & Categories',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text strong>Department:</Text>
                      <Select
                        allowClear
                        placeholder="All Departments"
                        style={{ width: 220 }}
                        value={filterDepartmentId}
                        onChange={(val) => setFilterDepartmentId(val)}
                        options={[
                          { value: undefined as any, label: 'All Departments' },
                          ...departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })),
                        ]}
                      />
                      {currentEmployee?.department && (
                        <Button
                          size="small"
                          type={filterDepartmentId === currentEmployee.departmentId ? 'primary' : 'default'}
                          onClick={() => {
                            if (filterDepartmentId === currentEmployee.departmentId) {
                              setFilterDepartmentId(undefined);
                            } else {
                              setFilterDepartmentId(currentEmployee.departmentId);
                            }
                          }}
                        >
                          My Department ({currentEmployee.department.name})
                        </Button>
                      )}
                    </div>

                    <div>
                      <Text strong style={{ marginRight: 8 }}>Categories:</Text>
                      {categories.map((c) => (
                        <Tag key={c.id} color="geekblue" style={{ marginBottom: 4 }}>
                          {c.name} ({c._count?.trainings || 0})
                        </Tag>
                      ))}
                    </div>
                  </div>

                  <Table
                    loading={trainingsLoading}
                    dataSource={trainings}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Course Title',
                        dataIndex: 'title',
                        key: 'title',
                        render: (title: string, record: Training) => (
                          <div>
                            <Text strong>{title}</Text>
                            {record.description && (
                              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                {record.description}
                              </div>
                            )}
                          </div>
                        ),
                      },
                      {
                        title: 'Category',
                        key: 'category',
                        render: (_: any, record: Training) => record.category?.name || 'General',
                      },
                      {
                        title: 'Target Department',
                        key: 'department',
                        render: (_: any, record: Training) => {
                          const isTargetForUser =
                            currentEmployee?.departmentId &&
                            record.departmentId === currentEmployee.departmentId;
                          return (
                            <Space direction="vertical" size={2}>
                              {record.department ? (
                                <Tag color="cyan">{record.department.name}</Tag>
                              ) : (
                                <Tag color="default">All Departments</Tag>
                              )}
                              {isTargetForUser && (
                                <Tag color="gold" style={{ fontSize: 10, lineHeight: '16px' }}>
                                  Your Dept
                                </Tag>
                              )}
                            </Space>
                          );
                        },
                      },
                      {
                        title: 'Format',
                        dataIndex: 'type',
                        key: 'type',
                        render: (type: string) => <Tag color="blue">{type}</Tag>,
                      },
                      {
                        title: 'Capacity',
                        dataIndex: 'capacity',
                        key: 'capacity',
                        render: (cap: number | null | undefined) => (cap ? `${cap} seats` : 'Flexible'),
                      },
                      {
                        title: 'Cost',
                        dataIndex: 'cost',
                        key: 'cost',
                        render: (cost: number | null | undefined) =>
                          cost ? `$${cost.toLocaleString()}` : 'Free / Internal',
                      },
                      {
                        title: 'Enrollments',
                        key: 'enrollments',
                        render: (_: any, record: Training) => (
                          <Badge
                            count={record._count?.assignments || 0}
                            style={{ backgroundColor: '#52c41a' }}
                          />
                        ),
                      },
                      {
                        title: 'Course Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: TrainingStatus, record: Training) => {
                          if (!canManageLnd) {
                            return <Tag color={getCourseStatusColor(status)}>{status}</Tag>;
                          }
                          return (
                            <Select
                              size="small"
                              value={status || 'DRAFT'}
                              style={{ width: 120 }}
                              onChange={(newStatus) =>
                                updateCourseStatusMutation.mutate({
                                  trainingId: record.id,
                                  status: newStatus,
                                })
                              }
                              options={[
                                { value: 'DRAFT', label: 'Draft' },
                                { value: 'ACTIVE', label: 'Active' },
                                { value: 'COMPLETED', label: 'Completed' },
                                { value: 'CANCELLED', label: 'Cancelled' },
                              ]}
                            />
                          );
                        },
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_: any, record: Training) => {
                          const isEnrolled =
                            !!currentEmployee &&
                            !!record.assignments?.some((a) => a.employeeId === currentEmployee.id);
                          return (
                            <Space size="small">
                              {canManageLnd && (
                                <Button
                                  size="small"
                                  icon={<UsergroupAddOutlined />}
                                  onClick={() => {
                                    setTrainingToAssign(record);
                                    setAssignModalOpen(true);
                                  }}
                                >
                                  Enroll Employees
                                </Button>
                              )}
                              {currentEmployee && (
                                isEnrolled ? (
                                  <Tag color="success" icon={<CheckCircleOutlined />}>
                                    Enrolled
                                  </Tag>
                                ) : (
                                  <Button
                                    size="small"
                                    type="primary"
                                    ghost
                                    loading={
                                      joinCourseMutation.isPending &&
                                      joinCourseMutation.variables === record.id
                                    }
                                    disabled={record.status === 'CANCELLED'}
                                    onClick={() => joinCourseMutation.mutate(record.id)}
                                  >
                                    Join Course
                                  </Button>
                                )
                              )}
                            </Space>
                          );
                        },
                      },
                    ]}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },

            // Tab 2: Training Plans & Schedules
            {
              key: 'plans',
              label: 'Training Plans & Objectives',
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">
                      Strategic workforce capabilities and organizational learning plans
                    </Text>
                    {canManageLnd && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreatePlanModalOpen(true)}
                      >
                        Create Training Plan
                      </Button>
                    )}
                  </div>

                  <Table
                    loading={plansLoading}
                    dataSource={plans}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Training Program',
                        key: 'training',
                        render: (_: any, record: TrainingPlan) => (
                          <div>
                            <Text strong>{record.training?.title || `Training #${record.trainingId}`}</Text>
                            {record.training?.category && (
                              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                {record.training.category.name}
                              </div>
                            )}
                          </div>
                        ),
                      },
                      {
                        title: 'Target Department',
                        key: 'department',
                        render: (_: any, record: TrainingPlan) =>
                          record.training?.department ? (
                            <Tag color="cyan">{record.training.department.name}</Tag>
                          ) : (
                            <Tag color="default">All Departments</Tag>
                          ),
                      },
                      {
                        title: 'Course Status',
                        key: 'courseStatus',
                        render: (_: any, record: TrainingPlan) => {
                          const courseStatus = (record.training?.status as TrainingStatus) || 'DRAFT';
                          if (!canManageLnd || !record.trainingId) {
                            return <Tag color={getCourseStatusColor(courseStatus)}>{courseStatus}</Tag>;
                          }
                          return (
                            <Select
                              size="small"
                              value={courseStatus}
                              style={{ width: 125 }}
                              onChange={(newStatus) =>
                                updateCourseStatusMutation.mutate({
                                  trainingId: record.trainingId,
                                  status: newStatus,
                                })
                              }
                              options={[
                                { value: 'DRAFT', label: 'Draft' },
                                { value: 'ACTIVE', label: 'Active' },
                                { value: 'COMPLETED', label: 'Completed' },
                                { value: 'CANCELLED', label: 'Cancelled' },
                              ]}
                            />
                          );
                        },
                      },
                      {
                        title: 'Plan Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (st: TrainingPlanStatus, record: TrainingPlan) => {
                          if (!canManageLnd) {
                            return <Tag color={getPlanStatusColor(st)}>{st}</Tag>;
                          }
                          return (
                            <Select
                              size="small"
                              value={st || 'DRAFT'}
                              style={{ width: 135 }}
                              onChange={(newStatus) =>
                                updatePlanStatusMutation.mutate({
                                  planId: record.id,
                                  status: newStatus,
                                })
                              }
                              options={[
                                { value: 'DRAFT', label: 'Draft' },
                                { value: 'APPROVED', label: 'Approved' },
                                { value: 'IN_PROGRESS', label: 'In Progress' },
                                { value: 'COMPLETED', label: 'Completed' },
                                { value: 'CANCELLED', label: 'Cancelled' },
                              ]}
                            />
                          );
                        },
                      },
                      {
                        title: 'Identified Skill Need',
                        dataIndex: 'identifiedNeed',
                        key: 'identifiedNeed',
                      },
                      {
                        title: 'Learning Objective',
                        dataIndex: 'objective',
                        key: 'objective',
                      },
                      {
                        title: 'Target Cohort',
                        dataIndex: 'targetEmployees',
                        key: 'targetEmployees',
                        render: (t: string) => t || 'All Staff',
                      },
                      {
                        title: 'Priority',
                        dataIndex: 'priority',
                        key: 'priority',
                        render: (p: string) => <Tag color={p === 'CRITICAL' ? 'red' : 'orange'}>{p || 'MEDIUM'}</Tag>,
                      },
                      {
                        title: 'Target Date',
                        dataIndex: 'plannedDate',
                        key: 'plannedDate',
                        render: (d: string) => (d ? dayjs(d).format('YYYY-MM-DD') : '-'),
                      },
                    ]}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },

            // Tab 3: Session Attendance Recording
            {
              key: 'attendance',
              label: 'Session Attendance Roster',
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <Space wrap>
                      <Text strong>Course:</Text>
                      <Select
                        style={{ width: 260 }}
                        value={selectedTrainingId}
                        onChange={(val) => {
                          setSelectedTrainingId(val);
                          setSelectedSessionId(undefined);
                        }}
                        placeholder="Select Course"
                        options={trainings.map((t) => ({ value: t.id, label: t.title }))}
                      />

                      <Text strong style={{ marginLeft: 8 }}>Session:</Text>
                      <Select
                        style={{ width: 300 }}
                        value={selectedSessionId}
                        onChange={setSelectedSessionId}
                        placeholder={sessions.length === 0 ? 'No sessions scheduled' : 'Select Session'}
                        disabled={sessions.length === 0}
                        options={sessions.map((s) => ({
                          value: s.id,
                          label: `${s.title} (${dayjs(s.date).format('YYYY-MM-DD HH:mm')})`,
                        }))}
                      />
                    </Space>

                    <Space>
                      {canManageLnd && selectedSessionId && (
                        <>
                          <Button
                            icon={<UsergroupAddOutlined />}
                            onClick={() => setAddAttendeeModalOpen(true)}
                          >
                            Add Attendee
                          </Button>
                          {attendances.length > 0 && (
                            <Button
                              type="primary"
                              ghost
                              icon={<CheckCircleOutlined />}
                              onClick={handleMarkAllAttended}
                            >
                              Mark All Attended
                            </Button>
                          )}
                        </>
                      )}
                      {canManageLnd && (
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setCreateSessionModalOpen(true)}
                          disabled={!selectedTrainingId}
                        >
                          Schedule Session
                        </Button>
                      )}
                    </Space>
                  </div>

                  {/* Attendance Roster Summary */}
                  {selectedSessionId && (
                    <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Tag color="default">Total Enrolled: {attendances.length}</Tag>
                      <Tag color="success">Present: {attendances.filter((a) => a.status === 'ATTENDED').length}</Tag>
                      <Tag color="error">Absent: {attendances.filter((a) => a.status === 'ABSENT').length}</Tag>
                      <Tag color="processing">Registered: {attendances.filter((a) => a.status === 'REGISTERED').length}</Tag>
                    </div>
                  )}

                  {!selectedSessionId ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', background: '#fafafa', borderRadius: 8 }}>
                      <ScheduleOutlined style={{ fontSize: 36, color: '#bfbfbf', marginBottom: 12 }} />
                      <div><Text strong>No Session Selected</Text></div>
                      <Text type="secondary">Select a training course and scheduled session above to view or mark attendance.</Text>
                      {canManageLnd && selectedTrainingId && (
                        <div style={{ marginTop: 12 }}>
                          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateSessionModalOpen(true)}>
                            Schedule New Session
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : attendances.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', background: '#fafafa', borderRadius: 8 }}>
                      <UsergroupAddOutlined style={{ fontSize: 36, color: '#bfbfbf', marginBottom: 12 }} />
                      <div><Text strong>No Attendees in this Session Roster</Text></div>
                      <Text type="secondary">
                        Employees enrolled in this course will appear automatically, or you can add attendees directly.
                      </Text>
                      {canManageLnd && (
                        <div style={{ marginTop: 12 }}>
                          <Space>
                            <Button
                              type="primary"
                              icon={<UsergroupAddOutlined />}
                              onClick={() => setAddAttendeeModalOpen(true)}
                            >
                              Add Attendee to Session
                            </Button>
                            <Button
                              icon={<PlusOutlined />}
                              onClick={() => {
                                const currentTraining = trainings.find((t) => t.id === selectedTrainingId);
                                if (currentTraining) {
                                  setTrainingToAssign(currentTraining);
                                  setAssignModalOpen(true);
                                }
                              }}
                            >
                              Enroll Employees to Course
                            </Button>
                          </Space>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Table
                      loading={attendancesLoading}
                      dataSource={attendances}
                      rowKey="id"
                      columns={[
                        {
                          title: 'Employee Name',
                          key: 'employee',
                          render: (_: any, record: TrainingAttendance) => (
                            <div>
                              <Text strong>
                                {record.employee?.firstName} {record.employee?.lastName}
                              </Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {record.employee?.employeeId} | {record.employee?.department?.name || 'N/A'}
                              </Text>
                            </div>
                          ),
                        },
                        {
                          title: 'Attendance Status',
                          dataIndex: 'status',
                          key: 'status',
                          render: renderAttendanceStatusTag,
                        },
                        {
                          title: 'Attended Timestamp',
                          dataIndex: 'attendedAt',
                          key: 'attendedAt',
                          render: (ts: string | null) => (ts ? dayjs(ts).format('YYYY-MM-DD HH:mm') : '-'),
                        },
                        {
                          title: 'Record Attendance',
                          key: 'actions',
                          render: (_: any, record: TrainingAttendance) => {
                            if (!canManageLnd || !selectedSessionId) return null;
                            return (
                              <Space size="small">
                                <Button
                                  size="small"
                                  type={record.status === 'ATTENDED' ? 'primary' : 'default'}
                                  ghost={record.status === 'ATTENDED'}
                                  icon={<CheckCircleOutlined />}
                                  onClick={() =>
                                    markAttendanceMutation.mutate({
                                      sessionId: selectedSessionId,
                                      employeeId: record.employeeId,
                                      status: 'ATTENDED',
                                    })
                                  }
                                >
                                  Mark Attended
                                </Button>
                                <Button
                                  size="small"
                                  danger={record.status === 'ABSENT'}
                                  icon={<CloseCircleOutlined />}
                                  onClick={() =>
                                    markAttendanceMutation.mutate({
                                      sessionId: selectedSessionId,
                                      employeeId: record.employeeId,
                                      status: 'ABSENT',
                                    })
                                  }
                                >
                                  Mark Absent
                                </Button>
                                {record.status !== 'REGISTERED' && (
                                  <Button
                                    size="small"
                                    onClick={() =>
                                      markAttendanceMutation.mutate({
                                        sessionId: selectedSessionId,
                                        employeeId: record.employeeId,
                                        status: 'REGISTERED',
                                      })
                                    }
                                  >
                                    Reset
                                  </Button>
                                )}
                              </Space>
                            );
                          },
                        },
                      ]}
                      pagination={{ pageSize: 8 }}
                    />
                  )}
                </div>
              ),
            },

            // Tab 4: Course Evaluations
            {
              key: 'evaluations',
              label: 'Course Evaluations & Feedback',
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <Space>
                      <Text strong>Filter by Course:</Text>
                      <Select
                        style={{ width: 280 }}
                        value={selectedTrainingId}
                        onChange={setSelectedTrainingId}
                        placeholder="Select Course"
                      >
                        {trainings.map((t) => (
                          <Select.Option key={t.id} value={t.id}>
                            {t.title}
                          </Select.Option>
                        ))}
                      </Select>
                    </Space>
                    <Button
                      type="primary"
                      icon={<StarOutlined />}
                      onClick={() => setEvaluationModalOpen(true)}
                      disabled={!selectedTrainingId}
                    >
                      Submit Course Evaluation
                    </Button>
                  </div>

                  <Table
                    loading={evalsLoading}
                    dataSource={evaluations}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Evaluator',
                        key: 'evaluator',
                        render: (_: any, record: TrainingEvaluation) => (
                          <Text strong>
                            {record.evaluator?.firstName} {record.evaluator?.lastName} ({record.evaluator?.employeeId})
                          </Text>
                        ),
                      },
                      {
                        title: 'Rating (1 - 5)',
                        dataIndex: 'rating',
                        key: 'rating',
                        render: (rating: number) => <Rate disabled value={rating} />,
                      },
                      {
                        title: 'Trainer / Content Feedback',
                        dataIndex: 'feedback',
                        key: 'feedback',
                        render: (f: string) => f || '-',
                      },
                      {
                        title: 'Comments & Application',
                        dataIndex: 'comments',
                        key: 'comments',
                        render: (c: string) => c || '-',
                      },
                      {
                        title: 'Submitted Date',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        render: (d: string) => dayjs(d).format('YYYY-MM-DD'),
                      },
                    ]}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },

            // Tab 5: Employee Skills Matrix
            {
              key: 'skills',
              label: 'Employee Skills Matrix',
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">
                      Company skill profiles, competency levels, and continuous development logs
                    </Text>
                    {canManageLnd && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setUpdateSkillModalOpen(true)}
                      >
                        Add / Update Skill
                      </Button>
                    )}
                  </div>

                  <Table
                    loading={skillsLoading}
                    dataSource={skills}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Employee',
                        key: 'employee',
                        render: (_: any, record: EmployeeSkill) => (
                          <div>
                            <Text strong>
                              {record.employee?.firstName} {record.employee?.lastName}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {record.employee?.employeeId} | {record.employee?.department?.name || 'N/A'}
                            </Text>
                          </div>
                        ),
                      },
                      {
                        title: 'Skill Competency',
                        dataIndex: 'skillName',
                        key: 'skillName',
                        render: (name: string) => <Text strong>{name}</Text>,
                      },
                      {
                        title: 'Proficiency Level',
                        dataIndex: 'level',
                        key: 'level',
                        render: renderSkillLevelTag,
                      },
                      {
                        title: 'Acquired / Updated Date',
                        dataIndex: 'acquiredAt',
                        key: 'acquiredAt',
                        render: (d: string) => dayjs(d).format('YYYY-MM-DD'),
                      },
                    ]}
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Modals */}
      <CreateCategoryModal
        visible={createCategoryModalOpen}
        onCancel={() => setCreateCategoryModalOpen(false)}
        onSubmit={async (values) => {
          await createCategoryMutation.mutateAsync(values);
        }}
        loading={createCategoryMutation.isPending}
      />

      <CreateTrainingModal
        visible={createTrainingModalOpen}
        onCancel={() => setCreateTrainingModalOpen(false)}
        onSubmit={async (values) => {
          await createTrainingMutation.mutateAsync(values);
        }}
        categories={categories}
        departments={departments}
        loading={createTrainingMutation.isPending}
      />

      <AssignEmployeesModal
        visible={assignModalOpen}
        onCancel={() => {
          setAssignModalOpen(false);
          setTrainingToAssign(null);
        }}
        onSubmit={async (employeeIds) => {
          if (trainingToAssign) {
            await assignEmployeesMutation.mutateAsync({
              trainingId: trainingToAssign.id,
              employeeIds,
            });
          }
        }}
        training={trainingToAssign}
        employees={employees}
        loading={assignEmployeesMutation.isPending}
      />

      <CreatePlanModal
        visible={createPlanModalOpen}
        onCancel={() => setCreatePlanModalOpen(false)}
        onSubmit={async (values) => {
          await createPlanMutation.mutateAsync(values);
        }}
        trainings={trainings}
        loading={createPlanMutation.isPending}
      />

      <CreateSessionModal
        visible={createSessionModalOpen}
        onCancel={() => setCreateSessionModalOpen(false)}
        onSubmit={async (trainingId, values) => {
          await createSessionMutation.mutateAsync({ trainingId, payload: values });
        }}
        trainings={trainings}
        selectedTrainingId={selectedTrainingId}
        loading={createSessionMutation.isPending}
      />

      <SubmitEvaluationModal
        visible={evaluationModalOpen}
        onCancel={() => setEvaluationModalOpen(false)}
        onSubmit={async (trainingId, values) => {
          await evaluateTrainingMutation.mutateAsync({ trainingId, payload: values });
        }}
        trainings={trainings}
        employees={employees}
        selectedTrainingId={selectedTrainingId}
        loading={evaluateTrainingMutation.isPending}
      />

      <UpdateSkillModal
        visible={updateSkillModalOpen}
        onCancel={() => setUpdateSkillModalOpen(false)}
        onSubmit={async (employeeId, values) => {
          await updateSkillMutation.mutateAsync({ employeeId, payload: values });
        }}
        employees={employees}
        loading={updateSkillMutation.isPending}
      />

      <AddAttendeeModal
        visible={addAttendeeModalOpen}
        onCancel={() => setAddAttendeeModalOpen(false)}
        onSubmit={async (employeeId, status) => {
          if (!selectedSessionId) return;
          await markAttendanceMutation.mutateAsync({
            sessionId: selectedSessionId,
            employeeId,
            status,
          });
          setAddAttendeeModalOpen(false);
        }}
        employees={employees}
        existingEmployeeIds={attendances.map((a) => a.employeeId)}
        sessionTitle={sessions.find((s) => s.id === selectedSessionId)?.title}
        loading={markAttendanceMutation.isPending}
      />
    </div>
  );
};
