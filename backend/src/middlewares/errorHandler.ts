import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.stack);
  return sendError(res, 'Internal Server Error', 500);
};
