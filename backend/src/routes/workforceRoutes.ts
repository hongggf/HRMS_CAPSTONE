import { Router } from 'express';
import {
  createWorkforceRequest,
  getWorkforceRequest,
  listWorkforceRequests,
  updateWorkforceRequest,
  deleteWorkforceRequest,
  submitWorkforceRequest,
  approveWorkforceRequest,
  rejectWorkforceRequest,
  cancelWorkforceRequest,
} from '../controllers/workforceController';
import { validate } from '../middlewares/validate';
import {
  createWorkforceRequestSchema,
  updateWorkforceRequestSchema,
  workforceRequestIdParamSchema,
  submitWorkforceRequestSchema,
  approveWorkforceRequestSchema,
  rejectWorkforceRequestSchema,
  cancelWorkforceRequestSchema,
  listWorkforceRequestsSchema,
} from '../validators/workforceValidators';
import { requireAuth, requireRole, requirePermission } from '../middlewares/auth';

const router = Router();

// CRUD
router.post('/', requireAuth, requirePermission(['WORKFORCE_CREATE']), validate(createWorkforceRequestSchema), createWorkforceRequest as any);
router.get('/', requireAuth, requirePermission(['WORKFORCE_READ']), validate(listWorkforceRequestsSchema), listWorkforceRequests as any);
router.get('/:id', requireAuth, requirePermission(['WORKFORCE_READ']), validate(workforceRequestIdParamSchema), getWorkforceRequest as any);
router.put('/:id', requireAuth, requirePermission(['WORKFORCE_CREATE']), validate(updateWorkforceRequestSchema), updateWorkforceRequest as any);
router.delete('/:id', requireAuth, requirePermission(['WORKFORCE_CREATE']), validate(workforceRequestIdParamSchema), deleteWorkforceRequest as any);

// Workflow
router.post('/:id/submit', requireAuth, requirePermission(['WORKFORCE_CREATE']), validate(submitWorkforceRequestSchema), submitWorkforceRequest as any);
router.post('/:id/approve', requireAuth, requireRole(['HEAD_OF_HR']), validate(approveWorkforceRequestSchema), approveWorkforceRequest as any);
router.post('/:id/reject', requireAuth, requireRole(['HEAD_OF_HR']), validate(rejectWorkforceRequestSchema), rejectWorkforceRequest as any);
router.post('/:id/cancel', requireAuth, requirePermission(['WORKFORCE_CREATE']), validate(cancelWorkforceRequestSchema), cancelWorkforceRequest as any);

export default router;
