import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const passwordErrorMessage = 'Password must be at least 8 characters, and include uppercase, lowercase, number, and special character.';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().regex(passwordRegex, passwordErrorMessage),
    roleId: z.number().int().positive().optional(),
  }),
});

export const assignRoleSchema = z.object({
  body: z.object({
    roleId: z.number().int().positive(),
  }),
});
