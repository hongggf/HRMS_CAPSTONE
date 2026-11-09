import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { 
  getPromotions,
  requestPromotion, 
  approvePromotion, 
  rejectPromotion, 
  getPips,
  getPipById,
  createPip, 
  addPipItem, 
  updatePipProgress 
} from '../controllers/promotionController';

const router = Router();
router.use(requireAuth);

// Promotion Requests
router.get('/requests', requirePermission(['PROMOTION_READ', 'PROMOTION_CREATE', 'PROMOTION_APPROVE']), getPromotions);
router.post('/requests', requirePermission(['PROMOTION_CREATE']), requestPromotion);
router.post('/requests/:id/approve', requirePermission(['PROMOTION_APPROVE']), approvePromotion);
router.post('/requests/:id/reject', requirePermission(['PROMOTION_APPROVE']), rejectPromotion);

// Performance Improvement Plans (PIPs)
router.get('/pips', requirePermission(['PIP_CREATE', 'PIP_UPDATE']), getPips);
router.get('/pips/:id', requirePermission(['PIP_CREATE', 'PIP_UPDATE']), getPipById);
router.post('/pips', requirePermission(['PIP_CREATE']), createPip);
router.post('/pips/:pipId/items', requirePermission(['PIP_UPDATE']), addPipItem);
router.put('/pips/items/:itemId/progress', requirePermission(['PIP_UPDATE']), updatePipProgress);

export default router;
