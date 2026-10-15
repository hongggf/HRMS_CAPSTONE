import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

// ========== Job Requisition Validators ==========
export const createRequisitionSchema = z.object({
  body: z.object({
    workforceRequestId: z.number().int().positive('Workforce Request ID is required'),
  }),
});

export const listRequisitionsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED']).optional(),
  }),
});

export const updateRequisitionStatusSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/).transform(Number) }),
  body: z.object({
    status: z.enum(['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED']),
  }),
});

// ========== Job Posting Validators ==========
export const createJobPostingSchema = z.object({
  body: z.object({
    requisitionId: z.number().int().positive('Requisition ID is required'),
    title: z.string().min(1, 'Title is required').max(100),
    description: z.string().min(1, 'Description is required'),
    requirements: z.string().min(1, 'Requirements are required'),
    location: z.string().min(1, 'Location is required'),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']),
    openingDate: z.string().datetime(),
    closingDate: z.string().datetime().optional().nullable(),
  }),
});

export const updateJobPostingSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/).transform(Number) }),
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().min(1).optional(),
    requirements: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).optional(),
    openingDate: z.string().datetime().optional(),
    closingDate: z.string().datetime().optional().nullable(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).optional(),
  }),
});

export const listJobPostingsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).optional(),
  }),
});

// ========== Candidate & Application Validators ==========
export const createCandidateSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional().nullable(),
    resumeUrl: z.string().url('Invalid resume URL').optional().nullable(),
    source: z.string().optional().nullable(),
  }),
});

export const listCandidatesSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    search: z.string().optional(),
  }),
});

export const createApplicationSchema = z.object({
  body: z.object({
    jobPostingId: z.number().int().positive(),
    candidateId: z.number().int().positive().optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional().nullable(),
    resumeUrl: z.string().url().optional().nullable(),
    source: z.string().optional().nullable(),
  }),
});

export const listApplicationsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    jobPostingId: z.string().regex(/^\d+$/).transform(Number).optional(),
    candidateId: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum([
      'APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 
      'SELECTED', 'PENDING_HEAD_OF_HR_APPROVAL', 
      'APPROVED', 'REJECTED', 'WITHDRAWN', 'HIRED'
    ]).optional(),
    search: z.string().optional(),
  }),
});

export const updateApplicationStatusSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/).transform(Number) }),
  body: z.object({
    status: z.enum([
      'APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 
      'SELECTED', 'PENDING_HEAD_OF_HR_APPROVAL', 
      'APPROVED', 'REJECTED', 'WITHDRAWN', 'HIRED'
    ]),
    notes: z.string().optional(),
  }),
});

// ========== Interview Validators ==========
export const createInterviewSchema = z.object({
  body: z.object({
    applicationId: z.number().int().positive(),
    interviewerId: z.number().int().positive(),
    scheduledAt: z.string().datetime(),
    type: z.enum(['HR', 'TECHNICAL', 'BEHAVIORAL', 'FINAL']),
    location: z.string().optional(),
  }),
});

export const updateInterviewSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/).transform(Number) }),
  body: z.object({
    interviewerId: z.number().int().positive().optional(),
    scheduledAt: z.string().datetime().optional(),
    location: z.string().optional(),
    status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  }),
});

export const listInterviewsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    applicationId: z.string().regex(/^\d+$/).transform(Number).optional(),
    interviewerId: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  }),
});

export const submitInterviewEvaluationSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/).transform(Number) }),
  body: z.object({
    score: z.number().min(0).max(100),
    strengths: z.string().min(1),
    weaknesses: z.string().min(1),
    recommendation: z.string().min(1),
    comments: z.string().optional(),
  }),
});
