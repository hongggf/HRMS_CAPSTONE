import { Router } from 'express';
import { createUser, listUsers, activateUser, deactivateUser, assignRole } from '../controllers/userController';
import { validate } from '../middlewares/validate';
import { createUserSchema, assignRoleSchema, listUsersSchema, userIdParamSchema } from '../validators/userValidators';
import { requireAuth, requireRole, requirePermission } from '../middlewares/auth';

const router = Router();

router.post('/', requireAuth, requirePermission(['USER_CREATE']), validate(createUserSchema), createUser as any);
router.get('/', requireAuth, requirePermission(['USER_READ']), validate(listUsersSchema), listUsers as any);
router.post('/:id/activate', requireAuth, requireRole(['HEAD_OF_HR']), validate(userIdParamSchema), activateUser as any);
router.post('/:id/deactivate', requireAuth, requireRole(['HEAD_OF_HR']), validate(userIdParamSchema), deactivateUser as any);
router.post('/:id/role', requireAuth, requirePermission(['USER_ROLE_ASSIGN']), validate(assignRoleSchema), assignRole as any);

export default router;
