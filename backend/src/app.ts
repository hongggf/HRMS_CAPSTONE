import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import healthRouter from './routes/health';
import authRouter from './routes/authRoutes';
import userRouter from './routes/userRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { sendError } from './utils/response';

const app: Application = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
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

// Unknown endpoint / 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  return sendError(res, 'Endpoint not found', 404);
});

// Centralized error handling
app.use(errorHandler);

export default app;
