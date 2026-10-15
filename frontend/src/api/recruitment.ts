import { apiClient } from './client';
import { ApiResponse } from '../types/api';
import {
  JobRequisition,
  CreateRequisitionInput,
  ListRequisitionsQuery,
  RequisitionStatus,
  JobPosting,
  CreateJobPostingInput,
  UpdateJobPostingInput,
  ListJobPostingsQuery,
  Candidate,
  CreateCandidateInput,
  ListCandidatesQuery,
  Application,
  CreateApplicationInput,
  ListApplicationsQuery,
  ApplicationStatus,
  Interview,
  CreateInterviewInput,
  UpdateInterviewInput,
  ListInterviewsQuery,
  SubmitEvaluationInput,
  InterviewEvaluation,
} from '../types/recruitment';

export const recruitmentApi = {
  // Requisitions
  listRequisitions: async (
    params?: ListRequisitionsQuery,
  ): Promise<{
    requisitions: JobRequisition[];
    meta: ApiResponse<unknown>['meta'];
  }> => {
    const res = await apiClient.get<
      ApiResponse<{ requisitions: JobRequisition[] }>
    >('/recruitment/requisitions', {
      params: {
        page: params?.page,
        limit: params?.limit,
        status: params?.status,
      },
    });
    return {
      requisitions: res.data.data.requisitions,
      meta: res.data.meta,
    };
  },

  getRequisition: async (id: number): Promise<JobRequisition> => {
    const res = await apiClient.get<
      ApiResponse<{ requisition: JobRequisition }>
    >(`/recruitment/requisitions/${id}`);
    return res.data.data.requisition;
  },

  createRequisition: async (
    data: CreateRequisitionInput,
  ): Promise<JobRequisition> => {
    const res = await apiClient.post<
      ApiResponse<{ requisition: JobRequisition }>
    >('/recruitment/requisitions', data);
    return res.data.data.requisition;
  },

  updateRequisitionStatus: async (
    id: number,
    status: RequisitionStatus,
  ): Promise<JobRequisition> => {
    const res = await apiClient.put<
      ApiResponse<{ requisition: JobRequisition }>
    >(`/recruitment/requisitions/${id}/status`, { status });
    return res.data.data.requisition;
  },

  // Job Postings
  listJobPostings: async (
    params?: ListJobPostingsQuery,
  ): Promise<{
    postings: JobPosting[];
    meta: ApiResponse<unknown>['meta'];
  }> => {
    const res = await apiClient.get<ApiResponse<{ postings: JobPosting[] }>>(
      '/recruitment/postings',
      {
        params: {
          page: params?.page,
          limit: params?.limit,
          status: params?.status,
        },
      },
    );
    return {
      postings: res.data.data.postings,
      meta: res.data.meta,
    };
  },

  getJobPosting: async (id: number): Promise<JobPosting> => {
    const res = await apiClient.get<ApiResponse<{ jobPosting: JobPosting }>>(
      `/recruitment/postings/${id}`,
    );
    return res.data.data.jobPosting;
  },

  createJobPosting: async (
    data: CreateJobPostingInput,
  ): Promise<JobPosting> => {
    const res = await apiClient.post<ApiResponse<{ jobPosting: JobPosting }>>(
      '/recruitment/postings',
      data,
    );
    return res.data.data.jobPosting;
  },

  updateJobPosting: async (
    id: number,
    data: UpdateJobPostingInput,
  ): Promise<JobPosting> => {
    const res = await apiClient.put<ApiResponse<{ jobPosting: JobPosting }>>(
      `/recruitment/postings/${id}`,
      data,
    );
    return res.data.data.jobPosting;
  },

  // Candidates
  listCandidates: async (
    params?: ListCandidatesQuery,
  ): Promise<{
    candidates: Candidate[];
    meta: ApiResponse<unknown>['meta'];
  }> => {
    const res = await apiClient.get<ApiResponse<{ candidates: Candidate[] }>>(
      '/recruitment/candidates',
      {
        params: {
          page: params?.page,
          limit: params?.limit,
          search: params?.search,
        },
      },
    );
    return {
      candidates: res.data.data.candidates,
      meta: res.data.meta,
    };
  },

  getCandidate: async (id: number): Promise<Candidate> => {
    const res = await apiClient.get<ApiResponse<{ candidate: Candidate }>>(
      `/recruitment/candidates/${id}`,
    );
    return res.data.data.candidate;
  },

  createCandidate: async (data: CreateCandidateInput): Promise<Candidate> => {
    const res = await apiClient.post<ApiResponse<{ candidate: Candidate }>>(
      '/recruitment/candidates',
      data,
    );
    return res.data.data.candidate;
  },

  // Applications
  listApplications: async (
    params?: ListApplicationsQuery,
  ): Promise<{
    applications: Application[];
    meta: ApiResponse<unknown>['meta'];
  }> => {
    const res = await apiClient.get<
      ApiResponse<{ applications: Application[] }>
    >('/recruitment/applications', {
      params: {
        page: params?.page,
        limit: params?.limit,
        jobPostingId: params?.jobPostingId,
        candidateId: params?.candidateId,
        status: params?.status,
        search: params?.search,
      },
    });
    return {
      applications: res.data.data.applications,
      meta: res.data.meta,
    };
  },

  getApplication: async (id: number): Promise<Application> => {
    const res = await apiClient.get<
      ApiResponse<{ application: Application }>
    >(`/recruitment/applications/${id}`);
    return res.data.data.application;
  },

  createApplication: async (
    data: CreateApplicationInput,
  ): Promise<Application> => {
    const res = await apiClient.post<
      ApiResponse<{ application: Application }>
    >('/recruitment/applications', data);
    return res.data.data.application;
  },

  updateApplicationStatus: async (
    id: number,
    status: ApplicationStatus,
    notes?: string,
  ): Promise<Application> => {
    const res = await apiClient.put<
      ApiResponse<{ application: Application }>
    >(`/recruitment/applications/${id}/status`, { status, notes });
    return res.data.data.application;
  },

  approveCandidate: async (id: number): Promise<Application> => {
    const res = await apiClient.post<
      ApiResponse<{ application: Application }>
    >(`/recruitment/applications/${id}/approve`);
    return res.data.data.application;
  },

  rejectCandidate: async (id: number): Promise<Application> => {
    const res = await apiClient.post<
      ApiResponse<{ application: Application }>
    >(`/recruitment/applications/${id}/reject`);
    return res.data.data.application;
  },

  // Interviews
  listInterviews: async (
    params?: ListInterviewsQuery,
  ): Promise<{
    interviews: Interview[];
    meta: ApiResponse<unknown>['meta'];
  }> => {
    const res = await apiClient.get<ApiResponse<{ interviews: Interview[] }>>(
      '/recruitment/interviews',
      {
        params: {
          page: params?.page,
          limit: params?.limit,
          applicationId: params?.applicationId,
          interviewerId: params?.interviewerId,
          status: params?.status,
        },
      },
    );
    return {
      interviews: res.data.data.interviews,
      meta: res.data.meta,
    };
  },

  getInterview: async (id: number): Promise<Interview> => {
    const res = await apiClient.get<ApiResponse<{ interview: Interview }>>(
      `/recruitment/interviews/${id}`,
    );
    return res.data.data.interview;
  },

  createInterview: async (data: CreateInterviewInput): Promise<Interview> => {
    const res = await apiClient.post<ApiResponse<{ interview: Interview }>>(
      '/recruitment/interviews',
      data,
    );
    return res.data.data.interview;
  },

  updateInterview: async (
    id: number,
    data: UpdateInterviewInput,
  ): Promise<Interview> => {
    const res = await apiClient.put<ApiResponse<{ interview: Interview }>>(
      `/recruitment/interviews/${id}`,
      data,
    );
    return res.data.data.interview;
  },

  submitInterviewEvaluation: async (
    id: number,
    data: SubmitEvaluationInput,
  ): Promise<InterviewEvaluation> => {
    const res = await apiClient.post<
      ApiResponse<{ evaluation: InterviewEvaluation }>
    >(`/recruitment/interviews/${id}/evaluate`, data);
    return res.data.data.evaluation;
  },
};
