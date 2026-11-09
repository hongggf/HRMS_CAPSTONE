import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { getAuditLogs } from '../controllers/auditController';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission(['USER_READ', 'WORKFORCE_READ', 'ATTENDANCE_UPDATE']), getAuditLogs);

export default router;
