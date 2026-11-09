import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LndPage } from '../pages/lnd/LndPage';
import { lndApi } from '../api/lnd';
import { employeeApi } from '../api/employee';
import { departmentApi } from '../api/organization';
import { useAuthStore } from '../store/useAuthStore';
import {
  Training,
  TrainingCategory,
  TrainingPlan,
  TrainingSession,
  TrainingAttendance,
  TrainingEvaluation,
  EmployeeSkill,
} from '../types/lnd';
import { Employee } from '../types/employee';

const mockCategories: TrainingCategory[] = [
  { id: 1, name: 'Cloud & Infrastructure', description: 'Cloud systems and DevOps', _count: { trainings: 2 } },
  { id: 2, name: 'Security & Compliance', description: 'Information security and audit', _count: { trainings: 1 } },
];

const mockEmployees: Employee[] = [
  {
    id: 101,
    employeeId: 'EMP-101',
    firstName: 'Sarah',
    lastName: 'Connor',
    email: 'sarah@sky.net',
    status: 'ACTIVE',
    onboardingStatus: 'ACTIVE',
    employmentType: 'FULL_TIME',
    departmentId: 1,
    positionId: 1,
    hireDate: '2024-01-01',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    department: { id: 1, name: 'Engineering', code: 'ENG' } as any,
    position: { id: 1, title: 'Software Engineer', code: 'SWE', departmentId: 1 } as any,
  },
];

const mockTrainings: Training[] = [
  {
    id: 1,
    title: 'Kubernetes in Production',
    description: 'Container orchestration, Helm charts, and service meshes',
    categoryId: 1,
    provider: 'Cloud Native Academy',
    type: 'ONLINE',
    capacity: 25,
    cost: 300,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    category: mockCategories[0],
    _count: { assignments: 5, sessions: 2, evaluations: 3 },
  },
];

const mockPlans: TrainingPlan[] = [
  {
    id: 1,
    trainingId: 1,
    identifiedNeed: 'Cloud-native migration skills shortage',
    objective: 'Transition all microservices to automated Kubernetes clusters',
    targetEmployees: 'Backend Engineering',
    priority: 'CRITICAL',
    budget: 6000,
    plannedDate: '2026-08-01T00:00:00.000Z',
    status: 'APPROVED',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    training: mockTrainings[0],
  },
];

const mockSessions: TrainingSession[] = [
  {
    id: 10,
    trainingId: 1,
    title: 'Session 1: Pod Scheduling and Resource Limits',
    date: '2026-05-10T10:00:00.000Z',
    location: 'Virtual Zoom Room A',
  },
];

const mockAttendances: TrainingAttendance[] = [
  {
    id: 20,
    sessionId: 10,
    employeeId: 101,
    status: 'REGISTERED',
    attendedAt: null,
    employee: mockEmployees[0],
  },
];

const mockEvaluations: TrainingEvaluation[] = [
  {
    id: 30,
    trainingId: 1,
    evaluatorId: 101,
    rating: 5,
    feedback: 'Clear demonstrations of cluster failure modes',
    comments: 'Helped our on-call resilience greatly',
    createdAt: '2026-05-15T00:00:00.000Z',
    evaluator: mockEmployees[0],
  },
];

const mockSkills: EmployeeSkill[] = [
  {
    id: 40,
    employeeId: 101,
    skillName: 'Kubernetes',
    level: 'ADVANCED',
    acquiredAt: '2026-05-20T00:00:00.000Z',
    employee: mockEmployees[0],
  },
];

describe('Phase 8: Learning & Development Module Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    vi.clearAllMocks();

    vi.spyOn(lndApi, 'getCategories').mockResolvedValue([...mockCategories]);
    vi.spyOn(lndApi, 'getTrainings').mockResolvedValue([...mockTrainings]);
    vi.spyOn(lndApi, 'getPlans').mockResolvedValue([...mockPlans]);
    vi.spyOn(lndApi, 'getSessions').mockResolvedValue([...mockSessions]);
    vi.spyOn(lndApi, 'getSessionAttendance').mockResolvedValue([...mockAttendances]);
    vi.spyOn(lndApi, 'getEvaluations').mockResolvedValue([...mockEvaluations]);
    vi.spyOn(lndApi, 'getAllSkills').mockResolvedValue([...mockSkills]);
    vi.spyOn(employeeApi, 'list').mockResolvedValue([...mockEmployees]);

    useAuthStore.setState({
      user: { id: 1, email: 'lnd@hr.local', roles: ['HEAD_OF_HR', 'HR_LND'] },
      isAuthenticated: true,
    });
  });

  it('renders L&D overview cards, course catalog, and category tags', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LndPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Learning & Development (L&D)')).toBeInTheDocument();
    expect(screen.getByText('Course Catalog')).toBeInTheDocument();
    expect(screen.getByText('Training Categories')).toBeInTheDocument();
    expect(screen.getByText('Tracked Skills')).toBeInTheDocument();

    // Table data
    expect(await screen.findByText('Kubernetes in Production')).toBeInTheDocument();
    expect(screen.getByText('Cloud & Infrastructure (2)')).toBeInTheDocument();
  });

  it('opens Enroll Employees modal and assigns staff to training', async () => {
    vi.spyOn(lndApi, 'assignEmployees').mockResolvedValue([] as any);

    render(
      <QueryClientProvider client={queryClient}>
        <LndPage />
      </QueryClientProvider>
    );

    const enrollBtn = await screen.findByText('Enroll Employees');
    fireEvent.click(enrollBtn);

    expect(await screen.findByText('Assign Employees to Kubernetes in Production')).toBeInTheDocument();
  });

  it('switches to Training Plans tab and displays strategic learning plans', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LndPage />
      </QueryClientProvider>
    );

    const plansTab = await screen.findByText('Training Plans & Objectives');
    fireEvent.click(plansTab);

    expect(await screen.findByText('Cloud-native migration skills shortage')).toBeInTheDocument();
    expect(screen.getByText('Transition all microservices to automated Kubernetes clusters')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('switches to Session Attendance tab and records attendance', async () => {
    const markSpy = vi.spyOn(lndApi, 'markAttendance').mockResolvedValue({
      ...mockAttendances[0],
      status: 'ATTENDED',
      attendedAt: '2026-05-10T10:15:00.000Z',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LndPage />
      </QueryClientProvider>
    );

    const attendanceTab = await screen.findByText('Session Attendance Roster');
    fireEvent.click(attendanceTab);

    expect(await screen.findByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('Registered')).toBeInTheDocument();

    const markAttendedBtn = await screen.findByText('Mark Attended');
    fireEvent.click(markAttendedBtn);

    await waitFor(() => {
      expect(markSpy).toHaveBeenCalledWith(10, {
        employeeId: 101,
        status: 'ATTENDED',
      });
    });
  });

  it('switches to Course Evaluations tab, lists feedback, and opens submission modal', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LndPage />
      </QueryClientProvider>
    );

    const evalTab = await screen.findByText('Course Evaluations & Feedback');
    fireEvent.click(evalTab);

    expect(await screen.findByText('Clear demonstrations of cluster failure modes')).toBeInTheDocument();

    const submitEvalBtn = await screen.findByText('Submit Course Evaluation');
    fireEvent.click(submitEvalBtn);

    expect(await screen.findByText('Overall Course Quality & Content (1 - 5 Stars)')).toBeInTheDocument();
  });

  it('switches to Skills Matrix tab and displays employee competencies', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LndPage />
      </QueryClientProvider>
    );

    const skillsTab = await screen.findByText('Employee Skills Matrix');
    fireEvent.click(skillsTab);

    expect(await screen.findByText('Kubernetes')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();

    const addSkillBtn = await screen.findByText('Add / Update Skill');
    fireEvent.click(addSkillBtn);

    expect(await screen.findByText('Add / Update Employee Skill Profile')).toBeInTheDocument();
  });
});
