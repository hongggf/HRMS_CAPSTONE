import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UsersPage } from '../pages/users/UsersPage';
import { userApi } from '../api/user';
import { useAuthStore } from '../store/useAuthStore';

const mockUsers = [
  {
    id: 1,
    email: 'head@hr.local',
    isActive: true,
    roles: ['HEAD_OF_HR' as const],
  },
  {
    id: 2,
    email: 'admin@hr.local',
    isActive: true,
    roles: ['HR_ADMIN' as const],
  },
  {
    id: 3,
    email: 'inactive@hr.local',
    isActive: false,
    roles: ['HR_RECRUITMENT' as const],
  },
];

const mockRoles = [
  {
    id: 1,
    name: 'HR_RECRUITMENT' as const,
    permissions: ['RECRUITMENT_CREATE'],
  },
  { id: 2, name: 'HR_ADMIN' as const, permissions: ['USER_READ'] },
  {
    id: 3,
    name: 'HEAD_OF_HR' as const,
    permissions: ['USER_CREATE', 'USER_READ'],
  },
];

describe('Phase 9: UsersPage & User Administration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 1,
        email: 'head@hr.local',
        roles: ['HEAD_OF_HR'],
      },
    });

    vi.spyOn(userApi, 'listUsers').mockResolvedValue({
      users: mockUsers,
      meta: { total: 3, page: 1, limit: 10, totalPages: 1 },
    });

    vi.spyOn(userApi, 'listRoles').mockResolvedValue(mockRoles);
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <UsersPage />
      </QueryClientProvider>,
    );

  it('renders user directory table and statistics cards', async () => {
    renderComponent();

    expect(screen.getByText('User Administration')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('head@hr.local')).toBeInTheDocument();
      expect(screen.getByText('admin@hr.local')).toBeInTheDocument();
      expect(screen.getByText('inactive@hr.local')).toBeInTheDocument();
    });

    // Check your account badge
    expect(screen.getByText('Your Account')).toBeInTheDocument();
  });

  it('enforces self-deactivation protection for currently logged in user', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('head@hr.local')).toBeInTheDocument();
    });

    // head@hr.local is the logged-in user (id=1) AND the only active HEAD_OF_HR
    // The Deactivate button for record #1 should be disabled
    const deactivateButtons = screen.getAllByRole('button', {
      name: /deactivate/i,
    });
    expect(deactivateButtons[0]).toBeDisabled();
  });

  it('allows activating an inactive user', async () => {
    const activateSpy = vi
      .spyOn(userApi, 'activateUser')
      .mockResolvedValueOnce({
        success: true,
        message: 'User activated successfully',
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('inactive@hr.local')).toBeInTheDocument();
    });

    const activateBtn = screen.getByRole('button', { name: /^activate$/i });
    fireEvent.click(activateBtn);

    // Popconfirm opens with confirmation button
    await waitFor(() => {
      expect(
        screen.getByText(/Restore access and enable authentication/i),
      ).toBeInTheDocument();
    });

    const confirmBtn = await screen.findByRole('button', {
      name: /yes, activate/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      const alert = document.querySelector('.ant-alert');
      if (alert) console.log('ALERT TEXT FOUND:', alert.textContent);
      expect(activateSpy).toHaveBeenCalled();
    });
  });

  it('opens Create User modal and verifies password strength checks', async () => {
    renderComponent();

    const createUserBtn = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createUserBtn);

    await waitFor(() => {
      expect(screen.getByText('Create New User Account')).toBeInTheDocument();
      expect(
        screen.getByText('Password Policy Requirements:'),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByPlaceholderText('e.g. employee@company.com'),
    ).toBeInTheDocument();
  });

  it('opens Assign Role modal with verified system roles', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('admin@hr.local')).toBeInTheDocument();
    });

    const roleButtons = screen.getAllByRole('button', { name: /role/i });
    // Click Role button for admin@hr.local (second row)
    fireEvent.click(roleButtons[1]);

    await waitFor(() => {
      expect(
        screen.getByText(/Assign Role - admin@hr.local/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Session Notice/i)).toBeInTheDocument();
    });
  });
});
