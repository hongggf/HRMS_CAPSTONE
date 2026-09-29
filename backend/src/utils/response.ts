import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  data: any = null,
  message: string = 'Success',
  meta: any = null,
  statusCode: number = 200
) => {
  const response: any = { success: true, message };
  if (data) response.data = data;
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  details: any = null
) => {
  const response: any = {
    success: false,
    error: { message },
  };
  if (details) response.error.details = details;
  return res.status(statusCode).json(response);
};
