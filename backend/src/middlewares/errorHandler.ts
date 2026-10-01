import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';
import { AppError } from '../utils/AppError';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) {
    return _next(err);
  }
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('CRITICAL ERROR:', err);
    } else {
      logger.warn(`Operational Error: ${err.message}`);
    }
    return sendError(res, err.message, err.statusCode);
  }

  // Hide internal server errors from user
  logger.error('Unhandled Error:', err.stack || err);
  return sendError(res, 'Internal Server Error', 500);
};
