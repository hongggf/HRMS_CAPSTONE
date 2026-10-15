import { WorkforceRequest } from './workforce';

export type RequisitionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED';

export type JobPostingStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export type ApplicationStatus =
  | 'APPLIED'
  | 'SCREENING'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'PENDING_HEAD_OF_HR_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'HIRED';

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERNSHIP';

export type InterviewType = 'HR' | 'TECHNICAL' | 'BEHAVIORAL' | 'FINAL';

export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface Candidate {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  resumeUrl?: string | null;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
  applications?: Application[];
}

export interface InterviewEvaluation {
  id: number;
  interviewId: number;
  score: number;
  strengths: string;
  weaknesses: string;
  recommendation: string;
  comments?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Interview {
  id: number;
  applicationId: number;
  interviewerId: number;
  scheduledAt: string;
  type: InterviewType;
  location?: string | null;
  status: InterviewStatus;
  createdAt: string;
  updatedAt: string;
  application?: Application;
  interviewer?: {
    id: number;
    email: string;
  };
  evaluation?: InterviewEvaluation | null;
}

export interface CandidateStatusHistory {
  id: number;
  applicationId: number;
  status: ApplicationStatus;
  changedById?: number | null;
  notes?: string | null;
  createdAt: string;
  changedBy?: {
    id: number;
    email: string;
  } | null;
}

export interface JobPosting {
  id: number;
  requisitionId: number;
  title: string;
  description: string;
  requirements: string;
  location: string;
  employmentType: EmploymentType;
  openingDate: string;
  closingDate?: string | null;
  status: JobPostingStatus;
  createdAt: string;
  updatedAt: string;
  requisition?: JobRequisition;
  applications?: Application[];
  _count?: {
    applications: number;
  };
}

export interface JobRequisition {
  id: number;
  workforceRequestId: number;
  requestedBy: number;
  status: RequisitionStatus;
  createdAt: string;
  updatedAt: string;
  workforceRequest?: WorkforceRequest;
  requester?: {
    id: number;
    email: string;
  };
  jobPosting?: JobPosting | null;
}

export interface Application {
  id: number;
  candidateId: number;
  jobPostingId: number;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  candidate?: Candidate;
  jobPosting?: JobPosting;
  interviews?: Interview[];
  statusHistory?: CandidateStatusHistory[];
}

export interface CreateRequisitionInput {
  workforceRequestId: number;
}

export interface UpdateRequisitionStatusInput {
  status: RequisitionStatus;
}

export interface CreateJobPostingInput {
  requisitionId: number;
  title: string;
  description: string;
  requirements: string;
  location: string;
  employmentType: EmploymentType;
  openingDate: string;
  closingDate?: string | null;
}

export interface UpdateJobPostingInput {
  title?: string;
  description?: string;
  requirements?: string;
  location?: string;
  employmentType?: EmploymentType;
  openingDate?: string;
  closingDate?: string | null;
  status?: JobPostingStatus;
}

export interface CreateCandidateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  resumeUrl?: string | null;
  source?: string | null;
}

export interface CreateApplicationInput {
  jobPostingId: number;
  candidateId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  resumeUrl?: string | null;
  source?: string | null;
}

export interface UpdateApplicationStatusInput {
  status: ApplicationStatus;
  notes?: string;
}

export interface CreateInterviewInput {
  applicationId: number;
  interviewerId: number;
  scheduledAt: string;
  type: InterviewType;
  location?: string;
}

export interface UpdateInterviewInput {
  interviewerId?: number;
  scheduledAt?: string;
  location?: string;
  status?: InterviewStatus;
}

export interface SubmitEvaluationInput {
  score: number;
  strengths: string;
  weaknesses: string;
  recommendation: string;
  comments?: string;
}

export interface ListRequisitionsQuery {
  page?: number;
  limit?: number;
  status?: RequisitionStatus;
}

export interface ListJobPostingsQuery {
  page?: number;
  limit?: number;
  status?: JobPostingStatus;
}

export interface ListCandidatesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListApplicationsQuery {
  page?: number;
  limit?: number;
  jobPostingId?: number;
  candidateId?: number;
  status?: ApplicationStatus;
  search?: string;
}

export interface ListInterviewsQuery {
  page?: number;
  limit?: number;
  applicationId?: number;
  interviewerId?: number;
  status?: InterviewStatus;
}

export const APPLICATION_VALID_TRANSITIONS: Record<
  ApplicationStatus,
  ApplicationStatus[]
> = {
  APPLIED: ['SCREENING', 'REJECTED', 'WITHDRAWN'],
  SCREENING: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['INTERVIEW', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW: ['SELECTED', 'REJECTED', 'WITHDRAWN'],
  SELECTED: ['PENDING_HEAD_OF_HR_APPROVAL', 'REJECTED', 'WITHDRAWN'],
  PENDING_HEAD_OF_HR_APPROVAL: ['APPROVED', 'REJECTED', 'WITHDRAWN'],
  APPROVED: ['HIRED', 'WITHDRAWN'],
  REJECTED: [],
  WITHDRAWN: [],
  HIRED: [],
};

export const APPLICATION_STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string }
> = {
  APPLIED: { label: 'Applied', color: 'blue' },
  SCREENING: { label: 'Screening', color: 'cyan' },
  SHORTLISTED: { label: 'Shortlisted', color: 'purple' },
  INTERVIEW: { label: 'Interview', color: 'geekblue' },
  SELECTED: { label: 'Selected', color: 'orange' },
  PENDING_HEAD_OF_HR_APPROVAL: {
    label: 'Pending Head of HR Approval',
    color: 'gold',
  },
  APPROVED: { label: 'Approved', color: 'green' },
  REJECTED: { label: 'Rejected', color: 'red' },
  WITHDRAWN: { label: 'Withdrawn', color: 'default' },
  HIRED: { label: 'Hired', color: 'success' },
};
