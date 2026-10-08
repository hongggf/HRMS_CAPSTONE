import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { getAuditLogs } from '../controllers/auditController';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission(['USER_READ', 'WORKFORCE_READ']), getAuditLogs); // Usually an admin or super admin can read audit logs

export default router;
