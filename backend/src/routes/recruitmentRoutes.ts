import { Router } from 'express';
import { requireAuth, requireRole, requirePermission } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as rc from '../controllers/recruitmentController';
import * as rv from '../validators/recruitmentValidators';

const router = Router();

// Requisitions
router.post('/requisitions', requireAuth, requirePermission(['RECRUITMENT_CREATE']), validate(rv.createRequisitionSchema), rc.createRequisition as any);
router.get('/requisitions', requireAuth, requirePermission(['RECRUITMENT_READ']), validate(rv.listRequisitionsSchema), rc.listRequisitions as any);
router.put('/requisitions/:id/status', requireAuth, requirePermission(['RECRUITMENT_CREATE']), validate(rv.updateRequisitionStatusSchema), rc.updateRequisitionStatus as any);

// Job Postings
router.post('/postings', requireAuth, requirePermission(['RECRUITMENT_CREATE']), validate(rv.createJobPostingSchema), rc.createJobPosting as any);
router.get('/postings', requireAuth, validate(rv.listJobPostingsSchema), rc.listJobPostings as any); // Publicly viewable potentially
router.put('/postings/:id', requireAuth, requirePermission(['RECRUITMENT_UPDATE']), validate(rv.updateJobPostingSchema), rc.updateJobPosting as any);

// Applications
router.post('/applications', requireAuth, validate(rv.createApplicationSchema), rc.createApplication as any);
router.put('/applications/:id/status', requireAuth, requirePermission(['RECRUITMENT_CREATE']), validate(rv.updateApplicationStatusSchema), rc.updateApplicationStatus as any);
router.post('/applications/:id/approve', requireAuth, requireRole(['HEAD_OF_HR']), validate(rv.idParamSchema), rc.approveCandidate as any);
router.post('/applications/:id/reject', requireAuth, requireRole(['HEAD_OF_HR']), validate(rv.idParamSchema), rc.rejectCandidate as any);

// Interviews
router.post('/interviews', requireAuth, requirePermission(['RECRUITMENT_CREATE']), validate(rv.createInterviewSchema), rc.createInterview as any);
router.put('/interviews/:id', requireAuth, requirePermission(['RECRUITMENT_UPDATE']), validate(rv.updateInterviewSchema), rc.updateInterview as any);
router.post('/interviews/:id/evaluate', requireAuth, validate(rv.submitInterviewEvaluationSchema), rc.submitInterviewEvaluation as any);

export default router;
