import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { queryClient } from '../queryClient';
import { EmployeePage } from '../pages/employees/EmployeePage';
import { EmployeeDetailDrawer } from '../pages/employees/EmployeeDetailDrawer';
import { DocumentUploadModal } from '../pages/employees/DocumentUploadModal';
import { CreateEmployeeModal } from '../pages/employees/CreateEmployeeModal';
import { UpdatePositionModal } from '../pages/employees/UpdatePositionModal';
import { employeeApi } from '../api/employee';
import { departmentApi, positionApi } from '../api/organization';
import { recruitmentApi } from '../api/recruitment';
import { useAuthStore } from '../store/useAuthStore';
import { Employee, MAX_FILE_SIZE_BYTES } from '../types/employee';
import { Department, Position } from '../types/organization';

// Mock API modules
vi.mock('../api/employee', () => ({
  employeeApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    updatePosition: vi.fn(),
    uploadDocument: vi.fn(),
    completeOnboarding: vi.fn(),
    activate: vi.fn(),
    generateId: vi.fn(),
  },
}));

vi.mock('../api/organization', () => ({
  departmentApi: {
    list: vi.fn(),
  },
  positionApi: {
    list: vi.fn(),
  },
}));

vi.mock('../api/recruitment', () => ({
  recruitmentApi: {
    listApplications: vi.fn(),
  },
}));

const mockDepartments: Department[] = [
  {
    id: 10,
    name: 'Engineering',
    code: 'ENG',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 11,
    name: 'Finance',
    code: 'FIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const mockPositions: Position[] = [
  {
    id: 20,
    title: 'Lead Software Engineer',
    code: 'SWE_LEAD',
    departmentId: 10,
    employmentType: 'FULL_TIME',
    status: 'OPEN',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 21,
    title: 'Financial Analyst',
    code: 'FIN_ANALYST',
    departmentId: 11,
    employmentType: 'FULL_TIME',
    status: 'OPEN',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const mockEmployees: Employee[] = [
  {
    id: 1,
    employeeId: 'EMP-001',
    firstName: 'Alice',
    lastName: 'Walker',
    email: 'alice.walker@hr.local',
    phone: '+1 555-0101',
    dateOfBirth: '1992-04-15T00:00:00.000Z',
    gender: 'FEMALE',
    departmentId: 10,
    positionId: 20,
    employmentType: 'FULL_TIME',
    hireDate: '2026-01-10T00:00:00.000Z',
    status: 'ACTIVE',
    onboardingStatus: 'ACTIVE',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    department: mockDepartments[0],
    position: mockPositions[0],
    documents: [
      {
        id: 101,
        employeeId: 1,
        documentType: 'ID_PROOF',
        fileName: 'alice_passport.pdf',
        storageKey: 'key-101',
        uploadedById: 1,
        uploadedAt: '2026-01-10T10:00:00.000Z',
        verificationStatus: 'VERIFIED',
        createdAt: '2026-01-10T10:00:00.000Z',
        updatedAt: '2026-01-10T10:00:00.000Z',
      },
    ],
    positionHistory: [
      {
        id: 201,
        employeeId: 1,
        departmentId: 10,
        positionId: 20,
        startDate: '2026-01-10T00:00:00.000Z',
        endDate: null,
        notes: 'Initial assignment upon hire',
        createdAt: '2026-01-10T00:00:00.000Z',
        department: mockDepartments[0],
        position: mockPositions[0],
      },
    ],
    salaryHistory: [
      {
        id: 301,
        employeeId: 1,
        baseSalary: 120000,
        currency: 'USD',
        effectiveDate: '2026-01-10T00:00:00.000Z',
        endDate: null,
        changeReason: 'Initial Salary',
        createdAt: '2026-01-10T00:00:00.000Z',
      },
    ],
  },
  {
    id: 2,
    employeeId: 'EMP-002',
    firstName: 'Bob',
    lastName: 'Taylor',
    email: 'bob.taylor@hr.local',
    phone: '+1 555-0102',
    departmentId: 11,
    positionId: 21,
    employmentType: 'CONTRACT',
    hireDate: '2026-02-01T00:00:00.000Z',
    status: 'PENDING_ONBOARDING',
    onboardingStatus: 'DOCUMENT_COLLECTION',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    department: mockDepartments[1],
    position: mockPositions[1],
    documents: [],
    positionHistory: [],
    salaryHistory: [],
  },
];

const renderComponent = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('Phase 5: Employee Management & Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    useAuthStore.getState().login(
      { id: 1, email: 'head@hr.local', roles: ['HEAD_OF_HR'] },
      'access-token-123',
      'refresh-token-456',
    );

    vi.mocked(employeeApi.list).mockResolvedValue(mockEmployees);
    vi.mocked(employeeApi.getById).mockImplementation(async (id: number) => {
      const found = mockEmployees.find((e) => e.id === id);
      if (!found) throw new Error('Not found');
      return found;
    });
    vi.mocked(departmentApi.list).mockResolvedValue({
      departments: mockDepartments,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
    vi.mocked(positionApi.list).mockResolvedValue({
      positions: mockPositions,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
  });

  describe('Employee Directory & Table', () => {
    it('renders directory header, KPI metric cards, and employee list table', async () => {
      renderComponent(<EmployeePage />);

      expect(
        screen.getByText('Employee Directory & Workforce Management'),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('EMP-001')).toBeInTheDocument();
        expect(screen.getByText('Alice Walker')).toBeInTheDocument();
        expect(screen.getByText('EMP-002')).toBeInTheDocument();
        expect(screen.getByText('Bob Taylor')).toBeInTheDocument();
      });

      // Verify KPI counts
      expect(screen.getByText('Total Headcount')).toBeInTheDocument();
      expect(screen.getByText('Active Workforce')).toBeInTheDocument();
      expect(screen.getByText('In Onboarding')).toBeInTheDocument();
    });

    it('filters employee list by search term', async () => {
      renderComponent(<EmployeePage />);

      await waitFor(() => {
        expect(screen.getByText('Alice Walker')).toBeInTheDocument();
        expect(screen.getByText('Bob Taylor')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by name, id, email/i);
      fireEvent.change(searchInput, { target: { value: 'alice' } });

      await waitFor(() => {
        expect(screen.getByText('Alice Walker')).toBeInTheDocument();
        expect(screen.queryByText('Bob Taylor')).not.toBeInTheDocument();
      });
    });

    it('field-level protection: does not expose sensitive salary or document storage keys in main table', async () => {
      renderComponent(<EmployeePage />);

      await waitFor(() => {
        expect(screen.getByText('Alice Walker')).toBeInTheDocument();
      });

      // Should not contain raw storage keys or salary amount in the public directory table
      expect(screen.queryByText('key-101')).not.toBeInTheDocument();
      expect(screen.queryByText('$120,000')).not.toBeInTheDocument();
    });
  });

  describe('Employee Detail Drawer', () => {
    it('opens drawer and displays contact info, position history, and documents', async () => {
      renderComponent(
        <EmployeeDetailDrawer
          open={true}
          employeeId={1}
          onClose={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('alice.walker@hr.local')).toBeInTheDocument();
        expect(screen.getByText('+1 555-0101')).toBeInTheDocument();
      });

      // Documents Tab
      const docsTab = screen.getByRole('tab', { name: /documents/i });
      fireEvent.click(docsTab);

      await waitFor(() => {
        expect(screen.getByText('Government ID / Passport')).toBeInTheDocument();
        expect(screen.getByText('alice_passport.pdf')).toBeInTheDocument();
      });

      // Position History Tab
      const posTab = screen.getByRole('tab', { name: /position history/i });
      fireEvent.click(posTab);

      await waitFor(() => {
        expect(screen.getByText('Initial assignment upon hire')).toBeInTheDocument();
      });
    });

    it('field-level protection: displays compensation tab for HEAD_OF_HR', async () => {
      renderComponent(
        <EmployeeDetailDrawer
          open={true}
          employeeId={1}
          onClose={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('alice.walker@hr.local')).toBeInTheDocument();
      });

      expect(
        screen.getByRole('tab', { name: /compensation \(restricted\)/i }),
      ).toBeInTheDocument();
    });

    it('field-level protection: hides compensation tab for non-executive role', async () => {
      useAuthStore.getState().login(
        { id: 4, email: 'attendance@hr.local', roles: ['HR_ATTENDANCE'] },
        'att-token',
        'att-refresh',
      );

      renderComponent(
        <EmployeeDetailDrawer
          open={true}
          employeeId={1}
          onClose={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('alice.walker@hr.local')).toBeInTheDocument();
      });

      expect(
        screen.queryByRole('tab', { name: /compensation \(restricted\)/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Onboarding & Activation Workflows', () => {
    it('triggers complete onboarding for employee in document collection', async () => {
      vi.mocked(employeeApi.completeOnboarding).mockResolvedValueOnce({
        ...mockEmployees[1],
        onboardingStatus: 'PROFILE_COMPLETED',
      });

      renderComponent(
        <EmployeeDetailDrawer
          open={true}
          employeeId={2}
          onClose={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('bob.taylor@hr.local')).toBeInTheDocument();
      });

      const completeBtn = screen.getByRole('button', { name: /mark onboarding complete/i });
      fireEvent.click(completeBtn);

      // Confirm in Popconfirm
      const confirmBtn = screen.getByRole('button', { name: /^complete$/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(employeeApi.completeOnboarding).toHaveBeenCalledWith(2);
      });
    });

    it('disables activate button when employee has no documents', async () => {
      renderComponent(
        <EmployeeDetailDrawer
          open={true}
          employeeId={2}
          onClose={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('bob.taylor@hr.local')).toBeInTheDocument();
      });

      const activateBtn = screen.getByRole('button', { name: /activate employee/i });
      expect(activateBtn).toBeDisabled();
    });

    it('activates employee when profile is completed and documents exist', async () => {
      const readyEmployee: Employee = {
        ...mockEmployees[1],
        onboardingStatus: 'PROFILE_COMPLETED',
        documents: [
          {
            id: 102,
            employeeId: 2,
            documentType: 'EMPLOYMENT_CONTRACT',
            fileName: 'contract.pdf',
            storageKey: 'key-102',
            uploadedById: 1,
            uploadedAt: '2026-02-01T10:00:00.000Z',
            verificationStatus: 'VERIFIED',
            createdAt: '2026-02-01T10:00:00.000Z',
            updatedAt: '2026-02-01T10:00:00.000Z',
          },
        ],
      };

      vi.mocked(employeeApi.getById).mockResolvedValueOnce(readyEmployee);
      vi.mocked(employeeApi.activate).mockResolvedValueOnce({
        ...readyEmployee,
        status: 'ACTIVE',
        onboardingStatus: 'ACTIVE',
      });

      renderComponent(
        <EmployeeDetailDrawer
          open={true}
          employeeId={2}
          onClose={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('bob.taylor@hr.local')).toBeInTheDocument();
      });

      const activateBtn = screen.getByRole('button', { name: /activate employee/i });
      expect(activateBtn).not.toBeDisabled();
      fireEvent.click(activateBtn);

      const confirmBtn = screen.getByRole('button', { name: /^activate$/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(employeeApi.activate).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('Document Upload Integration', () => {
    it('validates and rejects file exceeding 5MB limit', async () => {
      renderComponent(
        <DocumentUploadModal
          open={true}
          employeeId={1}
          employeeName="Alice Walker"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      // Create dummy file > 5MB
      const largeFile = new File(['a'.repeat(MAX_FILE_SIZE_BYTES + 1024)], 'huge_contract.pdf', {
        type: 'application/pdf',
      });

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(
          screen.getAllByText(/file exceeds the maximum allowed size of 5 mb/i)[0],
        ).toBeInTheDocument();
      });

      expect(employeeApi.uploadDocument).not.toHaveBeenCalled();
    });

    it('validates and rejects disallowed file extensions', async () => {
      renderComponent(
        <DocumentUploadModal
          open={true}
          employeeId={1}
          employeeName="Alice Walker"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      const invalidFile = new File(['binary content'], 'script.exe', {
        type: 'application/x-msdownload',
      });

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getAllByText(/invalid file type "\.exe"/i)[0]).toBeInTheDocument();
      });

      expect(employeeApi.uploadDocument).not.toHaveBeenCalled();
    });

    it('uploads valid document and calls uploadDocument with FormData', async () => {
      const onSuccess = vi.fn();
      vi.mocked(employeeApi.uploadDocument).mockResolvedValueOnce({
        id: 103,
        employeeId: 1,
        documentType: 'ID_PROOF',
        fileName: 'passport.pdf',
        storageKey: 'key-103',
        uploadedById: 1,
        uploadedAt: '2026-02-15T00:00:00.000Z',
        verificationStatus: 'PENDING',
        createdAt: '2026-02-15T00:00:00.000Z',
        updatedAt: '2026-02-15T00:00:00.000Z',
      });

      renderComponent(
        <DocumentUploadModal
          open={true}
          employeeId={1}
          employeeName="Alice Walker"
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />,
      );

      const validFile = new File(['content'], 'passport.pdf', {
        type: 'application/pdf',
      });

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [validFile] } });

      // Select document type
      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      await waitFor(() => {
        expect(screen.getByText('Government ID / Passport')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Government ID / Passport'));

      const uploadBtn = screen.getByRole('button', { name: /upload document/i });
      fireEvent.click(uploadBtn);

      await waitFor(() => {
        expect(employeeApi.uploadDocument).toHaveBeenCalledWith(
          1,
          expect.any(File),
          'ID_PROOF',
          expect.any(Function),
        );
      });
    });
  });

  describe('Position Update & Draft Employee Creation', () => {
    it('updates position and department via UpdatePositionModal', async () => {
      const onSuccess = vi.fn();
      vi.mocked(employeeApi.updatePosition).mockResolvedValueOnce({
        ...mockEmployees[0],
        departmentId: 11,
        positionId: 21,
      });

      renderComponent(
        <UpdatePositionModal
          open={true}
          employeeId={1}
          employeeName="Alice Walker"
          currentDepartmentId={10}
          currentPositionId={20}
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: /update position/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(employeeApi.updatePosition).toHaveBeenCalledWith(1, {
          departmentId: 10,
          positionId: 20,
        });
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('creates draft employee from approved candidate application in CreateEmployeeModal', async () => {
      vi.mocked(recruitmentApi.listApplications).mockResolvedValueOnce({
        applications: [
          {
            id: 77,
            candidateId: 5,
            jobPostingId: 1,
            status: 'APPROVED',
            appliedAt: '2026-02-01T00:00:00.000Z',
            createdAt: '2026-02-01T00:00:00.000Z',
            updatedAt: '2026-02-01T00:00:00.000Z',
            candidate: {
              id: 5,
              firstName: 'Clara',
              lastName: 'Oswald',
              email: 'clara@companion.local',
              phone: '+1 555-0999',
              createdAt: '2026-02-01T00:00:00.000Z',
              updatedAt: '2026-02-01T00:00:00.000Z',
            },
            jobPosting: {
              id: 1,
              requisitionId: 1,
              title: 'Frontend Engineer',
              requisition: {
                id: 1,
                workforceRequestId: 1,
                workforceRequest: {
                  departmentId: 10,
                  positionId: 20,
                },
              },
            },
          } as any,
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      vi.mocked(employeeApi.create).mockResolvedValueOnce({
        id: 3,
        employeeId: 'EMP-003',
        firstName: 'Clara',
        lastName: 'Oswald',
        email: 'clara@companion.local',
        departmentId: 10,
        positionId: 20,
        employmentType: 'FULL_TIME',
        status: 'PENDING_ONBOARDING',
        onboardingStatus: 'PENDING_ONBOARDING',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      });

      const onSuccess = vi.fn();
      renderComponent(
        <CreateEmployeeModal
          open={true}
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />,
      );

      // Select approved candidate
      const appSelect = screen.getByLabelText(/approved candidate application/i);
      fireEvent.mouseDown(appSelect);

      await waitFor(() => {
        expect(screen.getByText(/Clara Oswald/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(/Clara Oswald/i));

      // Enter Employee ID
      const empIdInput = screen.getByLabelText(/employee id/i);
      fireEvent.change(empIdInput, { target: { value: 'EMP-003' } });

      const createBtn = screen.getByRole('button', { name: /create employee profile/i });
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(employeeApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            applicationId: 77,
            employeeId: 'EMP-003',
            firstName: 'Clara',
            lastName: 'Oswald',
            email: 'clara@companion.local',
          }),
        );
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('auto-generates unique employee ID upon modal opening and supports regeneration', async () => {
      vi.mocked(employeeApi.generateId)
        .mockResolvedValueOnce('EMP-1005')
        .mockResolvedValueOnce('EMP-1006');

      renderComponent(
        <CreateEmployeeModal
          open={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      const empIdInput = screen.getByLabelText(/employee id/i) as HTMLInputElement;

      await waitFor(() => {
        expect(empIdInput.value).toBe('EMP-1005');
      });

      // Click Regenerate button
      const regenerateBtn = screen.getByRole('button', { name: /regenerate/i });
      fireEvent.click(regenerateBtn);

      await waitFor(() => {
        expect(empIdInput.value).toBe('EMP-1006');
      });
    });
  });

  describe('Cache Eviction on Logout', () => {
    it('purges cached employee records upon logout', async () => {
      queryClient.setQueryData(['employee-detail', 1], mockEmployees[0]);
      expect(queryClient.getQueryData(['employee-detail', 1])).toBeDefined();

      useAuthStore.getState().logout();

      expect(queryClient.getQueryData(['employee-detail', 1])).toBeUndefined();
    });
  });
});
