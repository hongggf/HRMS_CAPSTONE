import { Router } from 'express';
import { login, refresh, logout, getMe, changePassword } from '../controllers/authController';
import { validate } from '../middlewares/validate';
import { loginSchema, refreshSchema, changePasswordSchema } from '../validators/authValidators';
import { requireAuth } from '../middlewares/auth';
import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    return sendError(res, 'Too many login attempts from this IP, please try again after 15 minutes', 429);
  }
});

const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  handler: (req, res) => {
    return sendError(res, 'Too many password change attempts, please try again later', 429);
  }
});

router.post('/login', loginLimiter, validate(loginSchema), login as any);
router.post('/refresh', validate(refreshSchema), refresh as any);
router.post('/logout', requireAuth, logout as any);
router.get('/me', requireAuth, getMe as any);
router.post('/change-password', requireAuth, changePasswordLimiter, validate(changePasswordSchema), changePassword as any);

export default router;
