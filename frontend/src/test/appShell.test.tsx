import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLayout } from '../components/layout/AdminLayout';
import { UnderDevelopmentPage } from '../pages/common/UnderDevelopmentPage';
import { useAuthStore } from '../store/useAuthStore';
import { useTabStore } from '../store/useTabStore';
import { useThemeStore } from '../store/useThemeStore';
import { useAppConfigStore } from '../store/useAppConfigStore';

describe('Admin Shell, Layout, and UnderDevelopmentPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useTabStore.getState().closeAll();
    useThemeStore.setState({ mode: 'light' });
    useAppConfigStore.setState({ sidebarCollapsed: false });
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
  });

  const renderWithRouter = (initialRoute = '/dashboard') => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/" element={<AdminLayout />}>
              <Route path="dashboard" element={<div>Dashboard Content</div>} />
              <Route path="organization" element={<UnderDevelopmentPage />} />
              <Route path="workforce" element={<UnderDevelopmentPage />} />
              <Route path="payroll" element={<UnderDevelopmentPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('renders AdminLayout with sidebar, header, role tag, and breadcrumbs', async () => {
    renderWithRouter('/dashboard');

    expect(screen.getByText('HRMS Enterprise')).toBeInTheDocument();
    // Check role tag in header
    expect(screen.getByText('HEAD_OF_HR')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('toggles sidebar collapse state and persists in localStorage', () => {
    expect(useAppConfigStore.getState().sidebarCollapsed).toBe(false);

    useAppConfigStore.getState().toggleSidebar();
    expect(useAppConfigStore.getState().sidebarCollapsed).toBe(true);
    expect(localStorage.getItem('hrms_sidebar_collapsed')).toBe('true');

    useAppConfigStore.getState().toggleSidebar();
    expect(useAppConfigStore.getState().sidebarCollapsed).toBe(false);
    expect(localStorage.getItem('hrms_sidebar_collapsed')).toBe('false');
  });

  it('toggles theme mode between light and dark with localStorage persistence', () => {
    expect(useThemeStore.getState().mode).toBe('light');

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(localStorage.getItem('hrms_theme_mode')).toBe('dark');

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().mode).toBe('light');
    expect(localStorage.getItem('hrms_theme_mode')).toBe('light');
  });

  it('renders UnderDevelopmentPage with development labels for upcoming modules', () => {
    renderWithRouter('/payroll');

    expect(
      screen.getAllByText('Payroll Processing').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Under Active Development')).toBeInTheDocument();

    expect(screen.getByText('Phase 7')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Role authorization verified. Navigation shell and security guards active/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /back to dashboard/i }),
    ).toBeInTheDocument();
  });

  it('synchronizes tabs on route change and handles reloadCurrentTab', () => {
    renderWithRouter('/organization');

    const { tabs, activeKey, refreshKey } = useTabStore.getState();
    expect(tabs.some((t) => t.key === '/organization')).toBe(true);
    expect(activeKey).toBe('/organization');

    // Trigger reload
    useTabStore.getState().reloadCurrentTab();
    expect(useTabStore.getState().refreshKey).toBe(refreshKey + 1);
  });
});
