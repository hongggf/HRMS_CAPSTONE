import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecruitmentPage } from '../pages/recruitment/RecruitmentPage';
import { recruitmentApi } from '../api/recruitment';
import { workforceApi } from '../api/workforce';
import { useAuthStore } from '../store/useAuthStore';
import {
  JobRequisition,
  JobPosting,
  Candidate,
  Application,
  Interview,
} from '../types/recruitment';

const mockRequisitions: JobRequisition[] = [
  {
    id: 1,
    workforceRequestId: 10,
    requestedBy: 2,
    status: 'SUBMITTED',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    workforceRequest: {
      id: 10,
      departmentId: 1,
      positionId: 1,
      requestedBy: 2,
      headcount: 2,
      justification: 'Cloud expansion project',
      status: 'APPROVED',
      createdAt: '2026-02-15T00:00:00Z',
      updatedAt: '2026-02-15T00:00:00Z',
      department: { id: 1, name: 'Engineering', code: 'ENG' },
      position: { id: 1, title: 'Senior Backend Engineer', code: 'ENG_BE' },
    },
    requester: { id: 2, email: 'recruiter@example.com' },
    jobPosting: null,
  },
  {
    id: 2,
    workforceRequestId: 11,
    requestedBy: 2,
    status: 'APPROVED',
    createdAt: '2026-03-02T10:00:00Z',
    updatedAt: '2026-03-02T10:00:00Z',
    workforceRequest: {
      id: 11,
      departmentId: 2,
      positionId: 2,
      requestedBy: 2,
      headcount: 1,
      justification: 'HR compliance expansion',
      status: 'APPROVED',
      createdAt: '2026-02-18T00:00:00Z',
      updatedAt: '2026-02-18T00:00:00Z',
      department: { id: 2, name: 'Human Resources', code: 'HR' },
      position: { id: 2, title: 'Talent Acquisition Partner', code: 'HR_TA' },
    },
    requester: { id: 2, email: 'recruiter@example.com' },
    jobPosting: null,
  },
];

const mockJobPostings: JobPosting[] = [
  {
    id: 101,
    requisitionId: 2,
    title: 'Senior Backend Engineer',
    description: 'We are seeking a senior Go and Node engineer.',
    requirements: '5+ years experience with distributed systems.',
    location: 'Remote, US',
    employmentType: 'FULL_TIME',
    openingDate: '2026-03-05T00:00:00Z',
    closingDate: '2026-04-05T00:00:00Z',
    status: 'PUBLISHED',
    createdAt: '2026-03-05T00:00:00Z',
    updatedAt: '2026-03-05T00:00:00Z',
    _count: { applications: 2 },
  },
  {
    id: 102,
    requisitionId: 3,
    title: 'Frontend React Architect',
    description: 'Lead architecture for enterprise web app.',
    requirements: 'Deep expertise in React, TypeScript, and state machines.',
    location: 'New York HQ',
    employmentType: 'FULL_TIME',
    openingDate: '2026-03-06T00:00:00Z',
    closingDate: null,
    status: 'DRAFT',
    createdAt: '2026-03-06T00:00:00Z',
    updatedAt: '2026-03-06T00:00:00Z',
    _count: { applications: 0 },
  },
];

const mockCandidates: Candidate[] = [
  {
    id: 501,
    firstName: 'Sarah',
    lastName: 'Connor',
    email: 'sarah.connor@cyberdyne.io',
    phone: '+1 555-019-8371',
    resumeUrl: 'https://storage.example.com/resumes/sarah.pdf',
    source: 'LinkedIn',
    createdAt: '2026-03-07T00:00:00Z',
    updatedAt: '2026-03-07T00:00:00Z',
    applications: [],
  },
  {
    id: 502,
    firstName: 'Marcus',
    lastName: 'Wright',
    email: 'marcus.wright@resistance.org',
    phone: '+1 555-014-2231',
    resumeUrl: null,
    source: 'Employee Referral',
    createdAt: '2026-03-08T00:00:00Z',
    updatedAt: '2026-03-08T00:00:00Z',
    applications: [],
  },
];

const mockApplications: Application[] = [
  {
    id: 1001,
    candidateId: 501,
    jobPostingId: 101,
    status: 'SHORTLISTED',
    createdAt: '2026-03-08T12:00:00Z',
    updatedAt: '2026-03-09T14:00:00Z',
    candidate: mockCandidates[0],
    jobPosting: mockJobPostings[0],
    interviews: [],
    statusHistory: [
      {
        id: 1,
        applicationId: 1001,
        status: 'APPLIED',
        createdAt: '2026-03-08T12:00:00Z',
        changedBy: { id: 2, email: 'recruiter@example.com' },
        notes: 'Initial application received',
      },
      {
        id: 2,
        applicationId: 1001,
        status: 'SCREENING',
        createdAt: '2026-03-09T09:00:00Z',
        changedBy: { id: 2, email: 'recruiter@example.com' },
        notes: 'Resume verified against job requirements',
      },
      {
        id: 3,
        applicationId: 1001,
        status: 'SHORTLISTED',
        createdAt: '2026-03-09T14:00:00Z',
        changedBy: { id: 2, email: 'recruiter@example.com' },
        notes: 'Ready for technical interview round',
      },
    ],
  },
  {
    id: 1002,
    candidateId: 502,
    jobPostingId: 101,
    status: 'PENDING_HEAD_OF_HR_APPROVAL',
    createdAt: '2026-03-05T12:00:00Z',
    updatedAt: '2026-03-10T16:00:00Z',
    candidate: mockCandidates[1],
    jobPosting: mockJobPostings[0],
    interviews: [
      {
        id: 301,
        applicationId: 1002,
        interviewerId: 1,
        scheduledAt: '2026-03-08T10:00:00Z',
        type: 'TECHNICAL',
        location: 'Zoom Room Alpha',
        status: 'COMPLETED',
        createdAt: '2026-03-06T00:00:00Z',
        updatedAt: '2026-03-08T11:00:00Z',
        interviewer: { id: 1, email: 'headhr@example.com' },
        evaluation: {
          id: 401,
          interviewId: 301,
          score: 92,
          strengths: 'Exceptional systems design knowledge and leadership.',
          weaknesses: 'None critical.',
          recommendation: 'Strong Hire',
          comments: 'Top 5% candidate. Fast-track offer recommended.',
          createdAt: '2026-03-08T11:05:00Z',
          updatedAt: '2026-03-08T11:05:00Z',
        },
      },
    ],
    statusHistory: [
      {
        id: 4,
        applicationId: 1002,
        status: 'PENDING_HEAD_OF_HR_APPROVAL',
        createdAt: '2026-03-10T16:00:00Z',
        changedBy: { id: 2, email: 'recruiter@example.com' },
        notes: 'Submitted for executive hiring authorization',
      },
    ],
  },
];

const mockInterviews: Interview[] = [
  {
    id: 301,
    applicationId: 1002,
    interviewerId: 1,
    scheduledAt: '2026-03-08T10:00:00Z',
    type: 'TECHNICAL',
    location: 'Zoom Room Alpha',
    status: 'COMPLETED',
    createdAt: '2026-03-06T00:00:00Z',
    updatedAt: '2026-03-08T11:00:00Z',
    application: mockApplications[1],
    interviewer: { id: 1, email: 'headhr@example.com' },
    evaluation: {
      id: 401,
      interviewId: 301,
      score: 92,
      strengths: 'Exceptional systems design knowledge.',
      weaknesses: 'None critical.',
      recommendation: 'Strong Hire',
      comments: 'Fast-track offer recommended.',
      createdAt: '2026-03-08T11:05:00Z',
      updatedAt: '2026-03-08T11:05:00Z',
    },
  },
  {
    id: 302,
    applicationId: 1001,
    interviewerId: 2,
    scheduledAt: '2026-03-15T15:00:00Z',
    type: 'TECHNICAL',
    location: 'Google Meet',
    status: 'SCHEDULED',
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
    application: mockApplications[0],
    interviewer: { id: 2, email: 'recruiter@example.com' },
    evaluation: null,
  },
];

describe('Phase 4: Recruitment & Applicant Tracking System (ATS)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    useAuthStore.setState({
      accessToken: 'fake-token',
      user: {
        id: 1,
        email: 'headhr@example.com',
        roles: ['HEAD_OF_HR', 'HR_RECRUITMENT'],
      },
    });

    // Default API mocks
    vi.spyOn(recruitmentApi, 'listApplications').mockResolvedValue({
      applications: mockApplications,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
    vi.spyOn(recruitmentApi, 'listRequisitions').mockResolvedValue({
      requisitions: mockRequisitions,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
    vi.spyOn(recruitmentApi, 'listJobPostings').mockResolvedValue({
      postings: mockJobPostings,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
    vi.spyOn(recruitmentApi, 'listCandidates').mockResolvedValue({
      candidates: mockCandidates,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
    vi.spyOn(recruitmentApi, 'listInterviews').mockResolvedValue({
      interviews: mockInterviews,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
    vi.spyOn(workforceApi, 'list').mockResolvedValue({
      workforceRequests: [
        {
          id: 12,
          departmentId: 1,
          positionId: 1,
          requestedBy: 1,
          headcount: 3,
          justification: 'DevOps scaling',
          status: 'APPROVED',
          createdAt: '2026-03-01T00:00:00Z',
          updatedAt: '2026-03-01T00:00:00Z',
          department: { id: 1, name: 'Engineering', code: 'ENG' },
          position: { id: 1, title: 'DevOps Engineer', code: 'ENG_DEVOPS' },
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <RecruitmentPage />
      </QueryClientProvider>,
    );

  it('renders primary ATS dashboard with operational metrics and applications table', async () => {
    renderComponent();

    expect(screen.getByText('Recruitment & Applicant Tracking (ATS)')).toBeInTheDocument();
    expect(screen.getByText('Open Vacancies')).toBeInTheDocument();
    expect(screen.getByText('Active Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Scheduled Interviews')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('Marcus Wright')).toBeInTheDocument();
      expect(screen.getByText('Shortlisted')).toBeInTheDocument();
      expect(screen.getAllByText('Pending Head of HR Approval').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('switches between Table view and Pipeline Kanban board', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });

    // Click Kanban Radio Button
    const kanbanButton = screen.getByText('Pipeline Board');
    fireEvent.click(kanbanButton);

    await waitFor(() => {
      expect(screen.getAllByText('Shortlisted').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Pending Head of HR Approval').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });
  });

  it('protects candidate contact info when viewed by unauthorized roles', async () => {
    // Switch to role without RECRUITMENT_READ (e.g. attendance officer)
    useAuthStore.setState({
      accessToken: 'fake-token',
      user: {
        id: 99,
        email: 'officer@example.com',
        roles: ['HR_ATTENDANCE'],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('s***r@cyberdyne.io')).toBeInTheDocument();
      expect(screen.getByText('+1 ****71')).toBeInTheDocument();
      expect(screen.queryByText('sarah.connor@cyberdyne.io')).not.toBeInTheDocument();
    });
  });

  it('Head of HR approves a candidate pending approval', async () => {
    const approveSpy = vi.spyOn(recruitmentApi, 'approveCandidate').mockResolvedValue({
      ...mockApplications[1],
      status: 'APPROVED',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Marcus Wright')).toBeInTheDocument();
    });

    // Marcus Wright is in PENDING_HEAD_OF_HR_APPROVAL, so Approve button is visible for Head of HR
    const approveButtons = screen.getAllByRole('button', { name: /Approve/i });
    expect(approveButtons.length).toBeGreaterThan(0);

    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith(1002);
    });
  });

  it('switches to Requisitions tab and displays requisitions list', async () => {
    renderComponent();

    const requisitionsTab = screen.getByRole('tab', { name: /Job Requisitions/i });
    fireEvent.click(requisitionsTab);

    await waitFor(() => {
      expect(screen.getAllByText('Senior Backend Engineer').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Talent Acquisition Partner')).toBeInTheDocument();
      expect(screen.getByText('#1')).toBeInTheDocument();
    });
  });

  it('switches to Job Postings tab and displays postings', async () => {
    renderComponent();

    const postingsTab = screen.getByRole('tab', { name: /Job Postings/i });
    fireEvent.click(postingsTab);

    await waitFor(() => {
      expect(screen.getByText('Frontend React Architect')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Published')).toBeInTheDocument();
    });
  });

  it('switches to Candidate Profiles tab and searches candidates', async () => {
    renderComponent();

    const candidatesTab = screen.getByRole('tab', { name: /Candidate Profiles/i });
    fireEvent.click(candidatesTab);

    await waitFor(() => {
      expect(screen.getAllByText('Sarah Connor').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Marcus Wright').length).toBeGreaterThanOrEqual(1);
    });

    // Enter search term
    const searchInput = screen.getByPlaceholderText(/Search candidate name, email, or phone/i);
    fireEvent.change(searchInput, { target: { value: 'Sarah' } });

    await waitFor(() => {
      expect(recruitmentApi.listCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Sarah' }),
      );
    });
  });

  it('switches to Interviews tab and displays evaluation details', async () => {
    renderComponent();

    const interviewsTab = screen.getByRole('tab', { name: /Interviews & Evaluations/i });
    fireEvent.click(interviewsTab);

    await waitFor(() => {
      expect(screen.getAllByText('TECHNICAL').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('92/100')).toBeInTheDocument();
      expect(screen.getByText('Strong Hire')).toBeInTheDocument();
    });
  });

  it('handles backend validation error when scheduling conflicting interview', async () => {
    const errorResponse = {
      isAxiosError: true,
      response: {
        data: {
          success: false,
          error: {
            message: 'Interviewer has a scheduling conflict with another interview at this time',
          },
        },
      },
    };
    vi.spyOn(recruitmentApi, 'createInterview').mockRejectedValue(errorResponse);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });

    // Click Interview button for Sarah Connor (in SHORTLISTED stage)
    const interviewButtons = screen.getAllByRole('button', { name: /Interview/i });
    expect(interviewButtons.length).toBeGreaterThan(0);
    fireEvent.click(interviewButtons[0]);

    // Expect modal to be open
    await waitFor(() => {
      expect(screen.getByText('Schedule Interview Session')).toBeInTheDocument();
    });

    // Fill location and submit
    const locationInput = screen.getByPlaceholderText(/Google Meet/i);
    fireEvent.change(locationInput, { target: { value: 'Zoom Conflict Room' } });

    const submitBtn = screen.getByRole('button', { name: /Schedule Session/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Interviewer has a scheduling conflict with another interview at this time/i),
      ).toBeInTheDocument();
    });
  });

  it('handles empty pipeline queries gracefully without error', async () => {
    vi.spyOn(recruitmentApi, 'listApplications').mockResolvedValue({
      applications: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    renderComponent();

    await waitFor(() => {
      expect(document.querySelector('.ant-empty')).toBeInTheDocument();
    });
  });
});
