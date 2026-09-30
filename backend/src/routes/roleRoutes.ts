import { Router } from 'express';
import { listRoles } from '../controllers/roleController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.get('/', requireAuth, listRoles as any);

export default router;
