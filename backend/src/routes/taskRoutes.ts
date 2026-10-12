import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  listTasksQuerySchema,
  taskParamsSchema,
  rejectTaskSchema,
} from '../validators/taskValidators';
import {
  getTasks,
  createTask,
  submitTask,
  approveTask,
  rejectTask,
  deleteTask,
  followUpTask,
} from '../controllers/taskController';

const router = Router();

// All task routes require authentication
router.use(requireAuth);

// List tasks (RBAC-aware: HEAD_OF_HR sees all; other HR roles see their own tasks)
router.get('/', validate(listTasksQuerySchema), getTasks as any);

// Create task across any HR module
router.post('/', createTask as any);

// Submit draft task for Head of HR approval
router.post('/:type/:id/submit', validate(taskParamsSchema), submitTask as any);

// Approve task - Strictly restricted to HEAD_OF_HR
router.post('/:type/:id/approve', requireRole(['HEAD_OF_HR']), validate(taskParamsSchema), approveTask as any);

// Reject task with reason - Strictly restricted to HEAD_OF_HR
router.post(
  '/:type/:id/reject',
  requireRole(['HEAD_OF_HR']),
  validate(rejectTaskSchema),
  rejectTask as any,
);

// Delete draft task (HEAD_OF_HR can delete any draft; other roles can delete their own draft)
router.delete('/:type/:id', validate(taskParamsSchema), deleteTask as any);

// Follow-up on pending task (Alerts Head of HR with urgent in-app notification & WebSocket broadcast)
router.post('/:type/:id/follow-up', validate(taskParamsSchema), followUpTask as any);

export default router;
