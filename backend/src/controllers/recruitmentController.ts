import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';
import { prisma } from '../config/db';
import * as recruitmentService from '../services/recruitmentService';

// ========== Job Requisitions ==========
export const createRequisition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { workforceRequestId } = req.body;
    const reqData = await recruitmentService.createRequisition(workforceRequestId, req.user!.id);
    await logAudit('REQUISITION_CREATED', req.user!.id, { requisitionId: reqData.id });
    return sendSuccess(res, { requisition: reqData }, 'Requisition created successfully', undefined, 201);
  } catch (error) { next(error); }
};

export const listRequisitions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const { total, requisitions } = await recruitmentService.listRequisitions(page, limit, status);
    return sendSuccess(res, { requisitions }, 'Requisitions retrieved', { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

export const getRequisition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const requisition = await recruitmentService.getRequisitionById(id);
    return sendSuccess(res, { requisition }, 'Requisition retrieved successfully');
  } catch (error) { next(error); }
};

export const updateRequisitionStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const reqData = await recruitmentService.updateRequisitionStatus(id, status);
    await logAudit('REQUISITION_STATUS_UPDATED', req.user!.id, { requisitionId: id, status });
    return sendSuccess(res, { requisition: reqData }, 'Requisition status updated');
  } catch (error) { next(error); }
};

// ========== Job Postings ==========
export const createJobPosting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const posting = await recruitmentService.createJobPosting(req.body);
    await logAudit('JOB_POSTING_CREATED', req.user!.id, { jobPostingId: posting.id });
    return sendSuccess(res, { jobPosting: posting }, 'Job posting created successfully', undefined, 201);
  } catch (error) { next(error); }
};

export const getJobPosting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const jobPosting = await recruitmentService.getJobPostingById(id);
    return sendSuccess(res, { jobPosting }, 'Job posting retrieved successfully');
  } catch (error) { next(error); }
};

export const updateJobPosting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const posting = await recruitmentService.updateJobPosting(id, req.body);
    await logAudit('JOB_POSTING_UPDATED', req.user!.id, { jobPostingId: id });
    return sendSuccess(res, { jobPosting: posting }, 'Job posting updated');
  } catch (error) { next(error); }
};

export const listJobPostings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const { total, postings } = await recruitmentService.listJobPostings(page, limit, status);
    return sendSuccess(res, { postings }, 'Job postings retrieved', { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

// ========== Candidate Profiles ==========
export const createCandidate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const candidate = await recruitmentService.createCandidate(req.body);
    await logAudit('CANDIDATE_CREATED', req.user!.id, { candidateId: candidate.id });
    return sendSuccess(res, { candidate }, 'Candidate profile created successfully', undefined, 201);
  } catch (error) { next(error); }
};

export const listCandidates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const { total, candidates } = await recruitmentService.listCandidates(page, limit, search);
    return sendSuccess(res, { candidates }, 'Candidates retrieved successfully', { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

export const getCandidate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const candidate = await recruitmentService.getCandidateById(id);
    return sendSuccess(res, { candidate }, 'Candidate profile retrieved successfully');
  } catch (error) { next(error); }
};

// ========== Applications ==========
export const createApplication = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const app = await recruitmentService.createApplication(req.body);
    await logAudit('APPLICATION_CREATED', req.user?.id || null, { applicationId: app.id });
    return sendSuccess(res, { application: app }, 'Application submitted successfully', undefined, 201);
  } catch (error) { next(error); }
};

export const listApplications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const jobPostingId = req.query.jobPostingId ? parseInt(req.query.jobPostingId as string) : undefined;
    const candidateId = req.query.candidateId ? parseInt(req.query.candidateId as string) : undefined;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const { total, applications } = await recruitmentService.listApplications(page, limit, {
      jobPostingId,
      candidateId,
      status,
      search,
    });
    return sendSuccess(res, { applications }, 'Applications retrieved successfully', { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

export const getApplication = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const application = await recruitmentService.getApplicationById(id);
    return sendSuccess(res, { application }, 'Application retrieved successfully');
  } catch (error) { next(error); }
};

export const updateApplicationStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
    
    // RBAC Business Rules enforced here
    if (status === 'SELECTED' && !req.user!.roles.includes('HR_RECRUITMENT') && !req.user!.roles.includes('HEAD_OF_HR')) {
      throw new AppError('Only HR_RECRUITMENT or HEAD_OF_HR can select a candidate', 403);
    }
    if (status === 'APPROVED' && !req.user!.roles.includes('HEAD_OF_HR')) {
      throw new AppError('Only HEAD_OF_HR can approve a final candidate', 403);
    }

    const app = await recruitmentService.updateApplicationStatus(id, status, req.user!.id, notes);
    await logAudit('APPLICATION_STATUS_UPDATED', req.user!.id, { applicationId: id, status });
    return sendSuccess(res, { application: app }, `Application status updated to ${status}`);
  } catch (error) { next(error); }
};

// ========== Head of HR Specific Approval Workflow ==========
export const approveCandidate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const app = await recruitmentService.updateApplicationStatus(id, 'APPROVED', req.user!.id, 'Approved by Head of HR');
    await logAudit('CANDIDATE_APPROVED', req.user!.id, { applicationId: id });
    const fullApp = await prisma.application.findUnique({ where: { id }, include: { jobPosting: { include: { requisition: true } } } });
    if (fullApp?.jobPosting?.requisition?.requestedBy) {
      await notifyUser(fullApp.jobPosting.requisition.requestedBy, 'Candidate Approved', `Candidate for ${fullApp.jobPosting.title} approved.`, 'SUCCESS', 'Application', String(id));
    }
    return sendSuccess(res, { application: app }, 'Candidate approved by Head of HR');
  } catch (error) { next(error); }
};

export const rejectCandidate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const app = await recruitmentService.updateApplicationStatus(id, 'REJECTED', req.user!.id, 'Rejected by Head of HR');
    await logAudit('CANDIDATE_REJECTED', req.user!.id, { applicationId: id });
    const fullAppRej = await prisma.application.findUnique({ where: { id }, include: { jobPosting: { include: { requisition: true } } } });
    if (fullAppRej?.jobPosting?.requisition?.requestedBy) {
      await notifyUser(fullAppRej.jobPosting.requisition.requestedBy, 'Candidate Rejected', `Candidate for ${fullAppRej.jobPosting.title} rejected.`, 'ALERT', 'Application', String(id));
    }
    return sendSuccess(res, { application: app }, 'Candidate rejected by Head of HR');
  } catch (error) { next(error); }
};

// ========== Interviews ==========
export const createInterview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const interview = await recruitmentService.createInterview(req.body);
    await logAudit('INTERVIEW_SCHEDULED', req.user!.id, { interviewId: interview.id });
    return sendSuccess(res, { interview }, 'Interview scheduled successfully', undefined, 201);
  } catch (error) { next(error); }
};

export const listInterviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const applicationId = req.query.applicationId ? parseInt(req.query.applicationId as string) : undefined;
    const interviewerId = req.query.interviewerId ? parseInt(req.query.interviewerId as string) : undefined;
    const status = req.query.status as string;

    const { total, interviews } = await recruitmentService.listInterviews(page, limit, {
      applicationId,
      interviewerId,
      status,
    });
    return sendSuccess(res, { interviews }, 'Interviews retrieved successfully', { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

export const getInterview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const interview = await recruitmentService.getInterviewById(id);
    return sendSuccess(res, { interview }, 'Interview retrieved successfully');
  } catch (error) { next(error); }
};

export const updateInterview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const interview = await recruitmentService.updateInterview(id, req.body);
    return sendSuccess(res, { interview }, 'Interview updated');
  } catch (error) { next(error); }
};

export const submitInterviewEvaluation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const evalData = await recruitmentService.submitInterviewEvaluation(id, req.body);
    await logAudit('INTERVIEW_EVALUATED', req.user!.id, { interviewId: id });
    return sendSuccess(res, { evaluation: evalData }, 'Interview evaluation submitted successfully');
  } catch (error) { next(error); }
};
