import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditLogsPage } from '../pages/audit/AuditLogsPage';
import { auditApi } from '../api/audit';

const mockAuditLogs = [
  {
    id: 101,
    actorId: 1,
    action: 'USER_CREATED',
    module: 'USER',
    entityType: 'User',
    entityId: '42',
    oldValues: null,
    newValues: { newUserId: 42, email: 'new.employee@hr.local' },
    requestId: 'req-abc-123',
    timestamp: '2026-11-14T08:00:00.000Z',
    user: {
      email: 'head@hr.local',
    },
  },
  {
    id: 102,
    actorId: 1,
    action: 'USER_DEACTIVATED',
    module: 'USER',
    entityType: 'User',
    entityId: '42',
    oldValues: { isActive: true },
    newValues: { isActive: false },
    requestId: 'req-def-456',
    timestamp: '2026-11-14T08:15:00.000Z',
    user: {
      email: 'head@hr.local',
    },
  },
];

describe('Phase 9: AuditLogsPage & Immutability Verification', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(auditApi, 'getAuditLogs').mockResolvedValue({
      logs: mockAuditLogs,
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AuditLogsPage />
      </QueryClientProvider>,
    );

  it('renders audit trail viewer with verified records and immutable badge', async () => {
    renderComponent();

    expect(screen.getByText('Audit & Compliance Trail')).toBeInTheDocument();
    expect(screen.getByText('Immutable Records')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('USER_CREATED')).toBeInTheDocument();
      expect(screen.getByText('USER_DEACTIVATED')).toBeInTheDocument();
      expect(
        screen.getAllByText('head@hr.local').length,
      ).toBeGreaterThanOrEqual(1);
    });

    // Verification of immutability: There must be no edit or delete buttons on audit records
    expect(
      screen.queryByRole('button', { name: /delete/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /edit/i }),
    ).not.toBeInTheDocument();
  });

  it('opens payload details drawer to inspect forensic state changes', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('USER_CREATED')).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByRole('button', {
      name: /view details/i,
    });
    fireEvent.click(viewDetailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Audit Event #101 Details/i)).toBeInTheDocument();
      expect(screen.getByText('req-abc-123')).toBeInTheDocument();
      expect(screen.getByText(/Captured State Changes/i)).toBeInTheDocument();
    });
  });

  it('triggers search refetch when filtering by action', async () => {
    const getSpy = vi.spyOn(auditApi, 'getAuditLogs');
    renderComponent();

    const actionInput = screen.getByPlaceholderText(
      /Action \(e\.g\. USER_CREATED\)/i,
    );
    fireEvent.change(actionInput, { target: { value: 'ROLE_ASSIGNED' } });

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROLE_ASSIGNED',
        }),
      );
    });
  });
});
