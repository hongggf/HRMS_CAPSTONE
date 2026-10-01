import { Router } from 'express';
import { createPosition, getPosition, listPositions, updatePosition, deletePosition } from '../controllers/positionController';
import { validate } from '../middlewares/validate';
import { createPositionSchema, updatePositionSchema, positionIdParamSchema, listPositionsSchema } from '../validators/positionValidators';
import { requireAuth, requireRole, requirePermission } from '../middlewares/auth';

const router = Router();

router.post('/', requireAuth, requirePermission(['POSITION_CREATE']), validate(createPositionSchema), createPosition as any);
router.get('/', requireAuth, requirePermission(['POSITION_READ']), validate(listPositionsSchema), listPositions as any);
router.get('/:id', requireAuth, requirePermission(['POSITION_READ']), validate(positionIdParamSchema), getPosition as any);
router.put('/:id', requireAuth, requirePermission(['POSITION_UPDATE']), validate(updatePositionSchema), updatePosition as any);
router.delete('/:id', requireAuth, requireRole(['HEAD_OF_HR']), validate(positionIdParamSchema), deletePosition as any);

export default router;
