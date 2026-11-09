import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { 
  getCycles,
  createCycle, 
  getGoals,
  createGoal, 
  getKPIs,
  createKPI,
  assignKPI, 
  getReviews,
  getReviewById,
  createReview, 
  evaluateReview, 
  approveReview, 
  finalizeReview 
} from '../controllers/performanceController';

const router = Router();
router.use(requireAuth);

// Cycles
router.get('/cycles', requirePermission(['PERFORMANCE_READ', 'PERFORMANCE_CREATE', 'PERFORMANCE_UPDATE', 'PERFORMANCE_APPROVE']), getCycles);
router.post('/cycles', requirePermission(['PERFORMANCE_CREATE']), createCycle);

// Goals & KPIs
router.get('/goals', requirePermission(['PERFORMANCE_READ', 'PERFORMANCE_CREATE', 'PERFORMANCE_UPDATE', 'PERFORMANCE_APPROVE']), getGoals);
router.post('/goals', requirePermission(['PERFORMANCE_CREATE']), createGoal);
router.get('/kpis', requirePermission(['PERFORMANCE_READ', 'PERFORMANCE_CREATE', 'PERFORMANCE_UPDATE', 'PERFORMANCE_APPROVE']), getKPIs);
router.post('/kpis', requirePermission(['PERFORMANCE_CREATE']), createKPI);
router.post('/goals/:goalId/kpi', requirePermission(['PERFORMANCE_CREATE']), assignKPI);

// Reviews
router.get('/reviews', requirePermission(['PERFORMANCE_READ', 'PERFORMANCE_CREATE', 'PERFORMANCE_UPDATE', 'PERFORMANCE_APPROVE']), getReviews);
router.get('/reviews/:id', requirePermission(['PERFORMANCE_READ', 'PERFORMANCE_CREATE', 'PERFORMANCE_UPDATE', 'PERFORMANCE_APPROVE']), getReviewById);
router.post('/reviews', requirePermission(['PERFORMANCE_CREATE']), createReview);
router.post('/reviews/:id/evaluate', requirePermission(['PERFORMANCE_UPDATE']), evaluateReview);
router.post('/reviews/:id/approve', requirePermission(['PERFORMANCE_UPDATE']), approveReview);
router.post('/reviews/:id/finalize', requirePermission(['PERFORMANCE_APPROVE']), finalizeReview);

export default router;
