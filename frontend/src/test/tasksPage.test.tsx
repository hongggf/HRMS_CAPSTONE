import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TasksPage } from '../pages/tasks/TasksPage';
import { tasksApi } from '../api/tasks';
import { departmentApi } from '../api/organization';
import { useAuthStore } from '../store/useAuthStore';
import { UnifiedTask } from '../types/tasks';

const mockTasks: UnifiedTask[] = [
  {
    id: 'WF-1',
    rawId: 1,
    sourceId: 1,
    type: 'WORKFORCE_REQUEST',
    typeLabel: 'Workforce Headcount',
    title: 'Headcount: 3x Senior Software Engineer',
    description: 'Urgent platform backend expansion',
    departmentName: 'Engineering',
    departmentId: 1,
    requesterEmail: 'recruiter@hr.local',
    status: 'PENDING_APPROVAL',
    priority: 'MEDIUM',
    amountOrHeadcount: '3 persons',
    createdAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'WF-2',
    rawId: 2,
    sourceId: 2,
    type: 'WORKFORCE_REQUEST',
    typeLabel: 'Workforce Headcount',
    title: 'Headcount: 1x Junior QA Engineer',
    description: 'Automation testing capacity',
    departmentName: 'Engineering',
    departmentId: 1,
    requesterEmail: 'recruiter@hr.local',
    status: 'DRAFT',
    priority: 'LOW',
    amountOrHeadcount: '1 person',
    createdAt: '2025-11-15T00:00:00Z',
  },
  {
    id: 'PAYROLL-1',
    rawId: 10,
    sourceId: 10,
    type: 'PAYROLL_PERIOD',
    typeLabel: 'Payroll Cycle',
    title: 'Payroll Period: February 2026',
    description: 'Monthly payroll calculation run',
    departmentName: 'Organization-Wide',
    requesterEmail: 'payroll@hr.local',
    status: 'APPROVED',
    priority: 'HIGH',
    amountOrHeadcount: 'Full Run',
    createdAt: '2026-02-10T00:00:00Z',
  },
];

describe('Executive Tasks & Approvals Center (Head of HR)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    useAuthStore.setState({
      user: {
        id: 1,
        email: 'head@hr.local',
        roles: ['HEAD_OF_HR'],
      },
      isAuthenticated: true,
      accessToken: 'test-token',
      isInitializing: false,
    });

    vi.spyOn(tasksApi, 'getUnifiedTasks').mockResolvedValue(mockTasks);

    vi.spyOn(departmentApi, 'list').mockResolvedValue({
      departments: [
        {
          id: 1,
          name: 'Engineering',
          code: 'ENG',
          status: 'ACTIVE',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TasksPage />
      </QueryClientProvider>,
    );
  };

  it('renders header, KPI metrics cards, and Pending Approvals tab by default', async () => {
    renderComponent();

    expect(
      screen.getByText('Executive Tasks & Approvals Center'),
    ).toBeInTheDocument();
    expect(screen.getByText('Head of HR Desk')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('WF-1')).toBeInTheDocument();
    });

    // Default tab is 'PENDING', so WF-1 is visible and DRAFT is filtered out
    expect(
      screen.getByText('Headcount: 3x Senior Software Engineer'),
    ).toBeInTheDocument();
    expect(screen.queryByText('WF-2')).not.toBeInTheDocument();
  });

  it('switches between Pending, Draft, and All tabs', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('WF-1')).toBeInTheDocument();
    });

    // Switch to Draft Tasks tab
    const draftTab = screen.getByRole('tab', { name: /draft tasks/i });
    fireEvent.click(draftTab);

    await waitFor(() => {
      expect(screen.getByText('WF-2')).toBeInTheDocument();
    });
    expect(screen.queryByText('WF-1')).not.toBeInTheDocument();

    // Switch to All Tasks tab
    const allTab = screen.getByRole('tab', { name: /all tasks & history/i });
    fireEvent.click(allTab);

    await waitFor(() => {
      expect(screen.getByText('WF-1')).toBeInTheDocument();
      expect(screen.getByText('WF-2')).toBeInTheDocument();
      expect(screen.getByText('PAYROLL-1')).toBeInTheDocument();
    });
  });

  it('opens detail drawer when clicking View button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('WF-1')).toBeInTheDocument();
    });

    const viewButton = screen.getByRole('button', { name: /view/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText(/task review: wf-1/i)).toBeInTheDocument();
    });

    expect(
      screen.getAllByText('Urgent platform backend expansion').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('recruiter@hr.local').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('approves a pending task', async () => {
    const approveSpy = vi.spyOn(tasksApi, 'approveTask').mockResolvedValue();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('WF-1')).toBeInTheDocument();
    });

    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    // Popconfirm confirmation
    const confirmBtn = await screen.findByRole('button', {
      name: /^approve$/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'WF-1' }),
      );
    });
  });

  it('rejects a pending task with justification', async () => {
    const rejectSpy = vi.spyOn(tasksApi, 'rejectTask').mockResolvedValue();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('WF-1')).toBeInTheDocument();
    });

    const rejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    // Rejection modal appears
    expect(
      screen.getByText(/reject task: headcount: 3x senior software engineer/i),
    ).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(
      /explain executive rationale/i,
    );
    fireEvent.change(reasonInput, {
      target: { value: 'Cap reached for engineering department' },
    });

    const submitRejectBtn = screen.getByRole('button', {
      name: /reject task/i,
    });
    fireEvent.click(submitRejectBtn);

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'WF-1' }),
        'Cap reached for engineering department',
      );
    });
  });

  it('deletes draft task', async () => {
    const deleteSpy = vi.spyOn(tasksApi, 'deleteDraftTask').mockResolvedValue();

    renderComponent();

    // Switch to Draft tab
    const draftTab = screen.getByRole('tab', { name: /draft tasks/i });
    fireEvent.click(draftTab);

    await waitFor(() => {
      expect(screen.getByText('WF-2')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);

    // Popconfirm confirmation
    const confirmDeleteBtn = await screen.findByRole('button', {
      name: /^delete$/i,
    });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'WF-2' }),
      );
    });
  });

  it('toggles advanced filters panel', async () => {
    renderComponent();

    expect(screen.queryByText('Task Module:')).not.toBeInTheDocument();

    const advFilterBtn = screen.getByRole('button', {
      name: /advanced filters/i,
    });
    fireEvent.click(advFilterBtn);

    expect(screen.getByText('Task Module:')).toBeInTheDocument();
    expect(screen.getByText('Target Department:')).toBeInTheDocument();
    expect(screen.getByText('Priority Level:')).toBeInTheDocument();
  });

  it('HR Officer (Non-HEAD_OF_HR) sees My Tasks view with Follow Up button and no Approve/Reject buttons', async () => {
    useAuthStore.setState({
      user: {
        id: 2,
        email: 'recruiter@hr.local',
        roles: ['HR_RECRUITMENT'],
      },
      isAuthenticated: true,
      accessToken: 'test-token',
      isInitializing: false,
    });

    renderComponent();

    expect(screen.getByText('My Tasks & Workflow Tracker')).toBeInTheDocument();
    expect(screen.getByText('HR_RECRUITMENT')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('WF-1')).toBeInTheDocument();
    });

    // Should NOT see Approve or Reject buttons
    expect(
      screen.queryByRole('button', { name: /approve/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /reject/i }),
    ).not.toBeInTheDocument();

    // Should see Follow Up button
    expect(
      screen.getByRole('button', { name: /follow up/i }),
    ).toBeInTheDocument();
  });

  it('HR Officer can trigger Follow Up reminder', async () => {
    useAuthStore.setState({
      user: {
        id: 2,
        email: 'recruiter@hr.local',
        roles: ['HR_RECRUITMENT'],
      },
      isAuthenticated: true,
      accessToken: 'test-token',
      isInitializing: false,
    });

    const followUpSpy = vi.spyOn(tasksApi, 'followUpTask').mockResolvedValue({
      message: 'Follow-up notification sent to Head of HR',
      followedUpAt: new Date().toISOString(),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('WF-1')).toBeInTheDocument();
    });

    const followUpBtn = screen.getByRole('button', { name: /follow up/i });
    fireEvent.click(followUpBtn);

    // Popconfirm confirmation
    const confirmBtn = await screen.findByRole('button', {
      name: /^send follow-up$/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(followUpSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'WF-1' }),
      );
    });
  });

  it('does not render New Task Request button', () => {
    renderComponent();

    const newReqBtn = screen.queryByRole('button', { name: /new task request/i });
    expect(newReqBtn).not.toBeInTheDocument();
  });
});
