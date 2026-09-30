import { Router } from 'express';
import { login, refresh, logout, getMe, changePassword } from '../controllers/authController';
import { validate } from '../middlewares/validate';
import { loginSchema, refreshSchema, changePasswordSchema } from '../validators/authValidators';
import { requireAuth } from '../middlewares/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
});

const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Too many password change attempts, please try again later' },
});

router.post('/login', loginLimiter, validate(loginSchema), login as any);
router.post('/refresh', validate(refreshSchema), refresh as any);
router.post('/logout', requireAuth, logout as any);
router.get('/me', requireAuth, getMe as any);
router.post('/change-password', requireAuth, changePasswordLimiter, validate(changePasswordSchema), changePassword as any);

export default router;
