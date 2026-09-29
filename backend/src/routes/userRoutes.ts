import { Router } from 'express';
import { createUser, listUsers, activateUser, deactivateUser, assignRole } from '../controllers/userController';
import { validate } from '../middlewares/validate';
import { createUserSchema, assignRoleSchema } from '../validators/userValidators';
import { requireAuth, requireRole, requirePermission } from '../middlewares/auth';

const router = Router();

// Only HEAD_OF_HR or anyone with USER_CREATE can create users
router.post('/', requireAuth, requirePermission(['USER_CREATE']), validate(createUserSchema), createUser as any);
router.get('/', requireAuth, requirePermission(['USER_READ']), listUsers as any);
router.post('/:id/activate', requireAuth, requireRole(['HEAD_OF_HR']), activateUser as any);
router.post('/:id/deactivate', requireAuth, requireRole(['HEAD_OF_HR']), deactivateUser as any);
router.post('/:id/role', requireAuth, requirePermission(['USER_ROLE_ASSIGN']), validate(assignRoleSchema), assignRole as any);

export default router;
