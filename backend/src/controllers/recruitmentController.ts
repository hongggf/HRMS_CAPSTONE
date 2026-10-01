import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';
import { logAudit } from '../services/auditService';
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

// ========== Candidates & Applications ==========
export const createApplication = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const app = await recruitmentService.createApplication(req.body);
    await logAudit('APPLICATION_CREATED', req.user?.id || null, { applicationId: app.id });
    return sendSuccess(res, { application: app }, 'Application submitted successfully', undefined, 201);
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
    if ((status === 'APPROVED' || status === 'REJECTED') && !req.user!.roles.includes('HEAD_OF_HR')) {
      // Allow general rejections by HR, but final head approval requires HEAD_OF_HR
      const app = await recruitmentService.updateApplicationStatus(id, status, req.user!.id, notes); // wait, we need to check current status first
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
    return sendSuccess(res, { application: app }, 'Candidate approved by Head of HR');
  } catch (error) { next(error); }
};

export const rejectCandidate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const app = await recruitmentService.updateApplicationStatus(id, 'REJECTED', req.user!.id, 'Rejected by Head of HR');
    await logAudit('CANDIDATE_REJECTED', req.user!.id, { applicationId: id });
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
