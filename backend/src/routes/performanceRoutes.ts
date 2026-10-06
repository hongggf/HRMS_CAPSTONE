import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { 
  createCycle, 
  createGoal, 
  assignKPI, 
  createReview, 
  evaluateReview, 
  approveReview, 
  finalizeReview 
} from '../controllers/performanceController';

const router = Router();
router.use(requireAuth);

router.post('/cycles', requirePermission(['PERFORMANCE_CREATE']), createCycle);
router.post('/goals', requirePermission(['PERFORMANCE_CREATE']), createGoal);
router.post('/goals/:goalId/kpi', requirePermission(['PERFORMANCE_CREATE']), assignKPI);

router.post('/reviews', requirePermission(['PERFORMANCE_CREATE']), createReview);
router.post('/reviews/:id/evaluate', requirePermission(['PERFORMANCE_UPDATE']), evaluateReview);
router.post('/reviews/:id/approve', requirePermission(['PERFORMANCE_UPDATE']), approveReview);
router.post('/reviews/:id/finalize', requirePermission(['PERFORMANCE_APPROVE']), finalizeReview);

export default router;
