import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const passwordErrorMessage = 'Password must be at least 8 characters, and include uppercase, lowercase, number, and special character.';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().regex(passwordRegex, passwordErrorMessage),
    roleId: z.number().int().positive().optional(),
    roleIds: z.array(z.number().int().positive()).optional(),
  }),
});

export const assignRoleSchema = z.object({
  body: z
    .object({
      roleId: z.number().int().positive().optional(),
      roleIds: z.array(z.number().int().positive()).optional(),
    })
    .refine((data) => data.roleId !== undefined || (data.roleIds !== undefined && data.roleIds.length > 0), {
      message: 'roleId or roleIds is required',
    }),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  })
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be an integer').transform(Number),
  })
});
