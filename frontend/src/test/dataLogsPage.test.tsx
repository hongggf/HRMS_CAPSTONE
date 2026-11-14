import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataLogsPage } from '../pages/datalogs/DataLogsPage';
import { useDataLogStore } from '../store/useDataLogStore';

const mockLogs = [
  {
    id: 'log-1',
    timestamp: '2026-11-14T10:00:00.000Z',
    method: 'GET',
    url: '/api/v1/lnd/trainings',
    status: 200,
    statusText: 'OK',
    durationMs: 45,
    requestData: null,
    responseData: [
      { id: 1, title: 'Cloud & DevOps Architecture' },
      { id: 2, title: 'Fullstack Security Fundamentals' },
    ],
    isError: false,
    errorMessage: null,
  },
  {
    id: 'log-2',
    timestamp: '2026-11-14T10:05:00.000Z',
    method: 'POST',
    url: '/api/v1/lnd/categories',
    status: 201,
    statusText: 'Created',
    durationMs: 82,
    requestData: { name: 'Leadership & Strategy', description: 'Executive coaching' },
    responseData: { id: 3, name: 'Leadership & Strategy' },
    isError: false,
    errorMessage: null,
  },
  {
    id: 'log-3',
    timestamp: '2026-11-14T10:10:00.000Z',
    method: 'POST',
    url: '/api/v1/auth/login',
    status: 400,
    statusText: 'Bad Request',
    durationMs: 30,
    requestData: { email: '' },
    responseData: { error: 'Email is required' },
    isError: true,
    errorMessage: 'Request failed with status code 400',
  },
];

describe('System Data Logs Page Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    vi.clearAllMocks();

    // Reset Zustand store with mock data
    useDataLogStore.setState({
      logs: [...mockLogs],
      isRecording: true,
      maxLogs: 100,
    });
  });

  it('renders header, statistics, and captured API requests table', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DataLogsPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText('System Data Logs')).toBeInTheDocument();
    expect(screen.getByText('Captured Calls')).toBeInTheDocument();
    expect(screen.getByText('Success (2xx)')).toBeInTheDocument();
    expect(screen.getByText('Errors (4xx / 5xx)')).toBeInTheDocument();

    // Check table rows
    expect(screen.getByText('/api/v1/lnd/trainings')).toBeInTheDocument();
    expect(screen.getByText('/api/v1/lnd/categories')).toBeInTheDocument();
    expect(screen.getByText('200 (OK)')).toBeInTheDocument();
    expect(screen.getByText('201 (Created)')).toBeInTheDocument();
    expect(screen.getByText('400 (Bad Request)')).toBeInTheDocument();
  });

  it('filters logs by search query matching URL or returned payload', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DataLogsPage />
      </QueryClientProvider>,
    );

    const searchInput = screen.getByPlaceholderText(
      'Search URL, method, payload, or error...',
    );

    // Search for category
    fireEvent.change(searchInput, { target: { value: 'categories' } });

    await waitFor(() => {
      expect(screen.getByText('/api/v1/lnd/categories')).toBeInTheDocument();
      expect(screen.queryByText('/api/v1/lnd/trainings')).not.toBeInTheDocument();
    });

    // Search for text inside returned response data
    fireEvent.change(searchInput, { target: { value: 'DevOps' } });

    await waitFor(() => {
      expect(screen.getByText('/api/v1/lnd/trainings')).toBeInTheDocument();
      expect(screen.queryByText('/api/v1/lnd/categories')).not.toBeInTheDocument();
    });
  });

  it('filters logs by HTTP method', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DataLogsPage />
      </QueryClientProvider>,
    );

    // Select Method Filter dropdown
    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.mouseDown(comboboxes[0]);

    await waitFor(() => {
      expect(document.querySelector('.ant-select-dropdown')).toBeInTheDocument();
    });

    const getOptions = screen.getAllByText('GET');
    const optionContent = getOptions.find((el) =>
      el.classList.contains('ant-select-item-option-content'),
    );
    expect(optionContent).toBeDefined();
    fireEvent.click(optionContent!);

    await waitFor(() => {
      expect(screen.getByText('/api/v1/lnd/trainings')).toBeInTheDocument();
      expect(screen.queryByText('/api/v1/lnd/categories')).not.toBeInTheDocument();
    });
  });

  it('expands an inline row to view formatted returned JSON payload', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DataLogsPage />
      </QueryClientProvider>,
    );

    // Expand second row (/categories)
    const expandButtons = document.querySelectorAll('.ant-table-row-expand-icon');
    expect(expandButtons.length).toBeGreaterThan(0);
    fireEvent.click(expandButtons[1]);

    // Check expanded tabs and content
    expect(await screen.findByText('Returned Response Data')).toBeInTheDocument();
    expect(screen.getByText('Sent Request Payload')).toBeInTheDocument();
    expect(screen.getByText('Copy Response JSON')).toBeInTheDocument();
  });

  it('toggles recording pause and resume', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DataLogsPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Live Intercepting')).toBeInTheDocument();

    const pauseBtn = screen.getByRole('button', { name: /pause recording/i });
    fireEvent.click(pauseBtn);

    expect(await screen.findByText('Capture Paused')).toBeInTheDocument();
    expect(useDataLogStore.getState().isRecording).toBe(false);
  });

  it('clears all captured data logs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DataLogsPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText('/api/v1/lnd/trainings')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /clear logs/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Clear Data Logs')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /^clear$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(useDataLogStore.getState().logs.length).toBe(0);
    });
  });
});
