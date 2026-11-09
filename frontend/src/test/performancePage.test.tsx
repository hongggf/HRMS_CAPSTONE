import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PerformancePage } from '../pages/performance/PerformancePage';
import { performanceApi } from '../api/performance';
import { employeeApi } from '../api/employee';
import { positionApi } from '../api/organization';
import { useAuthStore } from '../store/useAuthStore';
import {
  PerformanceCycle,
  PerformanceReview,
  Goal,
  PromotionRequest,
  ImprovementPlan,
} from '../types/performance';
import { Employee } from '../types/employee';
import { Position } from '../types/organization';

// Mock Data
const mockCycles: PerformanceCycle[] = [
  {
    id: 1,
    name: 'FY2026 Annual Review',
    description: 'Annual corporate performance review cycle',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.000Z',
    status: 'OPEN',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    _count: { reviews: 2, goals: 2 },
  },
  {
    id: 2,
    name: 'Q1 2026 Quarterly Cycle',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-03-31T23:59:59.000Z',
    status: 'CLOSED',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-31T23:59:59.000Z',
    _count: { reviews: 1, goals: 1 },
  },
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
  {
    id: 102,
    employeeId: 'EMP-102',
    firstName: 'John',
    lastName: 'Manager',
    email: 'john@sky.net',
    status: 'ACTIVE',
    onboardingStatus: 'ACTIVE',
    employmentType: 'FULL_TIME',
    departmentId: 1,
    positionId: 2,
    hireDate: '2023-01-01',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    department: { id: 1, name: 'Engineering', code: 'ENG' } as any,
    position: { id: 2, title: 'Engineering Lead', code: 'ENG_LEAD', departmentId: 1 } as any,
  },
];

const mockPositions: Position[] = [
  { id: 1, title: 'Software Engineer', code: 'SWE', departmentId: 1, isActive: true } as any,
  { id: 2, title: 'Engineering Lead', code: 'ENG_LEAD', departmentId: 1, isActive: true } as any,
  { id: 3, title: 'Senior Software Engineer', code: 'SR_SWE', departmentId: 1, isActive: true } as any,
];

const mockGoals: Goal[] = [
  {
    id: 201,
    cycleId: 1,
    employeeId: 101,
    title: 'Core Platform Refactor',
    description: 'Decouple monolith into modular microservices',
    weight: 60,
    target: '< 100ms P99 latency',
    dueDate: '2026-06-30T00:00:00.000Z',
    status: 'APPROVED',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    employee: {
      id: 101,
      firstName: 'Sarah',
      lastName: 'Connor',
      employeeId: 'EMP-101',
    },
  },
  {
    id: 202,
    cycleId: 1,
    employeeId: 101,
    title: 'Mentorship & Documentation',
    description: 'Mentor 2 junior engineers and write architecture ADRs',
    weight: 40,
    target: '100% ADR completion',
    dueDate: '2026-12-15T00:00:00.000Z',
    status: 'APPROVED',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    employee: {
      id: 101,
      firstName: 'Sarah',
      lastName: 'Connor',
      employeeId: 'EMP-101',
    },
  },
];

const mockReviews: PerformanceReview[] = [
  {
    id: 301,
    cycleId: 1,
    employeeId: 101,
    reviewerId: 102,
    status: 'SUBMITTED',
    overallScore: 4.2,
    comments: 'Exceptional ownership across core infra initiatives',
    managerFeedback: 'Strong promotion candidate',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    cycle: mockCycles[0],
    employee: mockEmployees[0],
    reviewer: mockEmployees[1],
    ratings: [
      { id: 1, reviewId: 301, goalId: 201, rating: 4.5, comment: 'Crushed performance targets' },
      { id: 2, reviewId: 301, goalId: 202, rating: 3.75, comment: 'Great onboarding support' },
    ],
  },
  {
    id: 302,
    cycleId: 1,
    employeeId: 102,
    reviewerId: null,
    status: 'FINALIZED',
    overallScore: 4.8,
    comments: 'Outstanding leadership throughout organizational expansion',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    cycle: mockCycles[0],
    employee: mockEmployees[1],
    reviewer: null,
  },
];

const mockPromotions: PromotionRequest[] = [
  {
    id: 401,
    employeeId: 101,
    currentPositionId: 1,
    proposedPositionId: 3,
    currentSalary: 4500,
    proposedSalary: 6200,
    reason: 'Exceeded all Q1/Q2 technical targets with high architectural quality',
    performanceReviewId: 301,
    effectiveDate: '2026-07-01T00:00:00.000Z',
    status: 'SUBMITTED',
    requestedById: 2,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    employee: mockEmployees[0],
    currentPosition: mockPositions[0],
    proposedPosition: mockPositions[2],
  },
];

const mockPips: ImprovementPlan[] = [
  {
    id: 501,
    employeeId: 101,
    reason: 'Defect escaping in core release',
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-07-01T00:00:00.000Z',
    objective: 'Implement 95% automated test coverage on checkout module',
    status: 'ACTIVE',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    employee: mockEmployees[0],
    items: [
      {
        id: 601,
        planId: 501,
        action: 'Write unit tests for checkout edge cases',
        target: '100% path coverage',
        owner: 'Sarah Connor',
        dueDate: '2026-05-01T00:00:00.000Z',
        progress: 80,
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
    ],
  },
];

describe('Phase 8: Comprehensive Performance & Reviews Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    vi.clearAllMocks();

    // Default API mocks
    vi.spyOn(performanceApi, 'getCycles').mockResolvedValue([...mockCycles]);
    vi.spyOn(performanceApi, 'getGoals').mockResolvedValue([...mockGoals]);
    vi.spyOn(performanceApi, 'getReviews').mockResolvedValue([...mockReviews]);
    vi.spyOn(performanceApi, 'getPromotions').mockResolvedValue([...mockPromotions]);
    vi.spyOn(performanceApi, 'getPips').mockResolvedValue([...mockPips]);
    vi.spyOn(employeeApi, 'list').mockResolvedValue([...mockEmployees]);
    vi.spyOn(positionApi, 'list').mockResolvedValue({
      positions: [...mockPositions],
      meta: {} as any,
    });

    // Default logged in user: HEAD_OF_HR
    useAuthStore.setState({
      user: { id: 1, email: 'head@hr.local', roles: ['HEAD_OF_HR'] },
      isAuthenticated: true,
    });
  });

  it('renders performance overview, statistics, and cycles list', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PerformancePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Performance Management & Governance')).toBeInTheDocument();
    expect(screen.getByText('Total Cycles')).toBeInTheDocument();
    expect(screen.getByText('Promotion Requests')).toBeInTheDocument();
    expect(screen.getByText('Active PIPs')).toBeInTheDocument();

    // Goal table renders
    expect(await screen.findByText('Core Platform Refactor')).toBeInTheDocument();
    expect(screen.getByText('Mentorship & Documentation')).toBeInTheDocument();
  });

  it('allows authorized user to create a new evaluation cycle', async () => {
    vi.spyOn(performanceApi, 'createCycle').mockResolvedValue({
      id: 3,
      name: 'Mid-Year 2026 Review',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-08-31T23:59:59.000Z',
      status: 'OPEN',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PerformancePage />
      </QueryClientProvider>
    );

    const newCycleBtn = await screen.findByText('New Appraisal Cycle');
    fireEvent.click(newCycleBtn);

    expect(await screen.findByText('Create Evaluation Cycle')).toBeInTheDocument();
  });

  it('switches to Reviews tab and lists reviews with scores and status tags', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PerformancePage />
      </QueryClientProvider>
    );

    const reviewsTab = await screen.findByText('Employee Reviews & Scoring');
    fireEvent.click(reviewsTab);

    expect(await screen.findByText('#REV-301')).toBeInTheDocument();
    expect(screen.getByText('#REV-302')).toBeInTheDocument();
    expect(screen.getByText('4.20 / 5.0')).toBeInTheDocument();
    expect(screen.getByText('4.80 / 5.0')).toBeInTheDocument();
  });

  it('opens ReviewScoringDrawer and validates 0-5 scale and feedback', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PerformancePage />
      </QueryClientProvider>
    );

    const reviewsTab = await screen.findByText('Employee Reviews & Scoring');
    fireEvent.click(reviewsTab);

    const scoreButtons = await screen.findAllByText('Score / Evaluate');
    fireEvent.click(scoreButtons[0]);

    expect(await screen.findByText('Review Evaluation & Scoring')).toBeInTheDocument();
    expect(screen.getByText('Goal-by-Goal Scoring (Scale: 0.0 to 5.0)')).toBeInTheDocument();
    expect(screen.getByText('Calculated Weighted Score:')).toBeInTheDocument();
  });

  it('displays finalized reviews as locked and read-only', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PerformancePage />
      </QueryClientProvider>
    );

    const reviewsTab = await screen.findByText('Employee Reviews & Scoring');
    fireEvent.click(reviewsTab);

    const viewLockedBtn = await screen.findByText('View (Locked)');
    fireEvent.click(viewLockedBtn);

    expect(await screen.findByText('FINALIZED (Locked)')).toBeInTheDocument();
    expect(screen.getByText('Review Finalized & Locked')).toBeInTheDocument();
  });

  it('HEAD_OF_HR finalizes pending review', async () => {
    vi.spyOn(performanceApi, 'getReviews').mockResolvedValue([
      { ...mockReviews[0], status: 'HEAD_OF_HR_REVIEW' },
    ]);

    const finalizeSpy = vi.spyOn(performanceApi, 'finalizeReview').mockResolvedValue({
      ...mockReviews[0],
      status: 'FINALIZED',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PerformancePage />
      </QueryClientProvider>
    );

    const reviewsTab = await screen.findByText('Employee Reviews & Scoring');
    fireEvent.click(reviewsTab);

    const finalizeBtn = await screen.findByText('Finalize');
    fireEvent.click(finalizeBtn);

    expect(
      await screen.findByText(/This will lock ratings and officially finalize the evaluation/i)
    ).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /yes, finalize/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(finalizeSpy).toHaveBeenCalledWith(301);
    });
  });

  it('switches to Promotions tab, verifies request listing and approval by HEAD_OF_HR', async () => {
    const approveSpy = vi.spyOn(performanceApi, 'approvePromotion').mockResolvedValue({
      ...mockPromotions[0],
      status: 'APPROVED',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PerformancePage />
      </QueryClientProvider>
    );

    const promoTab = await screen.findByText('Promotion & Salary Increases');
    fireEvent.click(promoTab);

    expect(await screen.findByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('$6,200')).toBeInTheDocument();

    const approveBtn = await screen.findByText('Approve');
    fireEvent.click(approveBtn);

    expect(
      await screen.findByText(/This will update position and salary history in database/i)
    ).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /yes, approve/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith(401);
    });
  });

  it('restricts promotion approval action when user lacks HEAD_OF_HR role', async () => {
    useAuthStore.setState({
      user: { id: 2, email: 'perf@hr.local', roles: ['HR_PERFORMANCE'] },
      isAuthenticated: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PerformancePage />
      </QueryClientProvider>
    );

    const promoTab = await screen.findByText('Promotion & Salary Increases');
    fireEvent.click(promoTab);

    expect(await screen.findByText('Senior Software Engineer')).toBeInTheDocument();
    // Non-HEAD_OF_HR should NOT see Approve/Reject buttons
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('switches to PIP tab and displays improvement plans with milestone progress', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PerformancePage />
      </QueryClientProvider>
    );

    const pipTab = await screen.findByText('Performance Improvement Plans (PIP)');
    fireEvent.click(pipTab);

    expect(await screen.findByText('Implement 95% automated test coverage on checkout module')).toBeInTheDocument();
    expect(screen.getByText('View & Update Milestones')).toBeInTheDocument();
  });

  it('opens PIP detail drawer and displays action items', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PerformancePage />
      </QueryClientProvider>
    );

    const pipTab = await screen.findByText('Performance Improvement Plans (PIP)');
    fireEvent.click(pipTab);

    const viewBtn = await screen.findByText('View & Update Milestones');
    fireEvent.click(viewBtn);

    expect(await screen.findByText('Performance Improvement Plan Details')).toBeInTheDocument();
    expect(screen.getByText('Action Items & Remediation Steps')).toBeInTheDocument();
    expect(screen.getByText('Write unit tests for checkout edge cases')).toBeInTheDocument();
    expect(screen.getByText('Add Action Item')).toBeInTheDocument();
  });
});
