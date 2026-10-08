import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  updatePreferences
} from '../controllers/notificationController';

const router = Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.get('/unread', getUnreadCount);
router.post('/mark-all-read', markAllAsRead);
router.post('/:id/read', markAsRead);
router.post('/preferences', updatePreferences);

export default router;
