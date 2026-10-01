import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body: any; query: any; params: any };
      req.body = validData.body;
      req.query = validData.query;
      req.params = validData.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Map Zod errors to a frontend-friendly object: { "field_name": "Error message" }
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path[issue.path.length - 1],
          message: issue.message,
        }));
        return sendError(res, 'Validation failed', 400, formattedErrors);
      }
      next(error);
    }
  };
};
