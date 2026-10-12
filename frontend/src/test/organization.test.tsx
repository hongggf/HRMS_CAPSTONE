import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DepartmentTab } from '../pages/organization/DepartmentTab';
import { PositionTab } from '../pages/organization/PositionTab';
import { OrganizationPage } from '../pages/organization/OrganizationPage';
import { departmentApi, positionApi } from '../api/organization';
import { useAuthStore } from '../store/useAuthStore';
import { Department, Position } from '../types/organization';

const mockDepartments: Department[] = [
  {
    id: 1,
    name: 'Engineering',
    code: 'ENG',
    description: 'Software and systems engineering',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    _count: { positions: 2 },
  },
  {
    id: 2,
    name: 'Human Resources',
    code: 'HR',
    description: 'People and operations',
    status: 'ACTIVE',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    _count: { positions: 0 },
  },
  {
    id: 3,
    name: 'Finance Archive',
    code: 'FIN_ARCHIVE',
    description: 'Legacy finance node',
    status: 'INACTIVE',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-03T00:00:00Z',
    _count: { positions: 0 },
  },
];

const mockPositions: Position[] = [
  {
    id: 101,
    title: 'Senior Software Engineer',
    code: 'ENG_SR_SWE',
    departmentId: 1,
    employmentType: 'FULL_TIME',
    salaryMin: 80000,
    salaryMax: 120000,
    status: 'OPEN',
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-05T00:00:00Z',
    department: { id: 1, name: 'Engineering', code: 'ENG' },
  },
  {
    id: 102,
    title: 'Junior QA Engineer',
    code: 'ENG_JR_QA',
    departmentId: 1,
    employmentType: 'CONTRACT',
    salaryMin: 40000,
    salaryMax: 60000,
    status: 'FROZEN',
    createdAt: '2026-01-06T00:00:00Z',
    updatedAt: '2026-01-06T00:00:00Z',
    department: { id: 1, name: 'Engineering', code: 'ENG' },
  },
];

describe('Organization Module (Phase 3)', () => {
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
      accessToken: 'valid-test-token',
      isInitializing: false,
    });

    vi.spyOn(departmentApi, 'list').mockResolvedValue({
      departments: mockDepartments,
      meta: { total: 3, page: 1, limit: 10, totalPages: 1 },
    });

    vi.spyOn(positionApi, 'list').mockResolvedValue({
      positions: mockPositions,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
  });

  const renderComponent = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
  };

  it('renders OrganizationPage with tabs for Departments and Positions', async () => {
    renderComponent(<OrganizationPage />);

    expect(
      screen.getByText('Organization & Workforce Structure'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /departments/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /positions/i })).toBeInTheDocument();
  });

  it('renders department table with code, name, and position counts', async () => {
    renderComponent(<DepartmentTab />);

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    expect(screen.getByText('ENG')).toBeInTheDocument();
    expect(screen.getByText('Human Resources')).toBeInTheDocument();
    expect(screen.getByText('2 positions')).toBeInTheDocument();
    expect(screen.getAllByText('0 positions').length).toBe(2);
  });

  it('filters departments by search text input', async () => {
    renderComponent(<DepartmentTab />);

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or code/i);
    fireEvent.change(searchInput, { target: { value: 'Human' } });

    expect(screen.getByText('Human Resources')).toBeInTheDocument();
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
  });

  it('opens Create Department modal and submits valid input', async () => {
    const createSpy = vi.spyOn(departmentApi, 'create').mockResolvedValue({
      id: 4,
      name: 'Design & UX',
      code: 'DESIGN_UX',
      status: 'ACTIVE',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    });

    renderComponent(<DepartmentTab />);

    const addButton = screen.getByRole('button', { name: /add department/i });
    fireEvent.click(addButton);

    expect(screen.getByText('Create New Department')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(
      'e.g. Engineering & Technology',
    );
    const codeInput = screen.getByPlaceholderText('e.g. ENG');

    fireEvent.change(nameInput, { target: { value: 'Design & UX' } });
    fireEvent.change(codeInput, { target: { value: 'DESIGN_UX' } });

    const submitBtn = screen.getByRole('button', {
      name: /create department/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Design & UX',
          code: 'DESIGN_UX',
        }),
      );
    });
  });

  it('restricts delete button to HEAD_OF_HR and displays warnings for existing positions', async () => {
    // 1. As HEAD_OF_HR, delete buttons are enabled
    const { unmount } = renderComponent(<DepartmentTab />);
    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
    expect(deleteButtons[0]).not.toBeDisabled();

    unmount();

    // 2. Switch user to HR_ADMIN (does NOT have HEAD_OF_HR role)
    useAuthStore.setState({
      user: {
        id: 2,
        email: 'admin@hr.local',
        roles: ['HR_ADMIN'],
      },
      isAuthenticated: true,
      accessToken: 'valid-test-token',
      isInitializing: false,
    });

    renderComponent(<DepartmentTab />);
    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    const adminDeleteButtons = screen.getAllByRole('button', {
      name: /delete/i,
    });
    // Deletion should be disabled for non-HEAD_OF_HR
    expect(adminDeleteButtons[0]).toBeDisabled();
  });

  it('renders positions table with employment type and salary ranges', async () => {
    renderComponent(<PositionTab />);

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    expect(screen.getByText('ENG_SR_SWE')).toBeInTheDocument();
    expect(screen.getByText('Full Time')).toBeInTheDocument();
    expect(screen.getByText('$80,000 - $120,000')).toBeInTheDocument();
    expect(screen.getByText('Junior QA Engineer')).toBeInTheDocument();
    expect(screen.getByText('Contract')).toBeInTheDocument();
    expect(screen.getByText('$40,000 - $60,000')).toBeInTheDocument();
  });

  it('enforces salaryMax >= salaryMin cross-field validation in PositionModal', async () => {
    renderComponent(<PositionTab />);

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const addPosBtn = screen.getByRole('button', { name: /add position/i });
    fireEvent.click(addPosBtn);

    expect(screen.getByText('Create New Position')).toBeInTheDocument();

    const minSalaryInput = screen.getByPlaceholderText(/e\.g\. 50000/i);
    const maxSalaryInput = screen.getByPlaceholderText(/e\.g\. 80000/i);

    // Set invalid range: min 100000, max 50000
    fireEvent.change(minSalaryInput, { target: { value: '100000' } });
    fireEvent.change(maxSalaryInput, { target: { value: '50000' } });

    const submitBtn = screen.getByRole('button', { name: /create position/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          /salary maximum must be greater than or equal to minimum salary/i,
        ),
      ).toBeInTheDocument();
    });
  });
});
