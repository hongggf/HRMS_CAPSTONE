import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../pages/login/LoginPage';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';

vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
    localStorage.clear();
  });

  it('renders login form elements and branding', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('HRMS Portal')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sign In/i }),
    ).toBeInTheDocument();
  });

  it('validates required fields on empty submit', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Please enter your email address'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Please enter your password'),
      ).toBeInTheDocument();
    });

    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('submits credentials and updates authStore on success', async () => {
    const mockUser = {
      id: 1,
      email: 'head@hr.local',
      roles: ['HEAD_OF_HR' as const],
    };
    vi.mocked(authApi.login).mockResolvedValueOnce({
      accessToken: 'access-jwt-123',
      refreshToken: 'refresh-jwt-456',
      user: mockUser,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'head@hr.local' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith(
        'head@hr.local',
        'password123',
      );
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().accessToken).toBe('access-jwt-123');
      expect(useAuthStore.getState().user?.email).toBe('head@hr.local');
    });
  });

  it('displays error alert banner on invalid credentials', async () => {
    const axiosError = new AxiosError('Unauthorized');
    axiosError.response = {
      status: 401,
      data: {
        success: false,
        error: { message: 'Invalid credentials provided' },
      },
      statusText: 'Unauthorized',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    };

    vi.mocked(authApi.login).mockRejectedValueOnce(axiosError);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@hr.local' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Invalid credentials provided'),
      ).toBeInTheDocument();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('displays field-specific error messages from backend validation details', async () => {
    const axiosError = new AxiosError('Bad Request');
    axiosError.response = {
      status: 400,
      data: {
        success: false,
        error: {
          message: 'Validation failed',
          details: [
            {
              field: 'email',
              message: 'Email address not recognized in system',
            },
          ],
        },
      },
      statusText: 'Bad Request',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    };

    vi.mocked(authApi.login).mockRejectedValueOnce(axiosError);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'unknown@hr.local' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Validation failed')).toBeInTheDocument();
      expect(
        screen.getByText('Email address not recognized in system'),
      ).toBeInTheDocument();
    });
  });
});
