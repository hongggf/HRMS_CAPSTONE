import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    roleId: z.number().int().positive().optional(),
  }),
});

export const assignRoleSchema = z.object({
  body: z.object({
    roleId: z.number().int().positive(),
  }),
});
