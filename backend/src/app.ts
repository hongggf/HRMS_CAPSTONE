import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import healthRouter from './routes/health';
import authRouter from './routes/authRoutes';
import userRouter from './routes/userRoutes';
import roleRouter from './routes/roleRoutes';
import departmentRouter from './routes/departmentRoutes';
import positionRouter from './routes/positionRoutes';
import workforceRouter from './routes/workforceRoutes';
import recruitmentRouter from './routes/recruitmentRoutes';
import employeeRouter from './routes/employeeRoutes';
import attendanceRouter from './routes/attendanceRoutes';
import payrollRouter from './routes/payrollRoutes';
import performanceRouter from './routes/performanceRoutes';
import promotionRouter from './routes/promotionRoutes';
import lndRouter from './routes/lndRoutes';
import notificationRouter from './routes/notificationRoutes';
import auditRouter from './routes/auditRoutes';
import reportRouter from './routes/reportRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { sendError } from './utils/response';
import { env } from './config/env';

const app: Application = express();

// Trust first proxy (needed for rate limiter behind reverse proxy)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: env.CORS_ORIGIN,
}));

// Request body size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
app.use(morgan('combined'));

// Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/roles', roleRouter);
app.use('/api/v1/departments', departmentRouter);
app.use('/api/v1/positions', positionRouter);
app.use('/api/v1/workforce-requests', workforceRouter);
app.use('/api/v1/recruitment', recruitmentRouter);
app.use('/api/v1/employees', employeeRouter);
app.use('/api/v1', attendanceRouter);
app.use('/api/v1/payroll', payrollRouter);
app.use('/api/v1/performance', performanceRouter);
app.use('/api/v1/promotions', promotionRouter);
app.use('/api/v1/lnd', lndRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/audit-logs', auditRouter);
app.use('/api/v1/reports', reportRouter);

// Unknown endpoint / 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  return sendError(res, 'Endpoint not found', 404);
});

// Centralized error handling
app.use(errorHandler);

export default app;
