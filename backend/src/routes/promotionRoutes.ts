import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { 
  requestPromotion, 
  approvePromotion, 
  rejectPromotion, 
  createPip, 
  addPipItem, 
  updatePipProgress 
} from '../controllers/promotionController';

const router = Router();
router.use(requireAuth);

router.post('/requests', requirePermission(['PROMOTION_CREATE']), requestPromotion);
router.post('/requests/:id/approve', requirePermission(['PROMOTION_APPROVE']), approvePromotion);
router.post('/requests/:id/reject', requirePermission(['PROMOTION_APPROVE']), rejectPromotion);

router.post('/pips', requirePermission(['PIP_CREATE']), createPip);
router.post('/pips/:pipId/items', requirePermission(['PIP_UPDATE']), addPipItem);
router.put('/pips/items/:itemId/progress', requirePermission(['PIP_UPDATE']), updatePipProgress);

export default router;
