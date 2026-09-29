import { Router } from 'express';
import { login, refresh, logout, getMe } from '../controllers/authController';
import { validate } from '../middlewares/validate';
import { loginSchema, refreshSchema } from '../validators/authValidators';
import { requireAuth } from '../middlewares/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
});

router.post('/login', loginLimiter, validate(loginSchema), login as any);
router.post('/refresh', validate(refreshSchema), refresh as any);
router.post('/logout', requireAuth, logout as any);
router.get('/me', requireAuth, getMe as any);

export default router;
