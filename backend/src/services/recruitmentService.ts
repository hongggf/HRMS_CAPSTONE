import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';

// ========== Job Requisition ==========
export const createRequisition = async (workforceRequestId: number, requestedBy: number) => {
  const wfReq = await prisma.workforceRequest.findUnique({ where: { id: workforceRequestId } });
  if (!wfReq) throw new AppError('Workforce Request not found', 404);
  if (wfReq.status !== 'APPROVED') throw new AppError('Only APPROVED workforce requests can generate a job requisition', 400);

  const existingReq = await prisma.jobRequisition.findUnique({ where: { workforceRequestId } });
  if (existingReq) throw new AppError('A Job Requisition already exists for this Workforce Request', 409);

  return await prisma.jobRequisition.create({
    data: {
      workforceRequestId,
      requestedBy,
      status: 'DRAFT',
    },
    include: { workforceRequest: true },
  });
};

export const getRequisitionById = async (id: number) => {
  const req = await prisma.jobRequisition.findUnique({
    where: { id },
    include: { workforceRequest: true, jobPosting: true },
  });
  if (!req) throw new AppError('Job Requisition not found', 404);
  return req;
};

export const listRequisitions = async (page: number, limit: number, status?: string) => {
  const skip = (page - 1) * limit;
  const where: Prisma.JobRequisitionWhereInput = status ? { status: status as any } : {};

  const [total, requisitions] = await Promise.all([
    prisma.jobRequisition.count({ where }),
    prisma.jobRequisition.findMany({ where, skip, take: limit, include: { workforceRequest: true } }),
  ]);

  return { total, requisitions };
};

export const updateRequisitionStatus = async (id: number, status: string) => {
  const req = await prisma.jobRequisition.findUnique({ where: { id } });
  if (!req) throw new AppError('Job Requisition not found', 404);
  return await prisma.jobRequisition.update({
    where: { id },
    data: { status: status as any },
  });
};

// ========== Job Posting ==========
export const createJobPosting = async (data: any) => {
  const req = await prisma.jobRequisition.findUnique({ where: { id: data.requisitionId } });
  if (!req) throw new AppError('Job Requisition not found', 404);
  if (req.status !== 'APPROVED') throw new AppError('Job Requisition must be APPROVED to create a posting', 400);

  const existing = await prisma.jobPosting.findUnique({ where: { requisitionId: data.requisitionId } });
  if (existing) throw new AppError('A Job Posting already exists for this requisition', 409);

  return await prisma.jobPosting.create({ data: { ...data, status: 'DRAFT' } });
};

export const updateJobPosting = async (id: number, data: any) => {
  const posting = await prisma.jobPosting.findUnique({ where: { id } });
  if (!posting) throw new AppError('Job Posting not found', 404);
  return await prisma.jobPosting.update({ where: { id }, data });
};

export const listJobPostings = async (page: number, limit: number, status?: string) => {
  const skip = (page - 1) * limit;
  const where: Prisma.JobPostingWhereInput = status ? { status: status as any } : {};
  const [total, postings] = await Promise.all([
    prisma.jobPosting.count({ where }),
    prisma.jobPosting.findMany({ where, skip, take: limit }),
  ]);
  return { total, postings };
};

export const getJobPostingById = async (id: number) => {
  const posting = await prisma.jobPosting.findUnique({ where: { id }, include: { applications: true } });
  if (!posting) throw new AppError('Job Posting not found', 404);
  return posting;
};

// ========== Candidate & Application ==========
export const createApplication = async (data: any) => {
  const posting = await prisma.jobPosting.findUnique({ where: { id: data.jobPostingId } });
  if (!posting) throw new AppError('Job Posting not found', 404);
  if (posting.status !== 'PUBLISHED') throw new AppError('Cannot apply to an unpublished job posting', 400);

  let candidate = await prisma.candidate.findUnique({ where: { email: data.email } });
  if (!candidate) {
    candidate = await prisma.candidate.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        resumeUrl: data.resumeUrl,
        source: data.source,
      },
    });
  }

  const existingApp = await prisma.application.findUnique({
    where: { candidateId_jobPostingId: { candidateId: candidate.id, jobPostingId: data.jobPostingId } },
  });
  if (existingApp) throw new AppError('Candidate has already applied for this job posting', 409);

  const application = await prisma.application.create({
    data: {
      candidateId: candidate.id,
      jobPostingId: data.jobPostingId,
      status: 'APPLIED',
      statusHistory: {
        create: { status: 'APPLIED', notes: 'Initial application' },
      },
    },
    include: { candidate: true },
  });

  return application;
};

export const updateApplicationStatus = async (id: number, status: string, changedById: number, notes?: string) => {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new AppError('Application not found', 404);

  // Status transitions
  const validTransitions: Record<string, string[]> = {
    'APPLIED': ['SCREENING', 'REJECTED', 'WITHDRAWN'],
    'SCREENING': ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
    'SHORTLISTED': ['INTERVIEW', 'REJECTED', 'WITHDRAWN'],
    'INTERVIEW': ['SELECTED', 'REJECTED', 'WITHDRAWN'],
    'SELECTED': ['PENDING_HEAD_OF_HR_APPROVAL', 'REJECTED', 'WITHDRAWN'],
    'PENDING_HEAD_OF_HR_APPROVAL': ['APPROVED', 'REJECTED', 'WITHDRAWN'],
    'APPROVED': ['HIRED', 'WITHDRAWN'],
  };

  const allowed = validTransitions[app.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(`Invalid status transition from ${app.status} to ${status}`, 400);
  }

  return await prisma.application.update({
    where: { id },
    data: {
      status: status as any,
      statusHistory: {
        create: { status: status as any, changedById, notes },
      },
    },
    include: { candidate: true },
  });
};

// ========== Interview ==========
export const createInterview = async (data: any) => {
  const app = await prisma.application.findUnique({ where: { id: data.applicationId } });
  if (!app) throw new AppError('Application not found', 404);
  
  if (app.status !== 'SHORTLISTED' && app.status !== 'INTERVIEW') {
    throw new AppError('Application must be in SHORTLISTED or INTERVIEW status to schedule an interview', 400);
  }

  if (app.status === 'SHORTLISTED') {
    await updateApplicationStatus(app.id, 'INTERVIEW', data.interviewerId, 'Auto-transitioned due to interview scheduling');
  }

  return await prisma.interview.create({ data });
};

export const updateInterview = async (id: number, data: any) => {
  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview) throw new AppError('Interview not found', 404);
  return await prisma.interview.update({ where: { id }, data });
};

export const submitInterviewEvaluation = async (id: number, data: any) => {
  const interview = await prisma.interview.findUnique({ where: { id }, include: { evaluation: true } });
  if (!interview) throw new AppError('Interview not found', 404);
  if (interview.evaluation) throw new AppError('Interview evaluation already submitted', 409);

  if (interview.status !== 'COMPLETED') {
    await prisma.interview.update({ where: { id }, data: { status: 'COMPLETED' } });
  }

  return await prisma.interviewEvaluation.create({
    data: { ...data, interviewId: id },
  });
};
